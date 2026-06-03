const db = require('./index');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function migrate() {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🚀 A criar schema da base de dados...');

    // Extensão para UUIDs
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Tabela de utilizadores
    await client.query(`
      CREATE TABLE IF NOT EXISTS utilizadores (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nome VARCHAR(150) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_iniciais VARCHAR(3),
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    // Categorias de transações
    await client.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        utilizador_id UUID REFERENCES utilizadores(id) ON DELETE CASCADE,
        nome VARCHAR(100) NOT NULL,
        icone VARCHAR(50) DEFAULT '💰',
        cor VARCHAR(20) DEFAULT '#3B8BD4',
        tipo VARCHAR(20) DEFAULT 'gasto' CHECK (tipo IN ('gasto', 'receita', 'poupanca')),
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    // Contas bancárias / carteiras
    await client.query(`
      CREATE TABLE IF NOT EXISTS contas (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
        nome VARCHAR(100) NOT NULL,
        tipo VARCHAR(50) DEFAULT 'conta_corrente' CHECK (tipo IN ('conta_corrente', 'poupanca', 'cartao_credito', 'dinheiro', 'outro')),
        saldo DECIMAL(12, 2) DEFAULT 0.00,
        cor VARCHAR(20) DEFAULT '#3B8BD4',
        icone VARCHAR(50) DEFAULT '🏦',
        ativo BOOLEAN DEFAULT TRUE,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    // Transações
    await client.query(`
      CREATE TABLE IF NOT EXISTS transacoes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
        conta_id UUID REFERENCES contas(id) ON DELETE SET NULL,
        categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
        descricao VARCHAR(255) NOT NULL,
        valor DECIMAL(12, 2) NOT NULL,
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('gasto', 'receita', 'transferencia')),
        data DATE NOT NULL DEFAULT CURRENT_DATE,
        notas TEXT,
        recorrente BOOLEAN DEFAULT FALSE,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    // Metas de poupança
    await client.query(`
      CREATE TABLE IF NOT EXISTS metas_poupanca (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
        nome VARCHAR(150) NOT NULL,
        descricao TEXT,
        valor_meta DECIMAL(12, 2) NOT NULL,
        valor_atual DECIMAL(12, 2) DEFAULT 0.00,
        data_alvo DATE,
        concluida BOOLEAN DEFAULT FALSE,
        icone VARCHAR(50) DEFAULT '🎯',
        cor VARCHAR(20) DEFAULT '#1D9E75',
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    // Veículos
    await client.query(`
      CREATE TABLE IF NOT EXISTS veiculos (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
        nome VARCHAR(100) NOT NULL,
        matricula VARCHAR(20),
        marca VARCHAR(80),
        modelo VARCHAR(80),
        ano INTEGER,
        combustivel VARCHAR(30),
        iuc_valor DECIMAL(10, 2),
        iuc_mes_vencimento INTEGER CHECK (iuc_mes_vencimento BETWEEN 1 AND 12),
        seguro_vencimento DATE,
        inspecao_vencimento DATE,
        ativo BOOLEAN DEFAULT TRUE,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    // Prazos fiscais e lembretes
    await client.query(`
      CREATE TABLE IF NOT EXISTS prazos (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
        nome VARCHAR(150) NOT NULL,
        descricao TEXT,
        tipo VARCHAR(50) DEFAULT 'outro' CHECK (tipo IN ('irs', 'iuc', 'imi', 'seguro', 'inspecao', 'fatura', 'outro')),
        data_vencimento DATE NOT NULL,
        valor_estimado DECIMAL(12, 2),
        pago BOOLEAN DEFAULT FALSE,
        data_pagamento DATE,
        recorrente BOOLEAN DEFAULT FALSE,
        recorrencia_meses INTEGER,
        veiculo_id UUID REFERENCES veiculos(id) ON DELETE SET NULL,
        notas TEXT,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    // Orçamentos mensais por categoria
    await client.query(`
      CREATE TABLE IF NOT EXISTS orcamentos (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
        categoria_id UUID REFERENCES categorias(id) ON DELETE CASCADE,
        valor_mensal DECIMAL(12, 2) NOT NULL,
        mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
        ano INTEGER NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW(),
        UNIQUE (utilizador_id, categoria_id, mes, ano)
      )
    `);

    // Índices para performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transacoes_utilizador ON transacoes(utilizador_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(data DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_prazos_vencimento ON prazos(data_vencimento)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_prazos_utilizador ON prazos(utilizador_id)`);

    await client.query('COMMIT');
    console.log('✅ Schema criado com sucesso!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migração:', err);
    throw err;
  } finally {
    client.release();
    await db.pool.end();
  }
}

migrate().catch(console.error);
