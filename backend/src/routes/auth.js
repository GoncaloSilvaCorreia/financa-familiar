const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const autenticar = require('../middleware/autenticar');

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
      return res.status(400).json({ erros: erros.array() });
    }

    const { nome, email, password } = req.body;

    try {
      // Verifica se o email já existe
      const { rows } = await db.query(
        'SELECT id FROM utilizadores WHERE email = $1',
        [email]
      );
      if (rows.length > 0) {
        return res.status(409).json({ erro: 'Este email já está registado.' });
      }

      // Hash da password
      const passwordHash = await bcrypt.hash(password, 12);

      // Iniciais para o avatar (ex: "João Ferreira" → "JF")
      const iniciais = nome
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0].toUpperCase())
        .join('');

      // Cria utilizador
      const { rows: [utilizador] } = await db.query(
        `INSERT INTO utilizadores (nome, email, password_hash, avatar_iniciais)
         VALUES ($1, $2, $3, $4)
         RETURNING id, nome, email, avatar_iniciais, criado_em`,
        [nome, email, passwordHash, iniciais]
      );

      // Cria categorias padrão para o novo utilizador
      await criarCategoriasPadrao(utilizador.id);

      // Gera token
      const token = gerarToken(utilizador);

      res.status(201).json({ token, utilizador });

    } catch (err) {
      console.error('Erro no registo:', err);
      res.status(500).json({ erro: 'Erro ao criar conta.' });
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
      return res.status(400).json({ erros: erros.array() });
    }

    const { email, password } = req.body;

    try {
      const { rows } = await db.query(
        `SELECT id, nome, email, password_hash, avatar_iniciais
         FROM utilizadores WHERE email = $1`,
        [email]
      );

      if (rows.length === 0) {
        return res.status(401).json({ erro: 'Email ou password incorretos.' });
      }

      const utilizador = rows[0];
      const passwordCorreta = await bcrypt.compare(password, utilizador.password_hash);

      if (!passwordCorreta) {
        return res.status(401).json({ erro: 'Email ou password incorretos.' });
      }

      const token = gerarToken(utilizador);

      // Não devolver o hash da password
      delete utilizador.password_hash;

      res.json({ token, utilizador });

    } catch (err) {
      console.error('Erro no login:', err);
      res.status(500).json({ erro: 'Erro ao fazer login.' });
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

async function criarCategoriasPadrao(utilizadorId) {
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
      `INSERT INTO categorias (utilizador_id, nome, icone, cor, tipo)
       VALUES ($1, $2, $3, $4, $5)`,
      [utilizadorId, cat.nome, cat.icone, cat.cor, cat.tipo]
    );
  }
}

module.exports = router;
