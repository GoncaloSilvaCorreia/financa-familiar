const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const autenticar = require('../middleware/autenticar');

const router = express.Router();

router.use(autenticar);

// ─── Listar metas ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT *,
        ROUND((valor_atual / valor_meta) * 100, 1) AS percentagem
      FROM metas_poupanca
      WHERE utilizador_id = $1
      ORDER BY concluida ASC, data_alvo ASC
    `, [req.utilizador.id]);

    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar poupanças:', err);
    res.status(500).json({ erro: 'Erro ao listar poupanças.' });
  }
});

// ─── Criar meta ───────────────────────────────────────────────────────────────
router.post('/',
  [
    body('nome').trim().notEmpty().withMessage('Nome obrigatório'),
    body('valor_meta').isFloat({ min: 0.01 }).withMessage('Valor meta inválido'),
  ],
  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erro: erros.array()[0].msg, campo: erros.array()[0].path });
    }

    const { nome, descricao, valor_meta, valor_atual, data_alvo, icone, cor, notas } = req.body;

    const meta = parseFloat(valor_meta);
    const atual = parseFloat(valor_atual || 0);

    // ── Validação: valor atual não pode exceder o valor da meta ──────────────
    if (atual > meta) {
      return res.status(400).json({
        erro: 'O valor atual não pode ser superior ao valor objetivo.',
        campo: 'valor_atual'
      });
    }

    // ── Validação: data objetivo não pode estar no passado ───────────────────
    if (data_alvo) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataAlvoDate = new Date(data_alvo);
      if (dataAlvoDate < hoje) {
        return res.status(400).json({
          erro: 'A data objetivo não pode estar no passado.',
          campo: 'data_alvo'
        });
      }
    }

    try {
      // ── Validação: não permitir nomes duplicados (mesmo utilizador) ────────
      const { rows: existentes } = await db.query(
        'SELECT id FROM metas_poupanca WHERE utilizador_id = $1 AND LOWER(nome) = LOWER($2)',
        [req.utilizador.id, nome]
      );
      if (existentes.length > 0) {
        return res.status(409).json({
          erro: 'Já existe uma meta de poupança com esse nome.',
          campo: 'nome'
        });
      }

      const concluida = atual >= meta;

      const { rows: [novaMeta] } = await db.query(`
        INSERT INTO metas_poupanca
          (utilizador_id, nome, descricao, valor_meta, valor_atual, data_alvo, icone, cor, notas, concluida)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *, ROUND((valor_atual / valor_meta) * 100, 1) AS percentagem
      `, [
        req.utilizador.id, nome, descricao || null,
        meta, atual,
        data_alvo || null, icone || '🎯', cor || '#1D9E75',
        notas || null, concluida
      ]);

      res.status(201).json(novaMeta);
    } catch (err) {
      console.error('Erro ao criar meta:', err);
      res.status(500).json({ erro: 'Erro ao criar meta. Tenta novamente.' });
    }
  }
);

// ─── Depositar / levantar valor ───────────────────────────────────────────────
router.patch('/:id/depositar',
  [body('valor').isFloat().withMessage('Valor inválido')],
  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erro: erros.array()[0].msg });
    }

    const { valor } = req.body;

    try {
      const { rows } = await db.query(
        'SELECT * FROM metas_poupanca WHERE id = $1 AND utilizador_id = $2',
        [req.params.id, req.utilizador.id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ erro: 'Meta não encontrada.' });
      }

      const meta = rows[0];
      const novoValor = Math.max(0, parseFloat(meta.valor_atual) + parseFloat(valor));
      const concluida = novoValor >= parseFloat(meta.valor_meta);

      const { rows: [atualizada] } = await db.query(`
        UPDATE metas_poupanca SET
          valor_atual = $1,
          concluida = $2,
          atualizado_em = NOW()
        WHERE id = $3 AND utilizador_id = $4
        RETURNING *, ROUND((valor_atual / valor_meta) * 100, 1) AS percentagem
      `, [novoValor, concluida, req.params.id, req.utilizador.id]);

      res.json(atualizada);
    } catch (err) {
      console.error('Erro ao depositar:', err);
      res.status(500).json({ erro: 'Erro ao atualizar poupança.' });
    }
  }
);

// ─── Atualizar meta ───────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { nome, descricao, valor_meta, valor_atual, data_alvo, icone, cor, notas } = req.body;

  try {
    const { rows: atualRows } = await db.query(
      'SELECT * FROM metas_poupanca WHERE id = $1 AND utilizador_id = $2',
      [req.params.id, req.utilizador.id]
    );
    if (atualRows.length === 0) {
      return res.status(404).json({ erro: 'Meta não encontrada.' });
    }
    const metaAtual = atualRows[0];

    const novoMeta  = valor_meta !== undefined && valor_meta !== '' ? parseFloat(valor_meta) : parseFloat(metaAtual.valor_meta);
    const novoAtual = valor_atual !== undefined && valor_atual !== '' ? parseFloat(valor_atual) : parseFloat(metaAtual.valor_atual);

    // ── Validação: valor atual não pode exceder o valor da meta ──────────────
    if (novoAtual > novoMeta) {
      return res.status(400).json({
        erro: 'O valor atual não pode ser superior ao valor objetivo.',
        campo: 'valor_atual'
      });
    }

    // ── Validação: data objetivo não pode estar no passado ───────────────────
    const novaData = data_alvo !== undefined ? data_alvo : metaAtual.data_alvo;
    if (novaData) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      if (new Date(novaData) < hoje) {
        return res.status(400).json({
          erro: 'A data objetivo não pode estar no passado.',
          campo: 'data_alvo'
        });
      }
    }

    // ── Validação: nome duplicado (exceto a própria meta) ─────────────────────
    if (nome && nome.trim()) {
      const { rows: existentes } = await db.query(
        'SELECT id FROM metas_poupanca WHERE utilizador_id = $1 AND LOWER(nome) = LOWER($2) AND id != $3',
        [req.utilizador.id, nome, req.params.id]
      );
      if (existentes.length > 0) {
        return res.status(409).json({
          erro: 'Já existe uma meta de poupança com esse nome.',
          campo: 'nome'
        });
      }
    }

    const concluida = novoAtual >= novoMeta;

    const { rows: [atualizada] } = await db.query(`
      UPDATE metas_poupanca SET
        nome = COALESCE($1, nome),
        descricao = COALESCE($2, descricao),
        valor_meta = $3,
        valor_atual = $4,
        data_alvo = $5,
        icone = COALESCE($6, icone),
        cor = COALESCE($7, cor),
        notas = $8,
        concluida = $9,
        atualizado_em = NOW()
      WHERE id = $10 AND utilizador_id = $11
      RETURNING *, ROUND((valor_atual / valor_meta) * 100, 1) AS percentagem
    `, [nome, descricao, novoMeta, novoAtual, data_alvo || null, icone, cor, notas || null, concluida, req.params.id, req.utilizador.id]);

    res.json(atualizada);
  } catch (err) {
    console.error('Erro ao atualizar meta:', err);
    res.status(500).json({ erro: 'Erro ao atualizar meta.' });
  }
});

// ─── Apagar meta ──────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM metas_poupanca WHERE id = $1 AND utilizador_id = $2 RETURNING id',
      [req.params.id, req.utilizador.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Meta não encontrada.' });
    }

    res.json({ mensagem: 'Meta apagada com sucesso.' });
  } catch (err) {
    console.error('Erro ao apagar meta:', err);
    res.status(500).json({ erro: 'Erro ao apagar meta.' });
  }
});

module.exports = router;