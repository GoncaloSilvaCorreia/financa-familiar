const jwt = require('jsonwebtoken');
const db = require('../db');

module.exports = async function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Acesso negado. Token em falta.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Busca o agregado do utilizador
    const { rows } = await db.query(
      `SELECT agregado_id, papel FROM membros_agregado WHERE utilizador_id = $1 LIMIT 1`,
      [payload.id]
    );

    req.utilizador = {
      ...payload,
      agregado_id: rows[0]?.agregado_id || null,
      papel: rows[0]?.papel || 'membro',
    };

    next();
  } catch (err) {
    return res.status(403).json({ erro: 'Token inválido ou expirado.' });
  }
};