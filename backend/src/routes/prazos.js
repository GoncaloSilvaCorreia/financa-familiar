const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const autenticar = require('../middleware/autenticar');

const router = express.Router();

router.use(autenticar);

// ─── Listar prazos ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { pago, tipo, dias } = req.query;

  try {
    let filtros = ['p.utilizador_id = $1'];
    let params = [req.utilizador.id];
    let i = 2;

    if (pago !== undefined) {
      filtros.push(`p.pago = $${i++}`);
      params.push(pago === 'true');
    }
    if (tipo) {
      filtros.push(`p.tipo = $${i++}`);
      params.push(tipo);
    }
    // Filtrar por próximos N dias
    if (dias) {
      filtros.push(`p.data_vencimento <= CURRENT_DATE + INTERVAL '${parseInt(dias)} days'`);
      filtros.push(`p.data_vencimento >= CURRENT_DATE`);
    }

    const where = filtros.join(' AND ');

    const { rows } = await db.query(`
      SELECT
        p.*,
        v.nome AS veiculo_nome, v.matricula
      FROM prazos p
      LEFT JOIN veiculos v ON p.veiculo_id = v.id
      WHERE ${where}
      ORDER BY p.data_vencimento ASC
    `, params);

    // Adiciona campo "dias_restantes" a cada prazo
    const hoje = new Date();
    const prazosComDias = rows.map(p => {
      const vencimento = new Date(p.data_vencimento);
      const diasRestantes = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
      let urgencia = 'ok';
      if (diasRestantes < 0) urgencia = 'vencido';
      else if (diasRestantes <= 7) urgencia = 'critico';
      else if (diasRestantes <= 30) urgencia = 'aviso';
      return { ...p, dias_restantes: diasRestantes, urgencia };
    });

    res.json(prazosComDias);

  } catch (err) {
    console.error('Erro ao listar prazos:', err);
    res.status(500).json({ erro: 'Erro ao listar prazos.' });
  }
});

// ─── Criar prazo ──────────────────────────────────────────────────────────────
router.post('/',
  [
    body('nome').trim().notEmpty().withMessage('Nome obrigatório'),
    body('data_vencimento').isDate().withMessage('Data inválida'),
    body('tipo').optional().isIn(['irs', 'iuc', 'imi', 'seguro', 'inspecao', 'fatura', 'outro']),
    body('valor_estimado').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erros: erros.array() });
    }

    const {
      nome, descricao, tipo, data_vencimento, valor_estimado,
      recorrente, recorrencia_meses, veiculo_id, notas
    } = req.body;

    try {
      const { rows: [prazo] } = await db.query(`
        INSERT INTO prazos
          (utilizador_id, nome, descricao, tipo, data_vencimento, valor_estimado, recorrente, recorrencia_meses, veiculo_id, notas)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        req.utilizador.id, nome, descricao || null, tipo || 'outro',
        data_vencimento, valor_estimado || null,
        recorrente || false, recorrencia_meses || null,
        veiculo_id || null, notas || null
      ]);

      res.status(201).json(prazo);

    } catch (err) {
      console.error('Erro ao criar prazo:', err);
      res.status(500).json({ erro: 'Erro ao criar prazo.' });
    }
  }
);

// ─── Marcar como pago ─────────────────────────────────────────────────────────
router.patch('/:id/pagar', async (req, res) => {
  const { data_pagamento } = req.body;

  try {
    const { rows } = await db.query(
      'SELECT * FROM prazos WHERE id = $1 AND utilizador_id = $2',
      [req.params.id, req.utilizador.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Prazo não encontrado.' });
    }

    const prazo = rows[0];

    // Marca como pago
    const { rows: [atualizado] } = await db.query(`
      UPDATE prazos SET pago = true, data_pagamento = $1, atualizado_em = NOW()
      WHERE id = $2 AND utilizador_id = $3
      RETURNING *
    `, [data_pagamento || new Date().toISOString().split('T')[0], req.params.id, req.utilizador.id]);

    // Se for recorrente, cria automaticamente o próximo prazo
    if (prazo.recorrente && prazo.recorrencia_meses) {
      const proximaData = new Date(prazo.data_vencimento);
      proximaData.setMonth(proximaData.getMonth() + prazo.recorrencia_meses);

      await db.query(`
        INSERT INTO prazos
          (utilizador_id, nome, descricao, tipo, data_vencimento, valor_estimado, recorrente, recorrencia_meses, veiculo_id, notas)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        req.utilizador.id, prazo.nome, prazo.descricao, prazo.tipo,
        proximaData.toISOString().split('T')[0], prazo.valor_estimado,
        true, prazo.recorrencia_meses, prazo.veiculo_id, prazo.notas
      ]);
    }

    res.json(atualizado);

  } catch (err) {
    console.error('Erro ao marcar prazo como pago:', err);
    res.status(500).json({ erro: 'Erro ao atualizar prazo.' });
  }
});

// ─── Desfazer pagamento ───────────────────────────────────────────────────────
router.patch('/:id/despagar', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id FROM prazos WHERE id = $1 AND utilizador_id = $2',
      [req.params.id, req.utilizador.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Prazo não encontrado.' });
    }

    const { rows: [atualizado] } = await db.query(`
      UPDATE prazos SET pago = false, data_pagamento = NULL, atualizado_em = NOW()
      WHERE id = $1 AND utilizador_id = $2
      RETURNING *
    `, [req.params.id, req.utilizador.id]);

    res.json(atualizado);
  } catch (err) {
    console.error('Erro ao desfazer pagamento:', err);
    res.status(500).json({ erro: 'Erro ao desfazer pagamento.' });
  }
});

// ─── Atualizar prazo ──────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { nome, descricao, tipo, data_vencimento, valor_estimado, recorrente, recorrencia_meses, notas } = req.body;

  try {
    const { rows: [atualizado] } = await db.query(`
      UPDATE prazos SET
        nome = COALESCE($1, nome),
        descricao = COALESCE($2, descricao),
        tipo = COALESCE($3, tipo),
        data_vencimento = COALESCE($4, data_vencimento),
        valor_estimado = COALESCE($5, valor_estimado),
        recorrente = COALESCE($6, recorrente),
        recorrencia_meses = COALESCE($7, recorrencia_meses),
        notas = COALESCE($8, notas),
        atualizado_em = NOW()
      WHERE id = $9 AND utilizador_id = $10
      RETURNING *
    `, [nome, descricao, tipo, data_vencimento, valor_estimado, recorrente, recorrencia_meses, notas, req.params.id, req.utilizador.id]);

    if (!atualizado) {
      return res.status(404).json({ erro: 'Prazo não encontrado.' });
    }

    res.json(atualizado);

  } catch (err) {
    console.error('Erro ao atualizar prazo:', err);
    res.status(500).json({ erro: 'Erro ao atualizar prazo.' });
  }
});

// ─── Apagar prazo ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM prazos WHERE id = $1 AND utilizador_id = $2 RETURNING id',
      [req.params.id, req.utilizador.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Prazo não encontrado.' });
    }

    res.json({ mensagem: 'Prazo apagado com sucesso.' });

  } catch (err) {
    console.error('Erro ao apagar prazo:', err);
    res.status(500).json({ erro: 'Erro ao apagar prazo.' });
  }
});

module.exports = router;