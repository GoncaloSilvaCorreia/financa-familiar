/**
 * SEED COMPLETO — FinançaFamiliar
 * Gera dados realistas e variados para demonstração da plataforma.
 *
 * USO:
 *   cd backend
 *   node src/db/seed_completo.js
 *
 * ATENÇÃO: Apaga todos os dados existentes antes de inserir os novos.
 */

require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// ─── Helpers ────────────────────────────────────────────────────────────────

const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const fmt = (n) => parseFloat(n.toFixed(2));

// Gera uma data aleatória entre os últimos N dias e hoje
function randomDate(daysBack = 180) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, daysBack));
  return d.toISOString().split("T")[0];
}

// Próxima ocorrência mensal (dia fixo)
function nextMonthlyDate(day, offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  d.setDate(day);
  return d.toISOString().split("T")[0];
}

// ─── Dados de referência ─────────────────────────────────────────────────────

const CATEGORIAS = [
  // Despesa
  { nome: "Habitação",        tipo: "despesa", icone: "🏠", cor: "#EF4444" },
  { nome: "Alimentação",      tipo: "despesa", icone: "🛒", cor: "#F97316" },
  { nome: "Transportes",      tipo: "despesa", icone: "🚗", cor: "#EAB308" },
  { nome: "Saúde",            tipo: "despesa", icone: "💊", cor: "#EC4899" },
  { nome: "Educação",         tipo: "despesa", icone: "📚", cor: "#8B5CF6" },
  { nome: "Lazer",            tipo: "despesa", icone: "🎬", cor: "#06B6D4" },
  { nome: "Vestuário",        tipo: "despesa", icone: "👕", cor: "#84CC16" },
  { nome: "Telecomunicações", tipo: "despesa", icone: "📱", cor: "#14B8A6" },
  { nome: "Seguros",          tipo: "despesa", icone: "🛡️", cor: "#6366F1" },
  { nome: "Restaurantes",     tipo: "despesa", icone: "🍽️", cor: "#F43F5E" },
  { nome: "Supermercado",     tipo: "despesa", icone: "🏪", cor: "#FB923C" },
  { nome: "Combustível",      tipo: "despesa", icone: "⛽", cor: "#FBBF24" },
  { nome: "Higiene & Beleza", tipo: "despesa", icone: "🧴", cor: "#A78BFA" },
  { nome: "Animais",          tipo: "despesa", icone: "🐾", cor: "#34D399" },
  { nome: "Poupança/Invest.", tipo: "despesa", icone: "💰", cor: "#10B981" },
  // Receita
  { nome: "Salário",          tipo: "receita", icone: "💼", cor: "#22C55E" },
  { nome: "Freelance",        tipo: "receita", icone: "💻", cor: "#3B82F6" },
  { nome: "Rendas",           tipo: "receita", icone: "🏢", cor: "#0EA5E9" },
  { nome: "Dividendos",       tipo: "receita", icone: "📈", cor: "#10B981" },
  { nome: "Outros",           tipo: "receita", icone: "🎁", cor: "#6B7280" },
];

const CONTAS = [
  { nome: "Conta Ordenado",       tipo: "corrente",  banco: "Millennium BCP",  saldo: 3240.55,  cor: "#3B82F6" },
  { nome: "Conta Poupança",       tipo: "poupanca",  banco: "Millennium BCP",  saldo: 12800.00, cor: "#10B981" },
  { nome: "Conta Conjunta",       tipo: "corrente",  banco: "CGD",             saldo: 870.20,   cor: "#8B5CF6" },
  { nome: "Cartão Crédito",       tipo: "credito",   banco: "Santander",       saldo: -450.30,  cor: "#EF4444" },
  { nome: "Conta Investimento",   tipo: "investimento", banco: "DeGiro",       saldo: 8500.00,  cor: "#F59E0B" },
];

