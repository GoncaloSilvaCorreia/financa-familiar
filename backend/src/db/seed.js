require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const fmt = (n) => parseFloat(n.toFixed(2));

function randomDate(daysBack = 180) {
  const d = new Date(); d.setDate(d.getDate() - randInt(0, daysBack));
  return d.toISOString().split("T")[0];
}
function monthDate(day, offsetMonths = 0) {
  const d = new Date(); d.setMonth(d.getMonth() + offsetMonths); d.setDate(day);
  return d.toISOString().split("T")[0];
}

const CATEGORIAS = [
  { nome: "Habitacao",        tipo: "gasto",   icone: "🏠", cor: "#EF4444" },
  { nome: "Alimentacao",      tipo: "gasto",   icone: "🛒", cor: "#F97316" },
  { nome: "Transportes",      tipo: "gasto",   icone: "🚗", cor: "#EAB308" },
  { nome: "Saude",            tipo: "gasto",   icone: "💊", cor: "#EC4899" },
  { nome: "Educacao",         tipo: "gasto",   icone: "📚", cor: "#8B5CF6" },
  { nome: "Lazer",            tipo: "gasto",   icone: "🎬", cor: "#06B6D4" },
  { nome: "Vestuario",        tipo: "gasto",   icone: "👕", cor: "#84CC16" },
  { nome: "Telecomunicacoes", tipo: "gasto",   icone: "📱", cor: "#14B8A6" },
  { nome: "Seguros",          tipo: "gasto",   icone: "🛡️", cor: "#6366F1" },
  { nome: "Restaurantes",     tipo: "gasto",   icone: "🍽️", cor: "#F43F5E" },
  { nome: "Supermercado",     tipo: "gasto",   icone: "🏪", cor: "#FB923C" },
  { nome: "Combustivel",      tipo: "gasto",   icone: "⛽", cor: "#FBBF24" },
  { nome: "Higiene e Beleza", tipo: "gasto",   icone: "🧴", cor: "#A78BFA" },
  { nome: "Animais",          tipo: "gasto",   icone: "🐾", cor: "#34D399" },
  { nome: "Poupanca",         tipo: "poupanca",icone: "💰", cor: "#10B981" },
  { nome: "Salario",          tipo: "receita", icone: "💼", cor: "#22C55E" },
  { nome: "Freelance",        tipo: "receita", icone: "💻", cor: "#3B82F6" },
  { nome: "Rendas",           tipo: "receita", icone: "🏢", cor: "#0EA5E9" },
  { nome: "Dividendos",       tipo: "receita", icone: "📈", cor: "#10B981" },
  { nome: "Outros",           tipo: "receita", icone: "🎁", cor: "#6B7280" },
];

const CONTAS = [
  { nome: "Conta Ordenado",    tipo: "conta_corrente", saldo: 3240.55,  cor: "#3B82F6", icone: "🏦" },
  { nome: "Conta Poupanca",    tipo: "poupanca",       saldo: 12800.00, cor: "#10B981", icone: "💰" },
  { nome: "Conta Conjunta",    tipo: "conta_corrente", saldo: 870.20,   cor: "#8B5CF6", icone: "👥" },
  { nome: "Cartao de Credito", tipo: "cartao_credito", saldo: -450.30,  cor: "#EF4444", icone: "💳" },
  { nome: "Dinheiro",          tipo: "dinheiro",       saldo: 320.00,   cor: "#F59E0B", icone: "💵" },
];

