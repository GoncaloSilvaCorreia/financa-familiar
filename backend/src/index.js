const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const transacoesRoutes = require('./routes/transacoes');
const prazosRoutes = require('./routes/prazos');
const poupancasRoutes = require('./routes/poupancas');
const veiculosRoutes = require('./routes/veiculos');
const categoriasRoutes = require('./routes/categorias');
const contasRoutes = require('./routes/contas');
const agregadoRoutes = require('./routes/agregado');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    const permitidas = [
      'http://localhost:5173',
      process.env.CORS_ORIGIN,
    ].filter(Boolean);
    if (!origin || permitidas.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('CORS não permitido'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/transacoes', transacoesRoutes);
app.use('/api/prazos', prazosRoutes);
app.use('/api/poupancas', poupancasRoutes);
app.use('/api/veiculos', veiculosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/contas', contasRoutes);
app.use('/api/agregado', agregadoRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handler de erros global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    erro: err.message || 'Erro interno do servidor',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor a correr em http://localhost:${PORT}`);
});