const VEICULOS_DATA = [
  {
    marca: "Volkswagen", modelo: "Golf 1.0 TSI",
    matricula: "AA-12-BB", ano: 2019, combustivel: "gasolina",
    quilometros: 62400, ultima_inspecao: "2023-04-15", proxima_inspecao: "2025-04-15",
    seguro_validade: nextMonthlyDate(30, 2), seguro_empresa: "Fidelidade",
    notas: "Revisão feita em Março 2024. Pastilhas travões substituídas.",
  },
  {
    marca: "Renault", modelo: "Clio E-Tech Hybrid",
    matricula: "CC-34-DD", ano: 2022, combustivel: "hibrido",
    quilometros: 28100, ultima_inspecao: "2024-01-10", proxima_inspecao: "2026-01-10",
    seguro_validade: nextMonthlyDate(15, 4), seguro_empresa: "Tranquilidade",
    notas: "Ainda em garantia até 2025.",
  },
];

const PRAZOS_DATA = [
  // Faturas recorrentes
  { descricao: "Renda de Casa",          valor: 850.00,  data_vencimento: nextMonthlyDate(1,  1), recorrente: true,  pago: false, categoria: "Habitação" },
  { descricao: "Seguro Habitação",       valor: 32.50,   data_vencimento: nextMonthlyDate(5,  1), recorrente: true,  pago: false, categoria: "Seguros" },
  { descricao: "Seguro Saúde Família",   valor: 78.00,   data_vencimento: nextMonthlyDate(8,  1), recorrente: true,  pago: false, categoria: "Seguros" },
  { descricao: "NOS — Internet + TV",    valor: 49.99,   data_vencimento: nextMonthlyDate(12, 1), recorrente: true,  pago: false, categoria: "Telecomunicações" },
  { descricao: "MEO Telemóvel",          valor: 22.99,   data_vencimento: nextMonthlyDate(15, 1), recorrente: true,  pago: false, categoria: "Telecomunicações" },
  { descricao: "Ginásio Holmes Place",   valor: 39.90,   data_vencimento: nextMonthlyDate(1,  1), recorrente: true,  pago: false, categoria: "Saúde" },
  { descricao: "Spotify Família",        valor: 16.99,   data_vencimento: nextMonthlyDate(20, 1), recorrente: true,  pago: false, categoria: "Lazer" },
  { descricao: "Netflix",                valor: 17.99,   data_vencimento: nextMonthlyDate(22, 1), recorrente: true,  pago: false, categoria: "Lazer" },
  { descricao: "Seguro Auto Golf",       valor: 52.30,   data_vencimento: nextMonthlyDate(28, 2), recorrente: true,  pago: false, categoria: "Seguros" },
  { descricao: "Seguro Auto Clio",       valor: 44.80,   data_vencimento: nextMonthlyDate(15, 4), recorrente: true,  pago: false, categoria: "Seguros" },
  // Já pagos este mês
  { descricao: "Água (EPAL)",            valor: 18.40,   data_vencimento: nextMonthlyDate(10, 0), recorrente: true,  pago: true,  categoria: "Habitação" },
  { descricao: "Eletricidade (EDP)",     valor: 67.20,   data_vencimento: nextMonthlyDate(7,  0), recorrente: true,  pago: true,  categoria: "Habitação" },
  { descricao: "Condomínio",             valor: 55.00,   data_vencimento: nextMonthlyDate(2,  0), recorrente: true,  pago: true,  categoria: "Habitação" },
  // Próximos não recorrentes
  { descricao: "Inspeção Automóvel Golf",valor: 35.00,   data_vencimento: "2025-04-15",           recorrente: false, pago: false, categoria: "Transportes" },
  { descricao: "Renovação Carta Verde",  valor: 14.50,   data_vencimento: nextMonthlyDate(1,  3), recorrente: false, pago: false, categoria: "Seguros" },
  { descricao: "IRS — Pagamento",        valor: 320.00,  data_vencimento: "2024-08-31",           recorrente: false, pago: true,  categoria: "Outros" },
];

