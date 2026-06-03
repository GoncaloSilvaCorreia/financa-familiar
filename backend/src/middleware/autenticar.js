const jwt = require('jsonwebtoken');

module.exports = function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ erro: 'Acesso negado. Token em falta.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.utilizador = payload; // { id, email, nome }
    next();
  } catch (err) {
    return res.status(403).json({ erro: 'Token inválido ou expirado.' });
  }
};
