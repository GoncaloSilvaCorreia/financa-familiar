const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../db');
const autenticar = require('../middleware/autenticar');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(autenticar);

// ─── Listar transações ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { mes, ano, tipo, categoria_id, limite = 50, pagina = 1 } = req.query;
  const offset = (pagina - 1) * limite;

  try {
    let filtros = ['t.utilizador_id = $1'];
    let params = [req.utilizador.id];
    let i = 2;

    if (mes && ano) {
      filtros.push(`EXTRACT(MONTH FROM t.data) = $${i++} AND EXTRACT(YEAR FROM t.data) = $${i++}`);
      params.push(mes, ano);
    }
    if (tipo) {
      filtros.push(`t.tipo = $${i++}`);
      params.push(tipo);
    }
    if (categoria_id) {
      filtros.push(`t.categoria_id = $${i++}`);
      params.push(categoria_id);
    }

    const where = filtros.join(' AND ');

    const { rows } = await db.query(`
      SELECT
        t.id, t.descricao, t.valor, t.tipo, t.data, t.notas, t.recorrente,
        t.criado_em,
        c.id AS categoria_id, c.nome AS categoria_nome, c.icone AS categoria_icone, c.cor AS categoria_cor,
        ct.id AS conta_id, ct.nome AS conta_nome
      FROM transacoes t
      LEFT JOIN categorias c ON t.categoria_id = c.id
      LEFT JOIN contas ct ON t.conta_id = ct.id
      WHERE ${where}
      ORDER BY t.data DESC, t.criado_em DESC
      LIMIT $${i++} OFFSET $${i++}
    `, [...params, limite, offset]);

    // Total para paginação
    const { rows: [{ total }] } = await db.query(`
      SELECT COUNT(*) as total FROM transacoes t WHERE ${where}
    `, params);

    res.json({
      transacoes: rows,
      total: parseInt(total),
      pagina: parseInt(pagina),
      limite: parseInt(limite),
    });

  } catch (err) {
    console.error('Erro ao listar transações:', err);
    res.status(500).json({ erro: 'Erro ao listar transações.' });
  }
});

// ─── Resumo mensal ────────────────────────────────────────────────────────────
router.get('/resumo', async (req, res) => {
  const { mes, ano } = req.query;

  if (!mes || !ano) {
    return res.status(400).json({ erro: 'Mês e ano obrigatórios.' });
  }

  try {
    // Totais por tipo
    const { rows: totais } = await db.query(`
      SELECT tipo, SUM(valor) as total
      FROM transacoes
      WHERE utilizador_id = $1
        AND EXTRACT(MONTH FROM data) = $2
        AND EXTRACT(YEAR FROM data) = $3
      GROUP BY tipo
    `, [req.utilizador.id, mes, ano]);

    // Gastos por categoria
    const { rows: porCategoria } = await db.query(`
      SELECT
        c.id, c.nome, c.icone, c.cor,
        SUM(t.valor) as total
      FROM transacoes t
      LEFT JOIN categorias c ON t.categoria_id = c.id
      WHERE t.utilizador_id = $1
        AND t.tipo = 'gasto'
        AND EXTRACT(MONTH FROM t.data) = $2
        AND EXTRACT(YEAR FROM t.data) = $3
      GROUP BY c.id, c.nome, c.icone, c.cor
      ORDER BY total DESC
    `, [req.utilizador.id, mes, ano]);

    // Evolução dos últimos 6 meses
    const { rows: evolucao } = await db.query(`
      SELECT
        EXTRACT(MONTH FROM data) as mes,
        EXTRACT(YEAR FROM data) as ano,
        tipo,
        SUM(valor) as total
      FROM transacoes
      WHERE utilizador_id = $1
        AND data >= (DATE_TRUNC('month', $2::date) - INTERVAL '5 months')
        AND data <= DATE_TRUNC('month', $2::date) + INTERVAL '1 month - 1 day'
      GROUP BY mes, ano, tipo
      ORDER BY ano, mes
    `, [req.utilizador.id, `${ano}-${mes}-01`]);

    res.json({ totais, porCategoria, evolucao });

  } catch (err) {
    console.error('Erro ao obter resumo:', err);
    res.status(500).json({ erro: 'Erro ao obter resumo.' });
  }
});

// ─── Criar transação ──────────────────────────────────────────────────────────
router.post('/',
  [
    body('descricao').trim().notEmpty().withMessage('Descrição obrigatória'),
    body('valor').isFloat({ min: 0.01 }).withMessage('Valor inválido'),
    body('tipo').isIn(['gasto', 'receita', 'transferencia']).withMessage('Tipo inválido'),
    body('data').isDate().withMessage('Data inválida'),
  ],
  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erros: erros.array() });
    }

    const { descricao, valor, tipo, data, categoria_id, conta_id, notas, recorrente } = req.body;

    try {
      const { rows: [transacao] } = await db.query(`
        INSERT INTO transacoes (utilizador_id, conta_id, categoria_id, descricao, valor, tipo, data, notas, recorrente)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [req.utilizador.id, conta_id || null, categoria_id || null, descricao, valor, tipo, data, notas || null, recorrente || false]);

      res.status(201).json(transacao);

    } catch (err) {
      console.error('Erro ao criar transação:', err);
      res.status(500).json({ erro: 'Erro ao criar transação.' });
    }
  }
);

// ─── Atualizar transação ──────────────────────────────────────────────────────
router.put('/:id',
  [
    body('descricao').optional().trim().notEmpty(),
    body('valor').optional().isFloat({ min: 0.01 }),
    body('tipo').optional().isIn(['gasto', 'receita', 'transferencia']),
    body('data').optional().isDate(),
  ],
  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erros: erros.array() });
    }

    const { id } = req.params;
    const { descricao, valor, tipo, data, categoria_id, conta_id, notas, recorrente } = req.body;

    try {
      // Verifica se a transação pertence ao utilizador
      const { rows } = await db.query(
        'SELECT id FROM transacoes WHERE id = $1 AND utilizador_id = $2',
        [id, req.utilizador.id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ erro: 'Transação não encontrada.' });
      }

      const { rows: [atualizada] } = await db.query(`
        UPDATE transacoes SET
          descricao = COALESCE($1, descricao),
          valor = COALESCE($2, valor),
          tipo = COALESCE($3, tipo),
          data = COALESCE($4, data),
          categoria_id = COALESCE($5, categoria_id),
          conta_id = COALESCE($6, conta_id),
          notas = COALESCE($7, notas),
          recorrente = COALESCE($8, recorrente),
          atualizado_em = NOW()
        WHERE id = $9 AND utilizador_id = $10
        RETURNING *
      `, [descricao, valor, tipo, data, categoria_id, conta_id, notas, recorrente, id, req.utilizador.id]);

      res.json(atualizada);

    } catch (err) {
      console.error('Erro ao atualizar transação:', err);
      res.status(500).json({ erro: 'Erro ao atualizar transação.' });
    }
  }
);

// ─── Apagar transação ─────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM transacoes WHERE id = $1 AND utilizador_id = $2 RETURNING id',
      [req.params.id, req.utilizador.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Transação não encontrada.' });
    }

    res.json({ mensagem: 'Transação apagada com sucesso.' });

  } catch (err) {
    console.error('Erro ao apagar transação:', err);
    res.status(500).json({ erro: 'Erro ao apagar transação.' });
  }
});

module.exports = router;