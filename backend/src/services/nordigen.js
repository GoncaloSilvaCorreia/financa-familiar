// services/nordigen.js
// Abstrai todas as chamadas à API GoCardless Bank Account Data (Nordigen)
// Documentação: https://developer.gocardless.com/bank-account-data/overview

const BASE_URL = 'https://bankaccountdata.gocardless.com/api/v2';

let tokenCache = null; // { access, access_expires, refresh, refresh_expires }

// ─── Autenticação ────────────────────────────────────────────────────────────

async function obterToken() {
  const agora = Date.now();

  // Reutilizar access token se ainda válido (com 60s de margem)
  if (tokenCache?.access && tokenCache.access_expires > agora + 60_000) {
    return tokenCache.access;
  }

  // Renovar com refresh token se disponível
  if (tokenCache?.refresh && tokenCache.refresh_expires > agora + 60_000) {
    const res = await fetch(`${BASE_URL}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: tokenCache.refresh }),
    });
    if (res.ok) {
      const dados = await res.json();
      tokenCache.access = dados.access;
      tokenCache.access_expires = agora + dados.access_expires * 1000;
      return tokenCache.access;
    }
  }

  // Obter novo par de tokens
  const res = await fetch(`${BASE_URL}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret_id:  process.env.NORDIGEN_SECRET_ID,
      secret_key: process.env.NORDIGEN_SECRET_KEY,
    }),
  });

  if (!res.ok) {
    const erro = await res.json();
    throw new Error(`Nordigen auth falhou: ${JSON.stringify(erro)}`);
  }

  const dados = await res.json();
  tokenCache = {
    access:          dados.access,
    access_expires:  agora + dados.access_expires  * 1000,
    refresh:         dados.refresh,
    refresh_expires: agora + dados.refresh_expires * 1000,
  };

  return tokenCache.access;
}

async function cabecalhos() {
  const token = await obterToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  };
}

// ─── Instituições ────────────────────────────────────────────────────────────

async function listarBancos(pais = 'PT') {
  const res = await fetch(`${BASE_URL}/institutions/?country=${pais}`, {
    headers: await cabecalhos(),
  });
  if (!res.ok) throw new Error('Erro a listar bancos');
  return res.json(); // Array de { id, name, bic, transaction_total_days, logo, countries }
}

// ─── Requisitions (fluxo de consentimento) ───────────────────────────────────

async function criarRequisition({ institutionId, redirectUrl, referencia }) {
  const res = await fetch(`${BASE_URL}/requisitions/`, {
    method: 'POST',
    headers: await cabecalhos(),
    body: JSON.stringify({
      redirect:       redirectUrl,
      institution_id: institutionId,
      reference:      referencia,        // ID único por utilizador/ligação
      agreement:      '',                // Nordigen cria automaticamente
      user_language:  'PT',
    }),
  });

  if (!res.ok) {
    const erro = await res.json();
    throw new Error(`Erro ao criar requisition: ${JSON.stringify(erro)}`);
  }

  return res.json();
  // Devolve: { id, created, redirect, status, institution_id, agreement, reference, accounts, link }
  // O campo 'link' é o URL para onde redirecionar o utilizador
}

async function obterRequisition(requisitionId) {
  const res = await fetch(`${BASE_URL}/requisitions/${requisitionId}/`, {
    headers: await cabecalhos(),
  });
  if (!res.ok) throw new Error('Requisition não encontrada');
  return res.json();
}

// ─── Contas ──────────────────────────────────────────────────────────────────

async function obterDetalhesConta(accountId) {
  const res = await fetch(`${BASE_URL}/accounts/${accountId}/details/`, {
    headers: await cabecalhos(),
  });
  if (!res.ok) throw new Error('Erro a obter detalhes da conta');
  const dados = await res.json();
  return dados.account; // { iban, currency, ownerName, name, product, ... }
}

async function obterSaldoConta(accountId) {
  const res = await fetch(`${BASE_URL}/accounts/${accountId}/balances/`, {
    headers: await cabecalhos(),
  });
  if (!res.ok) throw new Error('Erro a obter saldo');
  const dados = await res.json();
  // Preferir saldo 'closingBooked', fallback para o primeiro disponível
  const saldos = dados.balances || [];
  return (
    saldos.find(s => s.balanceType === 'closingBooked') ||
    saldos.find(s => s.balanceType === 'interimAvailable') ||
    saldos[0]
  );
}

async function obterTransacoes(accountId, dataInicio, dataFim) {
  let url = `${BASE_URL}/accounts/${accountId}/transactions/`;
  const params = new URLSearchParams();
  if (dataInicio) params.set('date_from', dataInicio); // YYYY-MM-DD
  if (dataFim)    params.set('date_to',   dataFim);
  if ([...params].length) url += `?${params}`;

  const res = await fetch(url, { headers: await cabecalhos() });
  if (!res.ok) throw new Error('Erro a obter transações');
  const dados = await res.json();

  // Nordigen devolve { transactions: { booked: [...], pending: [...] } }
  return {
    registadas: dados.transactions?.booked  || [],
    pendentes:  dados.transactions?.pending || [],
  };
}

module.exports = {
  listarBancos,
  criarRequisition,
  obterRequisition,
  obterDetalhesConta,
  obterSaldoConta,
  obterTransacoes,
};