const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const autenticar = require('../middleware/autenticar');
const { enviarEmailConfirmacao, enviarEmailBoasVindas } = require('../utils/email');

const router = express.Router();

// ─── Registo ────────────────────────────────────────────────────────────────
router.post('/registar',
  [
    body('nome').trim().notEmpty().withMessage('Nome obrigatório'),
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('Password mínima de 6 caracteres'),
  ],
  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erro: erros.array()[0].msg, campo: erros.array()[0].path });
    }

    const { nome, email, password } = req.body;

    try {
      const { rows } = await db.query(
        'SELECT id FROM utilizadores WHERE email = $1',
        [email]
      );
      if (rows.length > 0) {
        return res.status(409).json({ erro: 'Este email já está registado.', campo: 'email' });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const iniciais = nome
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0].toUpperCase())
        .join('');

      const tokenConfirmacao = crypto.randomBytes(32).toString('hex');

      const { rows: [utilizador] } = await db.query(
        `INSERT INTO utilizadores (nome, email, password_hash, avatar_iniciais, email_confirmado, token_confirmacao)
         VALUES ($1, $2, $3, $4, false, $5)
         RETURNING id, nome, email, avatar_iniciais, criado_em`,
        [nome, email, passwordHash, iniciais, tokenConfirmacao]
      );

      const { rows: [agregado] } = await db.query(
        `INSERT INTO agregados (nome) VALUES ($1) RETURNING id`,
        [`Agregado de ${nome.split(' ')[0]}`]
      );
      await db.query(
        `INSERT INTO membros_agregado (agregado_id, utilizador_id, papel) VALUES ($1, $2, 'admin')`,
        [agregado.id, utilizador.id]
      );

      await criarCategoriasPadrao(utilizador.id, agregado.id);

      // ── Envia email de confirmação. Se falhar, a conta continua criada, ─────
      // ── mas avisamos o utilizador para tentar reenviar mais tarde. ──────────
      try {
        await enviarEmailConfirmacao(email, nome, tokenConfirmacao);
      } catch (emailErr) {
        console.error('Falha ao enviar email de confirmação:', emailErr);
        return res.status(201).json({
          utilizador,
          aviso: 'Conta criada, mas não foi possível enviar o email de confirmação. Tenta reenviar mais tarde.'
        });
      }

      res.status(201).json({
        utilizador,
        mensagem: 'Conta criada! Verifica o teu email para confirmar a conta antes de entrares.'
      });

    } catch (err) {
      console.error('Erro no registo:', err);
      res.status(500).json({ erro: 'Erro ao criar conta. Tenta novamente.' });
    }
  }
);

// ─── Confirmar email ──────────────────────────────────────────────────────────
router.get('/confirmar/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const { rows } = await db.query(
      `SELECT id, nome, email, email_confirmado FROM utilizadores WHERE token_confirmacao = $1`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ erro: 'Link de confirmação inválido ou já utilizado.' });
    }

    const utilizador = rows[0];

    if (utilizador.email_confirmado) {
      return res.json({ mensagem: 'Email já confirmado anteriormente. Podes fazer login.', jaConfirmado: true });
    }

    await db.query(
      `UPDATE utilizadores SET email_confirmado = true, token_confirmacao = NULL, atualizado_em = NOW() WHERE id = $1`,
      [utilizador.id]
    );

    // Envia boas-vindas — não bloqueia a resposta se falhar
    enviarEmailBoasVindas(utilizador.email, utilizador.nome).catch(() => {});

    res.json({ mensagem: 'Email confirmado com sucesso! Já podes fazer login.' });

  } catch (err) {
    console.error('Erro ao confirmar email:', err);
    res.status(500).json({ erro: 'Erro ao confirmar email. Tenta novamente.' });
  }
});

