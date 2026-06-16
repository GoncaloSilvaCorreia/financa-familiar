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
      return res.status(400).json({ erros: erros.array() });
    }

    const { nome, descricao, valor_meta, valor_atual, data_alvo, icone, cor, notas } = req.body;

    try {
      const { rows: [meta] } = await db.query(`
        INSERT INTO metas_poupanca
          (utilizador_id, nome, descricao, valor_meta, valor_atual, data_alvo, icone, cor, notas)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *, ROUND((valor_atual / valor_meta) * 100, 1) AS percentagem
      `, [
        req.utilizador.id, nome, descricao || null,
        valor_meta, valor_atual || 0,
        data_alvo || null, icone || '🎯', cor || '#1D9E75',
        notas || null
      ]);

      res.status(201).json(meta);
    } catch (err) {
      console.error('Erro ao criar meta:', err);
      res.status(500).json({ erro: 'Erro ao criar meta.' });
    }
  }
);

// ─── Depositar / levantar valor ───────────────────────────────────────────────
router.patch('/:id/depositar',
  [
    body('valor').isFloat().withMessage('Valor inválido'),
  ],
  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erros: erros.array() });
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
  const { nome, descricao, valor_meta, data_alvo, icone, cor, notas } = req.body;

  try {
    const { rows: [atualizada] } = await db.query(`
      UPDATE metas_poupanca SET
        nome = COALESCE($1, nome),
        descricao = COALESCE($2, descricao),
        valor_meta = COALESCE($3, valor_meta),
        data_alvo = COALESCE($4, data_alvo),
        icone = COALESCE($5, icone),
        cor = COALESCE($6, cor),
        notas = $7,
        atualizado_em = NOW()
      WHERE id = $8 AND utilizador_id = $9
      RETURNING *, ROUND((valor_atual / valor_meta) * 100, 1) AS percentagem
    `, [nome, descricao, valor_meta, data_alvo, icone, cor, notas || null, req.params.id, req.utilizador.id]);

    if (!atualizada) {
      return res.status(404).json({ erro: 'Meta não encontrada.' });
    }

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