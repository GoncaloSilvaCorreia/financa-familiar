const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const autenticar = require('../middleware/autenticar');

const router = express.Router();
router.use(autenticar);

// ─── Ver agregado atual ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows: [agregado] } = await db.query(
      'SELECT * FROM agregados WHERE id = $1',
      [req.utilizador.agregado_id]
    );

    const { rows: membros } = await db.query(`
      SELECT u.id, u.nome, u.email, u.avatar_iniciais, m.papel, m.criado_em
      FROM membros_agregado m
      JOIN utilizadores u ON u.id = m.utilizador_id
      WHERE m.agregado_id = $1
      ORDER BY m.criado_em ASC
    `, [req.utilizador.agregado_id]);

    const { rows: convitesPendentes } = await db.query(`
      SELECT id, email, criado_em, expira_em
      FROM convites
      WHERE agregado_id = $1 AND aceite = false AND expira_em > NOW()
      ORDER BY criado_em DESC
    `, [req.utilizador.agregado_id]);

    res.json({ ...agregado, membros, convites_pendentes: convitesPendentes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao obter agregado.' });
  }
});

// ─── Atualizar nome do agregado ───────────────────────────────────────────────
router.put('/', async (req, res) => {
  if (req.utilizador.papel !== 'admin') {
    return res.status(403).json({ erro: 'Apenas o administrador pode editar o agregado.' });
  }
  const { nome } = req.body;
  try {
    const { rows: [agregado] } = await db.query(
      'UPDATE agregados SET nome = $1 WHERE id = $2 RETURNING *',
      [nome, req.utilizador.agregado_id]
    );
    res.json(agregado);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar agregado.' });
  }
});