const POUPANCAS_DATA = [
  { nome: "Fundo de Emergência",   valor_objetivo: 15000, valor_atual:  9800,  data_objetivo: "2025-12-31", descricao: "6 meses de despesas. Prioridade máxima." },
  { nome: "Férias Verão 2025",     valor_objetivo:  3500, valor_atual:  2100,  data_objetivo: "2025-06-01", descricao: "Algarve, 2 semanas. Incluir voos + alojamento." },
  { nome: "Portátil Novo",         valor_objetivo:  1200, valor_atual:   750,  data_objetivo: "2025-03-01", descricao: "MacBook Air M3. Trabalho + pessoal." },
  { nome: "Carro Elétrico",        valor_objetivo: 8000,  valor_atual:  1500,  data_objetivo: "2027-01-01", descricao: "Entrada para leasing de carro elétrico." },
  { nome: "Obras Casa de Banho",   valor_objetivo:  5500, valor_atual:  3200,  data_objetivo: "2025-09-01", descricao: "Remodelação completa — orçamento recebido." },
  { nome: "Fundo Educação Filhos", valor_objetivo: 20000, valor_atual:  4300,  data_objetivo: "2030-09-01", descricao: "Universidade / formação futura." },
];

// ─── Transações — gerador ────────────────────────────────────────────────────