// ─── Reenviar email de confirmação ────────────────────────────────────────────
router.post('/reenviar-confirmacao',
  [body('email').isEmail().normalizeEmail().withMessage('Email inválido')],
  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erro: erros.array()[0].msg });
    }

    const { email } = req.body;

    try {
      const { rows } = await db.query(
        'SELECT id, nome, email_confirmado, token_confirmacao FROM utilizadores WHERE email = $1',
        [email]
      );

      if (rows.length === 0) {
        return res.status(404).json({ erro: 'Este email não está registado.' });
      }

      const utilizador = rows[0];

      if (utilizador.email_confirmado) {
        return res.status(400).json({ erro: 'Esta conta já está confirmada. Podes fazer login.' });
      }

      let token = utilizador.token_confirmacao;
      if (!token) {
        token = crypto.randomBytes(32).toString('hex');
        await db.query('UPDATE utilizadores SET token_confirmacao = $1 WHERE id = $2', [token, utilizador.id]);
      }

      await enviarEmailConfirmacao(email, utilizador.nome, token);

      res.json({ mensagem: 'Email de confirmação reenviado. Verifica a tua caixa de entrada.' });

    } catch (err) {
      console.error('Erro ao reenviar confirmação:', err);
      res.status(500).json({ erro: 'Erro ao reenviar email. Tenta novamente.' });
    }
  }
);

// ─── Login ───────────────────────────────────────────────────────────────────
router.post('/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Password obrigatória'),
  ],
  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erro: erros.array()[0].msg, campo: erros.array()[0].path });
    }

    const { email, password } = req.body;

    try {
      const { rows } = await db.query(
        `SELECT id, nome, email, password_hash, avatar_iniciais, email_confirmado
         FROM utilizadores WHERE email = $1`,
        [email]
      );

      if (rows.length === 0) {
        return res.status(401).json({ erro: 'Este email não está registado.', campo: 'email' });
      }

      const utilizador = rows[0];
      const passwordCorreta = await bcrypt.compare(password, utilizador.password_hash);

      if (!passwordCorreta) {
        return res.status(401).json({ erro: 'Password incorreta.', campo: 'password' });
      }

      // ── Bloqueia login se o email ainda não foi confirmado ───────────────────
      if (!utilizador.email_confirmado) {
        return res.status(403).json({
          erro: 'Tens de confirmar o teu email antes de entrares. Verifica a tua caixa de entrada.',
          campo: 'email_nao_confirmado'
        });
      }

      const token = gerarToken(utilizador);

      delete utilizador.password_hash;

      res.json({ token, utilizador });

    } catch (err) {
      console.error('Erro no login:', err);
      res.status(500).json({ erro: 'Erro ao fazer login. Tenta novamente.' });
    }
  }
);

// ─── Perfil atual ─────────────────────────────────────────────────────────────
router.get('/me', autenticar, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, nome, email, avatar_iniciais, criado_em
       FROM utilizadores WHERE id = $1`,
      [req.utilizador.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Utilizador não encontrado.' });
    }

    res.json(rows[0]);

  } catch (err) {
    console.error('Erro ao obter perfil:', err);
    res.status(500).json({ erro: 'Erro ao obter perfil.' });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function gerarToken(utilizador) {
  return jwt.sign(
    { id: utilizador.id, email: utilizador.email, nome: utilizador.nome },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function criarCategoriasPadrao(utilizadorId, agregadoId) {
  const categorias = [
    { nome: 'Alimentação',  icone: '🛒', cor: '#3B8BD4', tipo: 'gasto' },
    { nome: 'Habitação',    icone: '🏠', cor: '#1D9E75', tipo: 'gasto' },
    { nome: 'Transportes',  icone: '🚗', cor: '#EF9F27', tipo: 'gasto' },
    { nome: 'Saúde',        icone: '💊', cor: '#D85A30', tipo: 'gasto' },
    { nome: 'Lazer',        icone: '🎬', cor: '#7F77DD', tipo: 'gasto' },
    { nome: 'Eletricidade', icone: '⚡', cor: '#E2B53F', tipo: 'gasto' },
    { nome: 'Água',         icone: '💧', cor: '#3B8BD4', tipo: 'gasto' },
    { nome: 'Internet/TV',  icone: '📡', cor: '#5DCAA5', tipo: 'gasto' },
    { nome: 'Poupança',     icone: '🐷', cor: '#1D9E75', tipo: 'poupanca' },
    { nome: 'Salário',      icone: '💼', cor: '#1D9E75', tipo: 'receita' },
  ];

  for (const cat of categorias) {
    await db.query(
      `INSERT INTO categorias (utilizador_id, agregado_id, criado_por, nome, icone, cor, tipo)
       VALUES ($1, $2, $1, $3, $4, $5, $6)`,
      [utilizadorId, agregadoId || null, cat.nome, cat.icone, cat.cor, cat.tipo]
    );
  }
}

module.exports = router;