const db = require('./index');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function seed() {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');
    console.log('🌱 A inserir dados de exemplo...');

    // Utilizador de demo
    const passwordHash = await bcrypt.hash('demo1234', 12);
    const { rows: [user] } = await client.query(`
      INSERT INTO utilizadores (nome, email, password_hash, avatar_iniciais)
      VALUES ('João Ferreira', 'demo@financa.pt', $1, 'JF')
      ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome
      RETURNING id
    `, [passwordHash]);
    const userId = user.id;

    // Categorias padrão
    const categorias = [
      { nome: 'Alimentação',   icone: '🛒', cor: '#3B8BD4', tipo: 'gasto' },
      { nome: 'Habitação',     icone: '🏠', cor: '#1D9E75', tipo: 'gasto' },
      { nome: 'Transportes',   icone: '🚗', cor: '#EF9F27', tipo: 'gasto' },
      { nome: 'Saúde',         icone: '💊', cor: '#D85A30', tipo: 'gasto' },
      { nome: 'Lazer',         icone: '🎬', cor: '#7F77DD', tipo: 'gasto' },
      { nome: 'Eletricidade',  icone: '⚡', cor: '#E2B53F', tipo: 'gasto' },
      { nome: 'Água',          icone: '💧', cor: '#3B8BD4', tipo: 'gasto' },
      { nome: 'Internet/TV',   icone: '📡', cor: '#5DCAA5', tipo: 'gasto' },
      { nome: 'Vestuário',     icone: '👕', cor: '#D4537E', tipo: 'gasto' },
      { nome: 'Educação',      icone: '📚', cor: '#534AB7', tipo: 'gasto' },
      { nome: 'Poupança',      icone: '🐷', cor: '#1D9E75', tipo: 'poupanca' },
      { nome: 'Salário',       icone: '💼', cor: '#1D9E75', tipo: 'receita' },
      { nome: 'Extra',         icone: '💰', cor: '#3B8BD4', tipo: 'receita' },
    ];

    const catIds = {};
    for (const cat of categorias) {
      const { rows: [c] } = await client.query(`
        INSERT INTO categorias (utilizador_id, nome, icone, cor, tipo)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
        RETURNING id, nome
      `, [userId, cat.nome, cat.icone, cat.cor, cat.tipo]);
      if (c) catIds[c.nome] = c.id;
    }

    // Conta bancária
    const { rows: [conta] } = await client.query(`
      INSERT INTO contas (utilizador_id, nome, tipo, saldo, cor)
      VALUES ($1, 'Conta Principal', 'conta_corrente', 8420.00, '#3B8BD4')
      RETURNING id
    `, [userId]);
    const contaId = conta.id;

    // Conta poupança
    await client.query(`
      INSERT INTO contas (utilizador_id, nome, tipo, saldo, cor)
      VALUES ($1, 'Poupança', 'poupanca', 3100.00, '#1D9E75')
    `, [userId]);

    // Transações dos últimos meses
    const transacoes = [
      { desc: 'Salário junho',       valor: 1850.00, tipo: 'receita',      cat: 'Salário',       data: '2026-06-05' },
      { desc: 'Continente',          valor: -89.50,  tipo: 'gasto',        cat: 'Alimentação',   data: '2026-06-01' },
      { desc: 'EDP — Eletricidade',  valor: -68.40,  tipo: 'gasto',        cat: 'Eletricidade',  data: '2026-06-02' },
      { desc: 'EPAL — Água',         valor: -24.80,  tipo: 'gasto',        cat: 'Água',          data: '2026-06-03' },
      { desc: 'Galp — abastecimento',valor: -55.00,  tipo: 'gasto',        cat: 'Transportes',   data: '2026-06-04' },
      { desc: 'Farmácia Central',    valor: -12.30,  tipo: 'gasto',        cat: 'Saúde',         data: '2026-06-06' },
      { desc: 'NOS — Internet/TV',   valor: -49.99,  tipo: 'gasto',        cat: 'Internet/TV',   data: '2026-06-07' },
      { desc: 'Lidl',                valor: -62.30,  tipo: 'gasto',        cat: 'Alimentação',   data: '2026-06-09' },
      { desc: 'Cinema',              valor: -18.00,  tipo: 'gasto',        cat: 'Lazer',         data: '2026-06-10' },
      { desc: 'Transferência poupança', valor: -200, tipo: 'transferencia', cat: 'Poupança',     data: '2026-06-01' },
      // Maio
      { desc: 'Salário maio',        valor: 1850.00, tipo: 'receita',      cat: 'Salário',       data: '2026-05-05' },
      { desc: 'Pingo Doce',          valor: -75.20,  tipo: 'gasto',        cat: 'Alimentação',   data: '2026-05-08' },
      { desc: 'EDP — Eletricidade',  valor: -71.20,  tipo: 'gasto',        cat: 'Eletricidade',  data: '2026-05-03' },
      { desc: 'Galp',                valor: -50.00,  tipo: 'gasto',        cat: 'Transportes',   data: '2026-05-15' },
      { desc: 'Médico de família',   valor: -0.00,   tipo: 'gasto',        cat: 'Saúde',         data: '2026-05-20' },
    ];

    for (const t of transacoes) {
      const catId = catIds[t.cat] || null;
      await client.query(`
        INSERT INTO transacoes (utilizador_id, conta_id, categoria_id, descricao, valor, tipo, data)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, contaId, catId, t.desc, Math.abs(t.valor), t.tipo, t.data]);
    }

    // Veículo
    const { rows: [veiculo] } = await client.query(`
      INSERT INTO veiculos (utilizador_id, nome, matricula, marca, modelo, ano, combustivel, iuc_valor, iuc_mes_vencimento, inspecao_vencimento)
      VALUES ($1, 'Renault Clio', '00-AA-00', 'Renault', 'Clio', 2018, 'Gasolina', 280.00, 6, '2027-03-01')
      RETURNING id
    `, [userId]);

    // Prazos fiscais
    await client.query(`
      INSERT INTO prazos (utilizador_id, nome, tipo, data_vencimento, valor_estimado, recorrente, recorrencia_meses, veiculo_id)
      VALUES
        ($1, 'IUC — Renault Clio', 'iuc', '2026-06-19', 280.00, true, 12, $2),
        ($1, 'IMI — 1.ª prestação', 'imi', '2026-07-31', 340.00, true, 12, NULL),
        ($1, 'IRS 2025 — entrega', 'irs', '2026-06-30', NULL, true, 12, NULL),
        ($1, 'Seguro habitação', 'seguro', '2026-09-15', 180.00, true, 12, NULL)
    `, [userId, veiculo.id]);

    // Meta de poupança
    await client.query(`
      INSERT INTO metas_poupanca (utilizador_id, nome, descricao, valor_meta, valor_atual, data_alvo, icone, cor)
      VALUES
        ($1, 'Férias de verão', 'Viagem a Itália em agosto', 2000.00, 850.00, '2026-08-01', '✈️', '#3B8BD4'),
        ($1, 'Fundo de emergência', '3 meses de despesas', 5000.00, 3100.00, '2026-12-31', '🛡️', '#1D9E75'),
        ($1, 'Carro novo', 'Substituição do Clio em 2028', 8000.00, 1200.00, '2028-01-01', '🚗', '#EF9F27')
    `, [userId]);

    await client.query('COMMIT');
    console.log('✅ Dados de exemplo inseridos com sucesso!');
    console.log('');
    console.log('📧 Email de login: demo@financa.pt');
    console.log('🔑 Password: demo1234');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro no seed:', err);
    throw err;
  } finally {
    client.release();
    await db.pool.end();
  }
}

seed().catch(console.error);
