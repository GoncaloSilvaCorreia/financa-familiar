const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const autenticar = require('../middleware/autenticar');

const router = express.Router();

router.use(autenticar);

// Regex para os 3 formatos válidos de matrícula portuguesa
const REGEX_MATRICULA = /^(\d{2}-\d{2}-[A-Z]{2}|\d{2}-[A-Z]{2}-\d{2}|[A-Z]{2}-\d{2}-\d{2})$/i;

function validarVeiculo(body) {
  const { nome, matricula, ano, combustivel, iuc_valor } = body;

  if (!nome || !nome.trim()) {
    return { erro: 'O nome do veículo é obrigatório.', campo: 'nome' };
  }

  if (matricula && matricula.trim() && !REGEX_MATRICULA.test(matricula.trim())) {
    return {
      erro: 'Matrícula inválida. Usa o formato 00-00-AA, 00-AA-00 ou AA-00-00.',
      campo: 'matricula'
    };
  }

  if (ano !== undefined && ano !== null && ano !== '') {
    const anoNum = parseInt(ano, 10);
    const anoAtual = new Date().getFullYear();
    if (isNaN(anoNum) || !Number.isInteger(anoNum)) {
      return { erro: 'O ano deve ser um número válido.', campo: 'ano' };
    }
    if (anoNum < 1900 || anoNum > anoAtual + 1) {
      return { erro: `O ano deve estar entre 1900 e ${anoAtual + 1}.`, campo: 'ano' };
    }
  }

  if (iuc_valor !== undefined && iuc_valor !== null && iuc_valor !== '') {
    const valorNum = parseFloat(iuc_valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      return { erro: 'O valor do IUC deve ser um número positivo.', campo: 'iuc_valor' };
    }
  }

  const COMBUSTIVEIS_VALIDOS = ['Gasolina', 'Gasóleo', 'Elétrico', 'Híbrido', 'GPL', 'Outro'];
  if (combustivel && !COMBUSTIVEIS_VALIDOS.includes(combustivel)) {
    return { erro: 'Tipo de combustível inválido.', campo: 'combustivel' };
  }

  return null;
}

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
  [body('nome').trim().notEmpty().withMessage('Nome obrigatório')],
  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erro: erros.array()[0].msg, campo: erros.array()[0].path });
    }

    const validacao = validarVeiculo(req.body);
    if (validacao) {
      return res.status(400).json(validacao);
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
        req.utilizador.id, nome.trim(),
        matricula ? matricula.trim().toUpperCase() : null,
        marca || null, modelo || null, ano || null, combustivel || null,
        iuc_valor || null, iuc_mes_vencimento || null,
        seguro_vencimento || null, inspecao_vencimento || null
      ]);

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
      res.status(500).json({ erro: 'Erro ao criar veículo. Tenta novamente.' });
    }
  }
);

// ─── Atualizar veículo ────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const validacao = validarVeiculo(req.body);
  if (validacao) {
    return res.status(400).json(validacao);
  }

  const {
    nome, matricula, marca, modelo, ano, combustivel,
    iuc_valor, iuc_mes_vencimento, seguro_vencimento, inspecao_vencimento
  } = req.body;

  try {
    const { rows: atual } = await db.query(
      'SELECT * FROM veiculos WHERE id = $1 AND utilizador_id = $2',
      [req.params.id, req.utilizador.id]
    );
    if (atual.length === 0) return res.status(404).json({ erro: 'Veículo não encontrado.' });

    const v = atual[0];

    const { rows: [atualizado] } = await db.query(`
      UPDATE veiculos SET
        nome                = $1,
        matricula           = $2,
        marca               = $3,
        modelo              = $4,
        ano                 = $5,
        combustivel         = $6,
        iuc_valor           = $7,
        iuc_mes_vencimento  = $8,
        seguro_vencimento   = $9,
        inspecao_vencimento = $10,
        atualizado_em       = NOW()
      WHERE id = $11 AND utilizador_id = $12
      RETURNING *
    `, [
      nome != null ? nome.trim() : v.nome,
      matricula != null ? (matricula.trim() ? matricula.trim().toUpperCase() : null) : v.matricula,
      marca ?? v.marca,
      modelo ?? v.modelo,
      ano ?? v.ano,
      combustivel ?? v.combustivel,
      iuc_valor ?? v.iuc_valor,
      iuc_mes_vencimento ?? v.iuc_mes_vencimento,
      seguro_vencimento !== undefined ? (seguro_vencimento || null) : v.seguro_vencimento,
      inspecao_vencimento !== undefined ? (inspecao_vencimento || null) : v.inspecao_vencimento,
      req.params.id, req.utilizador.id
    ]);

    res.json(atualizado);
  } catch (err) {
    console.error('Erro ao atualizar veículo:', err);
    res.status(500).json({ erro: 'Erro ao atualizar veículo. Tenta novamente.' });
  }
});

// ─── Arquivar veículo (soft delete) ──────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE veiculos SET ativo = false WHERE id = $1 AND utilizador_id = $2 RETURNING id',
      [req.params.id, req.utilizador.id]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Veículo não encontrado.' });
    res.json({ mensagem: 'Veículo arquivado com sucesso.' });
  } catch (err) {
    console.error('Erro ao arquivar veículo:', err);
    res.status(500).json({ erro: 'Erro ao arquivar veículo.' });
  }
});

module.exports = router;