// ─── Convidar membro por email ────────────────────────────────────────────────
router.post('/convidar', async (req, res) => {
  if (req.utilizador.papel !== 'admin') {
    return res.status(403).json({ erro: 'Apenas o administrador pode convidar membros.' });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ erro: 'Email obrigatório.' });

  try {
    // Verifica se já é membro
    const { rows: jaExiste } = await db.query(`
      SELECT u.id FROM utilizadores u
      JOIN membros_agregado m ON m.utilizador_id = u.id
      WHERE u.email = $1 AND m.agregado_id = $2
    `, [email, req.utilizador.agregado_id]);

    if (jaExiste.length > 0) {
      return res.status(409).json({ erro: 'Esta pessoa já é membro do agregado.' });
    }

    // Verifica se já existe convite pendente para este email
    const { rows: convitePendente } = await db.query(`
      SELECT id FROM convites
      WHERE agregado_id = $1 AND email = $2 AND aceite = false AND expira_em > NOW()
    `, [req.utilizador.agregado_id, email.toLowerCase()]);

    if (convitePendente.length > 0) {
      return res.status(409).json({ erro: 'Já existe um convite pendente para este email. Cancela o anterior primeiro.' });
    }

    // Gera token único
    const token = crypto.randomBytes(32).toString('hex');

    // Guarda convite
    await db.query(`
      INSERT INTO convites (agregado_id, email, token, criado_por)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
    `, [req.utilizador.agregado_id, email.toLowerCase(), token, req.utilizador.id]);

    // Em produção enviarias um email aqui
    // Por agora devolve o token para testes
    res.status(201).json({
      mensagem: `Convite criado para ${email}`,
      token, // remover em produção
      link: `${process.env.CORS_ORIGIN}/aceitar-convite?token=${token}`
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar convite.' });
  }
});

// ─── Aceitar convite ──────────────────────────────────────────────────────────
router.post('/aceitar-convite', async (req, res) => {
  const { token, nome, password } = req.body;
  if (!token) return res.status(400).json({ erro: 'Token obrigatório.' });

  try {
    // Valida token
    const { rows: [convite] } = await db.query(
      `SELECT * FROM convites WHERE token = $1 AND aceite = false AND expira_em > NOW()`,
      [token]
    );
    if (!convite) return res.status(404).json({ erro: 'Convite inválido ou expirado.' });

    // Verifica se já tem conta
    const { rows: [utilizadorExistente] } = await db.query(
      'SELECT id FROM utilizadores WHERE email = $1',
      [convite.email]
    );

    let utilizadorId;

    if (utilizadorExistente) {
      // Já tem conta — só junta ao agregado
      utilizadorId = utilizadorExistente.id;
    } else {
      // Cria conta nova
      if (!nome || !password) {
        return res.status(400).json({ erro: 'Nome e password obrigatórios para criar conta.' });
      }
      const passwordHash = await bcrypt.hash(password, 12);
      const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
      const { rows: [novo] } = await db.query(
        `INSERT INTO utilizadores (nome, email, password_hash, avatar_iniciais) VALUES ($1, $2, $3, $4) RETURNING id`,
        [nome, convite.email, passwordHash, iniciais]
      );
      utilizadorId = novo.id;
    }

    // Adiciona ao agregado
    await db.query(
      `INSERT INTO membros_agregado (agregado_id, utilizador_id, papel) VALUES ($1, $2, 'membro') ON CONFLICT DO NOTHING`,
      [convite.agregado_id, utilizadorId]
    );

    // Marca convite como aceite
    await db.query('UPDATE convites SET aceite = true WHERE id = $1', [convite.id]);

    res.json({ mensagem: 'Bem-vindo ao agregado! Podes fazer login agora.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao aceitar convite.' });
  }
});

// ─── Remover membro ───────────────────────────────────────────────────────────
router.delete('/membros/:utilizadorId', async (req, res) => {
  if (req.utilizador.papel !== 'admin') {
    return res.status(403).json({ erro: 'Apenas o administrador pode remover membros.' });
  }
  if (req.params.utilizadorId === req.utilizador.id) {
    return res.status(400).json({ erro: 'Não podes remover-te a ti próprio.' });
  }

  try {
    await db.query(
      'DELETE FROM membros_agregado WHERE agregado_id = $1 AND utilizador_id = $2',
      [req.utilizador.agregado_id, req.params.utilizadorId]
    );
    res.json({ mensagem: 'Membro removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover membro.' });
  }
});

// ─── Cancelar convite ─────────────────────────────────────────────────────────
router.delete('/convites/:id', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM convites WHERE id = $1 AND agregado_id = $2',
      [req.params.id, req.utilizador.agregado_id]
    );
    res.json({ mensagem: 'Convite cancelado.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao cancelar convite.' });
  }
});

// ─── Resumo por membro (para o dashboard) ────────────────────────────────────
router.get('/resumo', async (req, res) => {
  const { mes, ano } = req.query;
  if (!mes || !ano) return res.status(400).json({ erro: 'Mês e ano obrigatórios.' });

  try {
    const { rows } = await db.query(`
      SELECT
        u.id, u.nome, u.avatar_iniciais,
        SUM(CASE WHEN t.tipo = 'gasto' THEN t.valor ELSE 0 END) AS total_gastos,
        SUM(CASE WHEN t.tipo = 'receita' THEN t.valor ELSE 0 END) AS total_receitas,
        COUNT(CASE WHEN t.tipo = 'gasto' THEN 1 END) AS num_gastos
      FROM membros_agregado m
      JOIN utilizadores u ON u.id = m.utilizador_id
      LEFT JOIN transacoes t ON t.criado_por = u.id
        AND t.agregado_id = $1
        AND EXTRACT(MONTH FROM t.data) = $2
        AND EXTRACT(YEAR FROM t.data) = $3
      WHERE m.agregado_id = $1
      GROUP BY u.id, u.nome, u.avatar_iniciais
      ORDER BY total_gastos DESC
    `, [req.utilizador.agregado_id, mes, ano]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao obter resumo.' });
  }
});

module.exports = router;