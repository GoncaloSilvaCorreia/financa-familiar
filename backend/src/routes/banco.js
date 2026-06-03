// routes/banco.js
// Rotas para integração Open Banking via Nordigen/GoCardless

const express  = require('express');
const router   = express.Router();
const db       = require('../db');
const autenticar = require('../middleware/autenticar');
const nordigen   = require('../services/nordigen');
const { inserirTransacoes } = require('../services/mapeadorTransacoes');

// Todas as rotas exigem JWT
router.use(autenticar);

// ─── GET /api/banco/bancos-disponiveis ────────────────────────────────────────
// Lista bancos disponíveis para ligação (filtrado para Portugal)
router.get('/bancos-disponiveis', async (req, res) => {
  try {
    const bancos = await nordigen.listarBancos('PT');
    // Devolver apenas campos relevantes para o frontend
    const simplificados = bancos.map(b => ({
      id:   b.id,
      nome: b.name,
      bic:  b.bic,
      logo: b.logo,
      diasHistorico: b.transaction_total_days,
    }));
    res.json(simplificados);
  } catch (err) {
    console.error('Erro a listar bancos:', err);
    res.status(502).json({ erro: 'Não foi possível obter a lista de bancos' });
  }
});

// ─── POST /api/banco/iniciar ──────────────────────────────────────────────────
// Inicia o fluxo OAuth: cria requisition e devolve o link de redirecionamento
router.post('/iniciar', async (req, res) => {
  const { institutionId } = req.body;
  if (!institutionId) {
    return res.status(400).json({ erro: 'institutionId é obrigatório' });
  }

  try {
    const referencia   = `ff-${req.utilizadorId}-${Date.now()}`;
    const redirectUrl  = `${process.env.FRONTEND_URL}/contas-bancarias/callback`;

    const requisition = await nordigen.criarRequisition({
      institutionId,
      redirectUrl,
      referencia,
    });

    // Guardar requisition pendente na BD (account_id ainda desconhecido)
    const banco = await nordigen.listarBancos('PT').then(
      lista => lista.find(b => b.id === institutionId) || {}
    );

    await db.query(
      `INSERT INTO ligacoes_banco
         (utilizador_id, requisition_id, institution_id, banco_nome, banco_logo, ativo)
       VALUES ($1, $2, $3, $4, $5, false)
       ON CONFLICT (requisition_id) DO NOTHING`,
      [
        req.utilizadorId,
        requisition.id,
        institutionId,
        banco.name || institutionId,
        banco.logo || null,
      ]
    );

    res.json({ linkAutorizacao: requisition.link, requisitionId: requisition.id });
  } catch (err) {
    console.error('Erro ao iniciar ligação bancária:', err);
    res.status(502).json({ erro: 'Não foi possível iniciar a ligação com o banco' });
  }
});