const PRAZOS_DATA = [
  { nome: "Renda de Casa",        tipo: "fatura",  valor_estimado: 850.00, data_vencimento: monthDate(1,1),  recorrente: true,  recorrencia_meses: 1,  pago: false },
  { nome: "Seguro Habitacao",     tipo: "seguro",  valor_estimado: 32.50,  data_vencimento: monthDate(5,1),  recorrente: true,  recorrencia_meses: 1,  pago: false },
  { nome: "Seguro Saude Familia", tipo: "seguro",  valor_estimado: 78.00,  data_vencimento: monthDate(8,1),  recorrente: true,  recorrencia_meses: 1,  pago: false },
  { nome: "NOS Internet e TV",    tipo: "fatura",  valor_estimado: 49.99,  data_vencimento: monthDate(12,1), recorrente: true,  recorrencia_meses: 1,  pago: false },
  { nome: "MEO Telemovel",        tipo: "fatura",  valor_estimado: 22.99,  data_vencimento: monthDate(15,1), recorrente: true,  recorrencia_meses: 1,  pago: false },
  { nome: "Ginasio Holmes Place", tipo: "fatura",  valor_estimado: 39.90,  data_vencimento: monthDate(1,1),  recorrente: true,  recorrencia_meses: 1,  pago: false },
  { nome: "Spotify Familia",      tipo: "fatura",  valor_estimado: 16.99,  data_vencimento: monthDate(20,1), recorrente: true,  recorrencia_meses: 1,  pago: false },
  { nome: "Netflix",              tipo: "fatura",  valor_estimado: 17.99,  data_vencimento: monthDate(22,1), recorrente: true,  recorrencia_meses: 1,  pago: false },
  { nome: "Agua EPAL",            tipo: "fatura",  valor_estimado: 18.40,  data_vencimento: monthDate(10,0), recorrente: true,  recorrencia_meses: 1,  pago: true  },
  { nome: "Eletricidade EDP",     tipo: "fatura",  valor_estimado: 67.20,  data_vencimento: monthDate(7,0),  recorrente: true,  recorrencia_meses: 1,  pago: true  },
  { nome: "Condominio",           tipo: "fatura",  valor_estimado: 55.00,  data_vencimento: monthDate(2,0),  recorrente: true,  recorrencia_meses: 1,  pago: true  },
  { nome: "IRS Pagamento",        tipo: "irs", valor_estimado: 320.00, data_vencimento: "2024-08-31",    recorrente: false, recorrencia_meses: null,pago: true  },
  { nome: "Renovacao Carta Verde",tipo: "outro",   valor_estimado: 14.50,  data_vencimento: monthDate(1,3),  recorrente: false, recorrencia_meses: null,pago: false },
];

const POUPANCAS_DATA = [
  { nome: "Fundo de Emergencia",   valor_meta: 15000, valor_atual: 9800, data_alvo: "2025-12-31", icone: "🛡️", cor: "#EF4444", descricao: "6 meses de despesas. Prioridade maxima." },
  { nome: "Ferias Verao 2025",     valor_meta:  3500, valor_atual: 2100, data_alvo: "2025-06-01", icone: "🏖️", cor: "#06B6D4", descricao: "Algarve, 2 semanas. Voos + alojamento." },
  { nome: "Portatil Novo",         valor_meta:  1200, valor_atual:  750, data_alvo: "2025-03-01", icone: "💻", cor: "#8B5CF6", descricao: "MacBook Air M3." },
  { nome: "Carro Eletrico",        valor_meta:  8000, valor_atual: 1500, data_alvo: "2027-01-01", icone: "🚗", cor: "#10B981", descricao: "Entrada para leasing de carro eletrico." },
  { nome: "Obras Casa de Banho",   valor_meta:  5500, valor_atual: 3200, data_alvo: "2025-09-01", icone: "🔨", cor: "#F59E0B", descricao: "Remodelacao completa." },
  { nome: "Fundo Educacao Filhos", valor_meta: 20000, valor_atual: 4300, data_alvo: "2030-09-01", icone: "📚", cor: "#3B82F6", descricao: "Universidade e formacao futura." },
];