function gerarTransacoes(catMap, contaIds) {
  const transacoes = [];

  // Salários fixos — últimos 6 meses
  for (let m = 0; m < 6; m++) {
    const d = new Date();
    d.setMonth(d.getMonth() - m);
    d.setDate(25);
    transacoes.push({
      descricao: "Salário — Gonçalo",
      valor: fmt(2450 + rand(-50, 50)),
      tipo: "receita",
      data: d.toISOString().split("T")[0],
      categoria_id: catMap["Salário"],
      conta_id: pick(contaIds),
      notas: `Ordenado ${d.toLocaleString("pt-PT", { month: "long" })}`,
    });
    const d2 = new Date(d);
    d2.setDate(26);
    transacoes.push({
      descricao: "Salário — Ana",
      valor: fmt(1980 + rand(-30, 30)),
      tipo: "receita",
      data: d2.toISOString().split("T")[0],
      categoria_id: catMap["Salário"],
      conta_id: pick(contaIds),
      notas: `Ordenado ${d2.toLocaleString("pt-PT", { month: "long" })}`,
    });
  }

  // Rendas recebidas (apartamento alugado)
  for (let m = 0; m < 6; m++) {
    const d = new Date();
    d.setMonth(d.getMonth() - m);
    d.setDate(1);
    transacoes.push({
      descricao: "Renda Apto. Setúbal",
      valor: 620,
      tipo: "receita",
      data: d.toISOString().split("T")[0],
      categoria_id: catMap["Rendas"],
      conta_id: pick(contaIds),
      notas: "Transferência do inquilino",
    });
  }

  // Freelance esporádico
  const freelances = [
    ["Projeto Web — Cliente A", 800],
    ["Consultoria Marketing Digital", 350],
    ["Logótipo + Branding", 450],
    ["Reparação Computador Vizinho", 80],
    ["Formação Excel — Empresa",  300],
  ];
  freelances.forEach(([desc, val]) => {
    transacoes.push({
      descricao: desc,
      valor: fmt(val + rand(-20, 20)),
      tipo: "receita",
      data: randomDate(150),
      categoria_id: catMap["Freelance"],
      conta_id: pick(contaIds),
      notas: "",
    });
  });

  // Supermercado — semanal
  const supermercados = ["Continente", "Pingo Doce", "Lidl", "Aldi", "Mercadona"];
  for (let i = 0; i < 26; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    transacoes.push({
      descricao: `Compras — ${pick(supermercados)}`,
      valor: fmt(rand(55, 160)),
      tipo: "despesa",
      data: d.toISOString().split("T")[0],
      categoria_id: pick([catMap["Supermercado"], catMap["Alimentação"]]),
      conta_id: pick(contaIds),
      notas: "",
    });
  }

  // Restaurantes — quinzenal
  const restaurantes = [
    "Restaurante Tasca do João",
    "McDonald's",
    "Nando's",
    "Pasta & Basta",
    "Sushi Porto",
    "Tasco da Avó",
    "Pizzeria Italiana",
    "Hamburguer do Bairro",
  ];
  for (let i = 0; i < 14; i++) {
    transacoes.push({
      descricao: pick(restaurantes),
      valor: fmt(rand(12, 85)),
      tipo: "despesa",
      data: randomDate(180),
      categoria_id: catMap["Restaurantes"],
      conta_id: pick(contaIds),
      notas: "",
    });
  }

  // Combustível — mensal
  for (let m = 0; m < 6; m++) {
    for (let n = 0; n < randInt(2, 4); n++) {
      const d = new Date();
      d.setMonth(d.getMonth() - m);
      d.setDate(randInt(1, 28));
      transacoes.push({
        descricao: "Combustível — " + pick(["BP", "Galp", "Repsol", "Prio"]),
        valor: fmt(rand(45, 80)),
        tipo: "despesa",
        data: d.toISOString().split("T")[0],
        categoria_id: catMap["Combustível"],
        conta_id: pick(contaIds),
        notas: "",
      });
    }
  }

  // Telecomunicações — mensal
  for (let m = 0; m < 6; m++) {
    const d = new Date();
    d.setMonth(d.getMonth() - m);
    d.setDate(12);
    transacoes.push({
      descricao: "NOS — Internet + TV",
      valor: 49.99,
      tipo: "despesa",
      data: d.toISOString().split("T")[0],
      categoria_id: catMap["Telecomunicações"],
      conta_id: pick(contaIds),
    });
    const d2 = new Date(d); d2.setDate(15);
    transacoes.push({
      descricao: "MEO Telemóvel",
      valor: 22.99,
      tipo: "despesa",
      data: d2.toISOString().split("T")[0],
      categoria_id: catMap["Telecomunicações"],
      conta_id: pick(contaIds),
    });
  }

  // Habitação
  for (let m = 0; m < 6; m++) {
    const d = new Date();
    d.setMonth(d.getMonth() - m);
    d.setDate(1);
    transacoes.push({
      descricao: "Renda de Casa",
      valor: 850,
      tipo: "despesa",
      data: d.toISOString().split("T")[0],
      categoria_id: catMap["Habitação"],
      conta_id: pick(contaIds),
    });
    const d2 = new Date(d); d2.setDate(7);
    transacoes.push({
      descricao: "Eletricidade — EDP",
      valor: fmt(rand(55, 90)),
      tipo: "despesa",
      data: d2.toISOString().split("T")[0],
      categoria_id: catMap["Habitação"],
      conta_id: pick(contaIds),
    });
    const d3 = new Date(d); d3.setDate(10);
    transacoes.push({
      descricao: "Água — EPAL",
      valor: fmt(rand(14, 25)),
      tipo: "despesa",
      data: d3.toISOString().split("T")[0],
      categoria_id: catMap["Habitação"],
      conta_id: pick(contaIds),
    });
    const d4 = new Date(d); d4.setDate(2);
    transacoes.push({
      descricao: "Condomínio",
      valor: 55,
      tipo: "despesa",
      data: d4.toISOString().split("T")[0],
      categoria_id: catMap["Habitação"],
      conta_id: pick(contaIds),
    });
  }

  // Saúde
  const saude = [
    ["Farmácia Saúde+", rand(8, 45)],
    ["Consulta Clínica Geral", 25],
    ["Dentista — Limpeza", 60],
    ["Consulta Pediatra", 30],
    ["Análises Clínicas", 18.5],
    ["Ginásio Holmes Place", 39.9],
    ["Fisioterapia", 35],
    ["Óculos — Lentes novas", 120],
  ];
  saude.forEach(([desc, val]) => {
    transacoes.push({
      descricao: desc,
      valor: fmt(val),
      tipo: "despesa",
      data: randomDate(180),
      categoria_id: catMap["Saúde"],
      conta_id: pick(contaIds),
    });
  });

  // Educação
  const educacao = [
    ["Livros Escolares", 85],
    ["Propinas Universidade", 630],
    ["Curso Online — Udemy", 14.99],
    ["Material Escolar", 42],
    ["Explicações — Matemática", 80],
    ["Livros — FNAC", 38],
  ];
  educacao.forEach(([desc, val]) => {
    transacoes.push({
      descricao: desc,
      valor: fmt(val),
      tipo: "despesa",
      data: randomDate(180),
      categoria_id: catMap["Educação"],
      conta_id: pick(contaIds),
    });
  });

  // Lazer
  const lazer = [
    ["Cinema NOS", rand(8, 25)],
    ["Concerto — Música ao Vivo", rand(25, 60)],
    ["Bowling com Amigos", rand(15, 30)],
    ["Bilhetes Futebol — SLB", 25],
    ["Parque Aquático", 55],
    ["Escape Room Lisboa", 48],
    ["Viagem Lisboa — Comboio", 22.5],
    ["Airbnb — FDS Sintra", 130],
    ["Museu Nacional", 8],
    ["Paintball", 35],
    ["Netflix", 17.99],
    ["Spotify Família", 16.99],
    ["Zona de Jogos Kids", 12],
  ];
  lazer.forEach(([desc, val]) => {
    transacoes.push({
      descricao: desc,
      valor: fmt(val),
      tipo: "despesa",
      data: randomDate(180),
      categoria_id: catMap["Lazer"],
      conta_id: pick(contaIds),
    });
  });

  // Vestuário
  const vestuario = [
    ["Zara — Roupa Inverno", rand(60, 150)],
    ["H&M Kids", rand(30, 80)],
    ["Salsa Jeans", rand(40, 90)],
    ["Decathlon — Equipamento Desporto", rand(35, 120)],
    ["Sapataria Foreva", rand(40, 110)],
    ["Cortefiel — Casaco", rand(80, 200)],
  ];
  vestuario.forEach(([desc, val]) => {
    transacoes.push({
      descricao: desc,
      valor: fmt(val),
      tipo: "despesa",
      data: randomDate(180),
      categoria_id: catMap["Vestuário"],
      conta_id: pick(contaIds),
    });
  });

  // Transportes públicos
  for (let i = 0; i < 6; i++) {
    transacoes.push({
      descricao: "Passe Andante / Navegante",
      valor: 40,
      tipo: "despesa",
      data: randomDate(180),
      categoria_id: catMap["Transportes"],
      conta_id: pick(contaIds),
    });
  }
  ["Uber Lisboa → Aeroporto", "Bolt Centro", "Táxi FDS"].forEach((desc) => {
    transacoes.push({
      descricao: desc,
      valor: fmt(rand(8, 35)),
      tipo: "despesa",
      data: randomDate(120),
      categoria_id: catMap["Transportes"],
      conta_id: pick(contaIds),
    });
  });

  // Higiene & Beleza
  ["Cabeleireiro", "El Corte Inglés — Perfumaria", "Farmácia Higiene", "Waxing Studio", "Barbeiro"].forEach((desc) => {
    transacoes.push({
      descricao: desc,
      valor: fmt(rand(10, 70)),
      tipo: "despesa",
      data: randomDate(150),
      categoria_id: catMap["Higiene & Beleza"],
      conta_id: pick(contaIds),
    });
  });

  // Animais
  ["Ração Pedigree — 15kg", "Veterinário — Consulta", "Pet Shop — Brinquedos", "Vacinas Anuais"].forEach((desc) => {
    transacoes.push({
      descricao: desc,
      valor: fmt(rand(15, 80)),
      tipo: "despesa",
      data: randomDate(180),
      categoria_id: catMap["Animais"],
      conta_id: pick(contaIds),
    });
  });

  // Seguros
  for (let m = 0; m < 6; m++) {
    const d = new Date();
    d.setMonth(d.getMonth() - m);
    d.setDate(5);
    transacoes.push({
      descricao: "Seguro Habitação",
      valor: 32.5,
      tipo: "despesa",
      data: d.toISOString().split("T")[0],
      categoria_id: catMap["Seguros"],
      conta_id: pick(contaIds),
    });
    const d2 = new Date(d); d2.setDate(8);
    transacoes.push({
      descricao: "Seguro Saúde Família",
      valor: 78,
      tipo: "despesa",
      data: d2.toISOString().split("T")[0],
      categoria_id: catMap["Seguros"],
      conta_id: pick(contaIds),
    });
  }

  // Poupança/Investimento
  for (let m = 0; m < 6; m++) {
    const d = new Date();
    d.setMonth(d.getMonth() - m);
    d.setDate(27);
    transacoes.push({
      descricao: "Transferência Poupança",
      valor: 300,
      tipo: "despesa",
      data: d.toISOString().split("T")[0],
      categoria_id: catMap["Poupança/Invest."],
      conta_id: pick(contaIds),
      notas: "Poupança mensal programada",
    });
  }

  // Dividendos
  transacoes.push({
    descricao: "Dividendos ETF VWCE",
    valor: 142.30,
    tipo: "receita",
    data: randomDate(90),
    categoria_id: catMap["Dividendos"],
    conta_id: pick(contaIds),
  });
  transacoes.push({
    descricao: "Juros Conta Poupança",
    valor: 38.60,
    tipo: "receita",
    data: randomDate(60),
    categoria_id: catMap["Dividendos"],
    conta_id: pick(contaIds),
  });

  return transacoes;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("🗑️  A limpar dados existentes...");
    // Ordem inversa de dependências
    await client.query("DELETE FROM convites");
    await client.query("DELETE FROM membros_agregado");
    await client.query("DELETE FROM orcamentos");
    await client.query("DELETE FROM prazos");
    await client.query("DELETE FROM metas_poupanca");
    await client.query("DELETE FROM veiculos");
    await client.query("DELETE FROM transacoes");
    await client.query("DELETE FROM contas");
    await client.query("DELETE FROM categorias");
    await client.query("DELETE FROM utilizadores");
    await client.query("DELETE FROM agregados");

    // ── Agregado ─────────────────────────────────────────────────────────
    console.log("👨‍👩‍👧  A criar agregado familiar...");
    const { rows: [agregado] } = await client.query(
      `INSERT INTO agregados (nome) VALUES ($1) RETURNING id`,
      ["Família Silva Correia"]
    );
    const agregadoId = agregado.id;

    // ── Utilizadores ──────────────────────────────────────────────────────
    console.log("👤 A criar utilizadores...");
    const utilizadores = [
      { nome: "Gonçalo Silva",   email: "goncalo@example.com", senha: "password123", papel: "admin"  },
      { nome: "Ana Correia",     email: "ana@example.com",     senha: "password123", papel: "membro" },
      { nome: "Pedro Silva",     email: "pedro@example.com",   senha: "password123", papel: "membro" },
    ];

    const userIds = [];
    for (const u of utilizadores) {
      const hash = await bcrypt.hash(u.senha, 10);
      const { rows: [user] } = await client.query(
        `INSERT INTO utilizadores (nome, email, senha, agregado_id) VALUES ($1,$2,$3,$4) RETURNING id`,
        [u.nome, u.email, hash, agregadoId]
      );
      await client.query(
        `INSERT INTO membros_agregado (agregado_id, utilizador_id, papel) VALUES ($1,$2,$3)`,
        [agregadoId, user.id, u.papel]
      );
      userIds.push(user.id);
    }

    // ── Categorias ────────────────────────────────────────────────────────
    console.log("🏷️  A criar categorias...");
    const catMap = {};
    for (const cat of CATEGORIAS) {
      const { rows: [c] } = await client.query(
        `INSERT INTO categorias (nome, tipo, icone, cor, agregado_id) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [cat.nome, cat.tipo, cat.icone, cat.cor, agregadoId]
      );
      catMap[cat.nome] = c.id;
    }

    // ── Contas ────────────────────────────────────────────────────────────
    console.log("🏦 A criar contas bancárias...");
    const contaIds = [];
    for (const conta of CONTAS) {
      const { rows: [c] } = await client.query(
        `INSERT INTO contas (nome, tipo, banco, saldo, cor, agregado_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [conta.nome, conta.tipo, conta.banco, conta.saldo, conta.cor, agregadoId]
      );
      contaIds.push(c.id);
    }

    // ── Veículos ──────────────────────────────────────────────────────────
    console.log("🚗 A criar veículos...");
    for (const v of VEICULOS_DATA) {
      await client.query(
        `INSERT INTO veiculos
          (marca, modelo, matricula, ano, combustivel, quilometros,
           ultima_inspecao, proxima_inspecao, seguro_validade, seguro_empresa, notas, agregado_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [v.marca, v.modelo, v.matricula, v.ano, v.combustivel, v.quilometros,
         v.ultima_inspecao, v.proxima_inspecao, v.seguro_validade, v.seguro_empresa, v.notas, agregadoId]
      );
    }

    // ── Prazos ────────────────────────────────────────────────────────────
    console.log("📅 A criar prazos/faturas...");
    for (const p of PRAZOS_DATA) {
      await client.query(
        `INSERT INTO prazos
          (descricao, valor, data_vencimento, recorrente, pago, categoria_id, agregado_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [p.descricao, p.valor, p.data_vencimento, p.recorrente, p.pago,
         catMap[p.categoria] || null, agregadoId]
      );
    }

    // ── Metas de Poupança ─────────────────────────────────────────────────
    console.log("💰 A criar metas de poupança...");
    for (const mp of POUPANCAS_DATA) {
      await client.query(
        `INSERT INTO metas_poupanca
          (nome, valor_objetivo, valor_atual, data_objetivo, descricao, agregado_id)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [mp.nome, mp.valor_objetivo, mp.valor_atual, mp.data_objetivo, mp.descricao, agregadoId]
      );
    }

    // ── Transações ────────────────────────────────────────────────────────
    console.log("💸 A gerar transações (pode demorar alguns segundos)...");
    const transacoes = gerarTransacoes(catMap, contaIds);

    for (const t of transacoes) {
      await client.query(
        `INSERT INTO transacoes
          (descricao, valor, tipo, data, categoria_id, conta_id, notas, agregado_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [t.descricao, t.valor, t.tipo, t.data,
         t.categoria_id, t.conta_id, t.notas || null, agregadoId]
      );
    }

    await client.query("COMMIT");

    console.log("\n✅ SEED COMPLETO!\n");
    console.log(`   Agregado:      Família Silva Correia`);
    console.log(`   Utilizadores:  ${utilizadores.length} (admin + 2 membros)`);
    console.log(`   Categorias:    ${CATEGORIAS.length}`);
    console.log(`   Contas:        ${CONTAS.length}`);
    console.log(`   Veículos:      ${VEICULOS_DATA.length}`);
    console.log(`   Prazos:        ${PRAZOS_DATA.length}`);
    console.log(`   Poupanças:     ${POUPANCAS_DATA.length}`);
    console.log(`   Transações:    ~${transacoes.length}`);
    console.log(`\n   Login admin:   goncalo@example.com / password123`);
    console.log(`   Login membro:  ana@example.com / password123`);
    console.log(`   Login membro:  pedro@example.com / password123\n`);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Erro no seed:", err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();