// ─── GET /api/banco/callback ──────────────────────────────────────────────────
// Chamado após o utilizador autorizar no banco (via redirect do frontend)
// O frontend passa o requisition_id que recebeu no redirect de retorno
router.post('/callback', async (req, res) => {
  const { requisitionId } = req.body;
  if (!requisitionId) {
    return res.status(400).json({ erro: 'requisitionId é obrigatório' });
  }

  try {
    // Verificar que a requisition pertence a este utilizador
    const { rows } = await db.query(
      'SELECT * FROM ligacoes_banco WHERE requisition_id = $1 AND utilizador_id = $2',
      [requisitionId, req.utilizadorId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Ligação não encontrada' });
    }

    // Obter estado atual da requisition no Nordigen
    const requisition = await nordigen.obterRequisition(requisitionId);

    if (requisition.status !== 'LN') {
      // LN = Linked (autorizado com sucesso)
      return res.status(400).json({
        erro: `Estado da autorização: ${requisition.status}. Tente novamente.`,
      });
    }

    const accountId = requisition.accounts?.[0];
    if (!accountId) {
      return res.status(400).json({ erro: 'Nenhuma conta associada à autorização' });
    }

    // Obter IBAN da conta
    const detalhes = await nordigen.obterDetalhesConta(accountId);

    // Ativar a ligação e guardar account_id + IBAN
    await db.query(
      `UPDATE ligacoes_banco
       SET account_id = $1, iban = $2, ativo = true, ultima_sincronizacao = NOW()
       WHERE requisition_id = $3`,
      [accountId, detalhes.iban || null, requisitionId]
    );

    // Sincronização inicial: importar últimos 90 dias
    const ligacao = await db.query(
      'SELECT id FROM ligacoes_banco WHERE requisition_id = $1',
      [requisitionId]
    );
    const ligacaoId = ligacao.rows[0].id;

    // Obter conta_id do utilizador (primeira conta disponível como fallback)
    const conta = await db.query(
      'SELECT id FROM contas WHERE utilizador_id = $1 LIMIT 1',
      [req.utilizadorId]
    );
    const contaId = conta.rows[0]?.id || null;

    const dataInicio = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const { registadas } = await nordigen.obterTransacoes(accountId, dataInicio);
    const { inseridas } = await inserirTransacoes(db, registadas, contaId, ligacaoId);

    res.json({
      mensagem:  'Banco ligado com sucesso',
      banco:     rows[0].banco_nome,
      iban:      detalhes.iban,
      inseridas,
    });
  } catch (err) {
    console.error('Erro no callback bancário:', err);
    res.status(502).json({ erro: 'Erro ao finalizar a ligação bancária' });
  }
});

// ─── GET /api/banco/ligacoes ──────────────────────────────────────────────────
// Lista ligações bancárias do utilizador
router.get('/ligacoes', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, banco_nome, banco_logo, iban, ativo, ultima_sincronizacao, criado_em
       FROM ligacoes_banco
       WHERE utilizador_id = $1
       ORDER BY criado_em DESC`,
      [req.utilizadorId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro a listar ligações:', err);
    res.status(500).json({ erro: 'Erro ao obter ligações bancárias' });
  }
});

// ─── POST /api/banco/sincronizar/:id ─────────────────────────────────────────
// Sincronização manual de uma ligação específica
router.post('/sincronizar/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM ligacoes_banco WHERE id = $1 AND utilizador_id = $2 AND ativo = true',
      [req.params.id, req.utilizadorId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Ligação não encontrada ou inativa' });
    }

    const ligacao = rows[0];

    // Sincronizar desde a última sincronização (ou 30 dias atrás)
    const dataInicio = ligacao.ultima_sincronizacao
      ? new Date(ligacao.ultima_sincronizacao).toISOString().split('T')[0]
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { registadas } = await nordigen.obterTransacoes(ligacao.account_id, dataInicio);

    const conta = await db.query(
      'SELECT id FROM contas WHERE utilizador_id = $1 LIMIT 1',
      [req.utilizadorId]
    );
    const contaId = conta.rows[0]?.id || null;

    const { inseridas, ignoradas } = await inserirTransacoes(
      db, registadas, contaId, ligacao.id
    );

    // Atualizar timestamp de sincronização
    await db.query(
      'UPDATE ligacoes_banco SET ultima_sincronizacao = NOW() WHERE id = $1',
      [ligacao.id]
    );

    res.json({
      mensagem:  `Sincronização concluída`,
      inseridas,
      ignoradas,
      total:     registadas.length,
    });
  } catch (err) {
    console.error('Erro na sincronização:', err);
    res.status(502).json({ erro: 'Erro ao sincronizar transações' });
  }
});

// ─── DELETE /api/banco/ligacoes/:id ──────────────────────────────────────────
// Remove uma ligação bancária (desativa, não apaga dados)
router.delete('/ligacoes/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `UPDATE ligacoes_banco SET ativo = false
       WHERE id = $1 AND utilizador_id = $2`,
      [req.params.id, req.utilizadorId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ erro: 'Ligação não encontrada' });
    }
    res.json({ mensagem: 'Ligação removida com sucesso' });
  } catch (err) {
    console.error('Erro ao remover ligação:', err);
    res.status(500).json({ erro: 'Erro ao remover ligação bancária' });
  }
});

// ─── POST /api/banco/webhook ──────────────────────────────────────────────────
// Recebe notificações automáticas do Nordigen (novo gasto detetado)
// NOTA: Esta rota NÃO usa o middleware autenticar — é chamada pelo Nordigen
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // Verificar assinatura HMAC (segurança)
  const assinatura = req.headers['nordigen-signature'];
  const segredo    = process.env.NORDIGEN_WEBHOOK_SECRET;

  if (segredo && assinatura) {
    const crypto = require('crypto');
    const esperada = crypto
      .createHmac('sha256', segredo)
      .update(req.body)
      .digest('hex');
    if (assinatura !== esperada) {
      return res.status(401).json({ erro: 'Assinatura inválida' });
    }
  }

  try {
    const evento = JSON.parse(req.body.toString());

    // Nordigen envia: { type, created, data: { account_id, ... } }
    if (evento.type === 'TRANSACTION') {
      const accountId = evento.data?.account_id;
      if (!accountId) return res.status(200).json({ ok: true });

      // Encontrar a ligação correspondente
      const { rows } = await db.query(
        'SELECT * FROM ligacoes_banco WHERE account_id = $1 AND ativo = true',
        [accountId]
      );
      if (rows.length === 0) return res.status(200).json({ ok: true });

      const ligacao = rows[0];

      // Importar transações das últimas 24h
      const dataInicio = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      const { registadas } = await nordigen.obterTransacoes(accountId, dataInicio);

      const conta = await db.query(
        'SELECT id FROM contas WHERE utilizador_id = $1 LIMIT 1',
        [ligacao.utilizador_id]
      );
      const contaId = conta.rows[0]?.id || null;

      await inserirTransacoes(db, registadas, contaId, ligacao.id);
      await db.query(
        'UPDATE ligacoes_banco SET ultima_sincronizacao = NOW() WHERE id = $1',
        [ligacao.id]
      );
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro no webhook:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;