function gerarTransacoes(catMap, contaIds, userId, agregadoId) {
  const t = [];
  const add = (obj) => t.push({ utilizador_id: userId, agregado_id: agregadoId, notas: null, ...obj });

  for (let m = 0; m < 6; m++) {
    const d1 = new Date(); d1.setMonth(d1.getMonth()-m); d1.setDate(25);
    add({ descricao:"Salario Goncalo", valor:fmt(2450+rand(-50,50)), tipo:"receita", data:d1.toISOString().split("T")[0], categoria_id:catMap["Salario"], conta_id:pick(contaIds) });
    const d2 = new Date(d1); d2.setDate(26);
    add({ descricao:"Salario Ana", valor:fmt(1980+rand(-30,30)), tipo:"receita", data:d2.toISOString().split("T")[0], categoria_id:catMap["Salario"], conta_id:pick(contaIds) });
  }
  for (let m = 0; m < 6; m++) {
    const d = new Date(); d.setMonth(d.getMonth()-m); d.setDate(1);
    add({ descricao:"Renda Apto Setubal", valor:620, tipo:"receita", data:d.toISOString().split("T")[0], categoria_id:catMap["Rendas"], conta_id:pick(contaIds) });
  }
  [["Projeto Web Cliente A",800],["Consultoria Marketing",350],["Logotipo e Branding",450],["Reparacao PC",80],["Formacao Excel",300]].forEach(([desc,val])=>{
    add({ descricao:desc, valor:fmt(val+rand(-20,20)), tipo:"receita", data:randomDate(150), categoria_id:catMap["Freelance"], conta_id:pick(contaIds) });
  });
  add({ descricao:"Dividendos ETF VWCE", valor:142.30, tipo:"receita", data:randomDate(90), categoria_id:catMap["Dividendos"], conta_id:pick(contaIds) });
  add({ descricao:"Juros Conta Poupanca", valor:38.60, tipo:"receita", data:randomDate(60), categoria_id:catMap["Dividendos"], conta_id:pick(contaIds) });

  const supers = ["Continente","Pingo Doce","Lidl","Aldi","Mercadona"];
  for (let i=0;i<26;i++){
    const d=new Date(); d.setDate(d.getDate()-i*7);
    add({ descricao:`Compras ${pick(supers)}`, valor:fmt(rand(55,160)), tipo:"gasto", data:d.toISOString().split("T")[0], categoria_id:pick([catMap["Supermercado"],catMap["Alimentacao"]]), conta_id:pick(contaIds) });
  }
  ["Tasca do Joao","McDonalds","Nandos","Pasta e Basta","Sushi Porto","Tasco da Avo","Pizzeria Italiana","Hamburguer do Bairro","Bifanas do Ze","Marisqueira Central"].forEach(desc=>{
    add({ descricao:desc, valor:fmt(rand(12,85)), tipo:"gasto", data:randomDate(180), categoria_id:catMap["Restaurantes"], conta_id:pick(contaIds) });
  });
  for (let m=0;m<6;m++) for(let n=0;n<randInt(2,4);n++){
    const d=new Date(); d.setMonth(d.getMonth()-m); d.setDate(randInt(1,28));
    add({ descricao:`Combustivel ${pick(["BP","Galp","Repsol","Prio"])}`, valor:fmt(rand(45,80)), tipo:"gasto", data:d.toISOString().split("T")[0], categoria_id:catMap["Combustivel"], conta_id:pick(contaIds) });
  }
  for(let m=0;m<6;m++){
    const d=new Date(); d.setMonth(d.getMonth()-m); d.setDate(12);
    add({ descricao:"NOS Internet e TV", valor:49.99, tipo:"gasto", data:d.toISOString().split("T")[0], categoria_id:catMap["Telecomunicacoes"], conta_id:pick(contaIds) });
    const d2=new Date(d); d2.setDate(15);
    add({ descricao:"MEO Telemovel", valor:22.99, tipo:"gasto", data:d2.toISOString().split("T")[0], categoria_id:catMap["Telecomunicacoes"], conta_id:pick(contaIds) });
  }
  for(let m=0;m<6;m++){
    const d=new Date(); d.setMonth(d.getMonth()-m);
    [[1,"Renda de Casa",850],[7,"Eletricidade EDP",fmt(rand(55,90))],[10,"Agua EPAL",fmt(rand(14,25))],[2,"Condominio",55]].forEach(([day,desc,val])=>{
      const dd=new Date(d); dd.setDate(day);
      add({ descricao:desc, valor:val, tipo:"gasto", data:dd.toISOString().split("T")[0], categoria_id:catMap["Habitacao"], conta_id:pick(contaIds) });
    });
  }
  for(let m=0;m<6;m++){
    const d=new Date(); d.setMonth(d.getMonth()-m);
    [[5,"Seguro Habitacao",32.5],[8,"Seguro Saude Familia",78]].forEach(([day,desc,val])=>{
      const dd=new Date(d); dd.setDate(day);
      add({ descricao:desc, valor:val, tipo:"gasto", data:dd.toISOString().split("T")[0], categoria_id:catMap["Seguros"], conta_id:pick(contaIds) });
    });
  }
  [["Farmacia Saude",rand(8,45)],["Consulta Clinica Geral",25],["Dentista Limpeza",60],["Consulta Pediatra",30],["Analises Clinicas",18.5],["Ginasio Holmes Place",39.9],["Fisioterapia",35],["Oculos Lentes Novas",120]].forEach(([desc,val])=>{
    add({ descricao:desc, valor:fmt(val), tipo:"gasto", data:randomDate(180), categoria_id:catMap["Saude"], conta_id:pick(contaIds) });
  });
  [["Livros Escolares",85],["Propinas Universidade",630],["Curso Online Udemy",14.99],["Material Escolar",42],["Explicacoes Matematica",80],["Livros FNAC",38]].forEach(([desc,val])=>{
    add({ descricao:desc, valor:fmt(val), tipo:"gasto", data:randomDate(180), categoria_id:catMap["Educacao"], conta_id:pick(contaIds) });
  });
  [["Cinema NOS",rand(8,25)],["Concerto Musica ao Vivo",rand(25,60)],["Bowling com Amigos",rand(15,30)],["Bilhetes Futebol SLB",25],["Parque Aquatico",55],["Escape Room Lisboa",48],["Comboio Lisboa",22.5],["Airbnb FDS Sintra",130],["Museu Nacional",8],["Netflix",17.99],["Spotify Familia",16.99]].forEach(([desc,val])=>{
    add({ descricao:desc, valor:fmt(val), tipo:"gasto", data:randomDate(180), categoria_id:catMap["Lazer"], conta_id:pick(contaIds) });
  });
  [["Zara Roupa Inverno",rand(60,150)],["HM Kids",rand(30,80)],["Salsa Jeans",rand(40,90)],["Decathlon Equipamento",rand(35,120)],["Sapataria Foreva",rand(40,110)]].forEach(([desc,val])=>{
    add({ descricao:desc, valor:fmt(val), tipo:"gasto", data:randomDate(180), categoria_id:catMap["Vestuario"], conta_id:pick(contaIds) });
  });
  for(let i=0;i<6;i++) add({ descricao:"Passe Navegante", valor:40, tipo:"gasto", data:randomDate(180), categoria_id:catMap["Transportes"], conta_id:pick(contaIds) });
  [["Uber Lisboa Aeroporto",rand(18,35)],["Bolt Centro",rand(8,15)],["Taxi FDS",rand(12,25)]].forEach(([desc,val])=>{
    add({ descricao:desc, valor:fmt(val), tipo:"gasto", data:randomDate(120), categoria_id:catMap["Transportes"], conta_id:pick(contaIds) });
  });
  [["Cabeleireiro",45],["Perfumaria El Corte Ingles",65],["Farmacia Higiene",22],["Barbeiro",15]].forEach(([desc,val])=>{
    add({ descricao:desc, valor:fmt(val), tipo:"gasto", data:randomDate(150), categoria_id:catMap["Higiene e Beleza"], conta_id:pick(contaIds) });
  });
  [["Racao Pedigree 15kg",38],["Veterinario Consulta",55],["Pet Shop Brinquedos",22],["Vacinas Anuais",75]].forEach(([desc,val])=>{
    add({ descricao:desc, valor:fmt(val), tipo:"gasto", data:randomDate(180), categoria_id:catMap["Animais"], conta_id:pick(contaIds) });
  });
  for(let m=0;m<6;m++){
    const d=new Date(); d.setMonth(d.getMonth()-m); d.setDate(27);
    add({ descricao:"Transferencia Poupanca", valor:300, tipo:"gasto", data:d.toISOString().split("T")[0], categoria_id:catMap["Poupanca"], conta_id:pick(contaIds), notas:"Poupanca mensal programada" });
  }
  return t;
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log("Limpar dados existentes...");
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

    console.log("Criar agregado...");
    const { rows:[ag] } = await client.query("INSERT INTO agregados (nome) VALUES ($1) RETURNING id", ["Familia Silva Correia"]);
    const agregadoId = ag.id;

    console.log("Criar utilizadores...");
    const users = [
      { nome:"Goncalo Silva", email:"goncalo@example.com", senha:"password123", papel:"admin",  iniciais:"GS" },
      { nome:"Ana Correia",   email:"ana@example.com",     senha:"password123", papel:"membro", iniciais:"AC" },
      { nome:"Pedro Silva",   email:"pedro@example.com",   senha:"password123", papel:"membro", iniciais:"PS" },
    ];
    const userIds = [];
    for (const u of users) {
      const hash = await bcrypt.hash(u.senha, 10);
      const { rows:[user] } = await client.query(
        "INSERT INTO utilizadores (nome, email, password_hash, avatar_iniciais) VALUES ($1,$2,$3,$4) RETURNING id",
        [u.nome, u.email, hash, u.iniciais]
      );
      await client.query("INSERT INTO membros_agregado (agregado_id, utilizador_id, papel) VALUES ($1,$2,$3)", [agregadoId, user.id, u.papel]);
      userIds.push(user.id);
    }
    const adminId = userIds[0];

    console.log("Criar categorias...");
    const catMap = {};
    for (const cat of CATEGORIAS) {
      const { rows:[c] } = await client.query(
        "INSERT INTO categorias (nome, tipo, icone, cor, agregado_id, utilizador_id, criado_por) VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING id",
        [cat.nome, cat.tipo, cat.icone, cat.cor, agregadoId, adminId]
      );
      catMap[cat.nome] = c.id;
    }

    console.log("Criar contas...");
    const contaIds = [];
    for (const conta of CONTAS) {
      const { rows:[c] } = await client.query(
        "INSERT INTO contas (nome, tipo, saldo, cor, icone, agregado_id, utilizador_id, criado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING id",
        [conta.nome, conta.tipo, conta.saldo, conta.cor, conta.icone, agregadoId, adminId]
      );
      contaIds.push(c.id);
    }

    console.log("Criar veiculos...");
    const veiculosData = [
      { nome:"VW Golf 1.0 TSI",       marca:"Volkswagen", modelo:"Golf 1.0 TSI",      matricula:"AA-12-BB", ano:2019, combustivel:"gasolina", inspecao_vencimento:"2025-04-15", seguro_vencimento:monthDate(30,2) },
      { nome:"Renault Clio E-Tech",    marca:"Renault",    modelo:"Clio E-Tech Hybrid", matricula:"CC-34-DD", ano:2022, combustivel:"hibrido",  inspecao_vencimento:"2026-01-10", seguro_vencimento:monthDate(15,4) },
    ];
    const veiculoIds = [];
    for (const v of veiculosData) {
      const { rows:[ve] } = await client.query(
        "INSERT INTO veiculos (nome, marca, modelo, matricula, ano, combustivel, inspecao_vencimento, seguro_vencimento, agregado_id, utilizador_id, criado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING id",
        [v.nome, v.marca, v.modelo, v.matricula, v.ano, v.combustivel, v.inspecao_vencimento, v.seguro_vencimento, agregadoId, adminId]
      );
      veiculoIds.push(ve.id);
    }

    console.log("Criar prazos...");
    for (const p of PRAZOS_DATA) {
      await client.query(
        "INSERT INTO prazos (nome, tipo, valor_estimado, data_vencimento, recorrente, recorrencia_meses, pago, agregado_id, utilizador_id, criado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)",
        [p.nome, p.tipo, p.valor_estimado, p.data_vencimento, p.recorrente, p.recorrencia_meses, p.pago, agregadoId, adminId]
      );
    }
    const prazoVeiculos = [
      { nome:"Inspecao Golf",      tipo:"inspecao", valor_estimado:35,    data_vencimento:"2025-04-15",    recorrente:false, pago:false, veiculo_id:veiculoIds[0] },
      { nome:"Seguro Golf",        tipo:"seguro",   valor_estimado:52.30, data_vencimento:monthDate(28,2), recorrente:true,  pago:false, veiculo_id:veiculoIds[0] },
      { nome:"Seguro Clio Hybrid", tipo:"seguro",   valor_estimado:44.80, data_vencimento:monthDate(15,4), recorrente:true,  pago:false, veiculo_id:veiculoIds[1] },
    ];
    for (const p of prazoVeiculos) {
      await client.query(
        "INSERT INTO prazos (nome, tipo, valor_estimado, data_vencimento, recorrente, pago, veiculo_id, agregado_id, utilizador_id, criado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)",
        [p.nome, p.tipo, p.valor_estimado, p.data_vencimento, p.recorrente, p.pago, p.veiculo_id, agregadoId, adminId]
      );
    }

    console.log("Criar poupancas...");
    for (const mp of POUPANCAS_DATA) {
      await client.query(
        "INSERT INTO metas_poupanca (nome, descricao, valor_meta, valor_atual, data_alvo, icone, cor, agregado_id, utilizador_id, criado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)",
        [mp.nome, mp.descricao, mp.valor_meta, mp.valor_atual, mp.data_alvo, mp.icone, mp.cor, agregadoId, adminId]
      );
    }

    console.log("Gerar transacoes...");
    const transacoes = gerarTransacoes(catMap, contaIds, adminId, agregadoId);
    for (const t of transacoes) {
      await client.query(
        "INSERT INTO transacoes (descricao, valor, tipo, data, categoria_id, conta_id, notas, agregado_id, utilizador_id, criado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)",
        [t.descricao, t.valor, t.tipo, t.data, t.categoria_id, t.conta_id, t.notas||null, t.agregado_id, t.utilizador_id]
      );
    }

    await client.query("COMMIT");
    console.log("\nSEED COMPLETO!");
    console.log("Categorias: " + CATEGORIAS.length);
    console.log("Contas: " + CONTAS.length);
    console.log("Veiculos: " + veiculosData.length);
    console.log("Prazos: " + (PRAZOS_DATA.length + prazoVeiculos.length));
    console.log("Poupancas: " + POUPANCAS_DATA.length);
    console.log("Transacoes: ~" + transacoes.length);
    console.log("\nLogin admin:  goncalo@example.com / password123");
    console.log("Login membro: ana@example.com / password123");
    console.log("Login membro: pedro@example.com / password123");
  } catch(err) {
    await client.query("ROLLBACK");
    console.error("Erro:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();