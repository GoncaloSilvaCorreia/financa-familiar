const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const autenticar = require('../middleware/autenticar');

const router = express.Router();

router.use(autenticar);

// ─── Listar veículos ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT v.*,
        (
          SELECT json_agg(p ORDER BY p.data_vencimento ASC)
          FROM prazos p
          WHERE p.veiculo_id = v.id AND p.pago = false
        ) AS prazos_pendentes
      FROM veiculos v
      WHERE v.utilizador_id = $1 AND v.ativo = true
      ORDER BY v.criado_em ASC
    `, [req.utilizador.id]);

    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar veículos:', err);
    res.status(500).json({ erro: 'Erro ao listar veículos.' });
  }
});

// ─── Criar veículo ────────────────────────────────────────────────────────────
router.post('/',
  [
    body('nome').trim().notEmpty().withMessage('Nome obrigatório'),
  ],
  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erros: erros.array() });
    }

    const {
      nome, matricula, marca, modelo, ano, combustivel,
      iuc_valor, iuc_mes_vencimento, seguro_vencimento, inspecao_vencimento
    } = req.body;

    try {
      const { rows: [veiculo] } = await db.query(`
        INSERT INTO veiculos
          (utilizador_id, nome, matricula, marca, modelo, ano, combustivel,
           iuc_valor, iuc_mes_vencimento, seguro_vencimento, inspecao_vencimento)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        req.utilizador.id, nome, matricula || null, marca || null,
        modelo || null, ano || null, combustivel || null,
        iuc_valor || null, iuc_mes_vencimento || null,
        seguro_vencimento || null, inspecao_vencimento || null
      ]);

      // Cria automaticamente o prazo de IUC se tiver dados
      if (iuc_valor && iuc_mes_vencimento) {
        const anoAtual = new Date().getFullYear();
        const dataIUC = `${anoAtual}-${String(iuc_mes_vencimento).padStart(2, '0')}-01`;

        await db.query(`
          INSERT INTO prazos (utilizador_id, nome, tipo, data_vencimento, valor_estimado, recorrente, recorrencia_meses, veiculo_id)
          VALUES ($1, $2, 'iuc', $3, $4, true, 12, $5)
        `, [req.utilizador.id, `IUC — ${nome}`, dataIUC, iuc_valor, veiculo.id]);
      }

      res.status(201).json(veiculo);
    } catch (err) {
      console.error('Erro ao criar veículo:', err);
      res.status(500).json({ erro: 'Erro ao criar veículo.' });
    }
  }
);

// ─── Atualizar veículo ────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const {
    nome, matricula, marca, modelo, ano, combustivel,
    iuc_valor, iuc_mes_vencimento, seguro_vencimento, inspecao_vencimento
  } = req.body;

  try {
    const { rows: [atualizado] } = await db.query(`
      UPDATE veiculos SET
        nome = COALESCE($1, nome),
        matricula = COALESCE($2, matricula),
        marca = COALESCE($3, marca),
        modelo = COALESCE($4, modelo),
        ano = COALESCE($5, ano),
        combustivel = COALESCE($6, combustivel),
        iuc_valor = COALESCE($7, iuc_valor),
        iuc_mes_vencimento = COALESCE($8, iuc_mes_vencimento),
        seguro_vencimento = COALESCE($9, seguro_vencimento),
        inspecao_vencimento = COALESCE($10, inspecao_vencimento),
        atualizado_em = NOW()
      WHERE id = $11 AND utilizador_id = $12
      RETURNING *
    `, [nome, matricula, marca, modelo, ano, combustivel,
        iuc_valor, iuc_mes_vencimento, seguro_vencimento, inspecao_vencimento,
        req.params.id, req.utilizador.id]);

    if (!atualizado) {
      return res.status(404).json({ erro: 'Veículo não encontrado.' });
    }

    res.json(atualizado);
  } catch (err) {
    console.error('Erro ao atualizar veículo:', err);
    res.status(500).json({ erro: 'Erro ao atualizar veículo.' });
  }
});

// ─── Arquivar veículo (soft delete) ──────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE veiculos SET ativo = false WHERE id = $1 AND utilizador_id = $2 RETURNING id',
      [req.params.id, req.utilizador.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Veículo não encontrado.' });
    }

    res.json({ mensagem: 'Veículo arquivado com sucesso.' });
  } catch (err) {
    console.error('Erro ao arquivar veículo:', err);
    res.status(500).json({ erro: 'Erro ao arquivar veículo.' });
  }
});

module.exports = router;