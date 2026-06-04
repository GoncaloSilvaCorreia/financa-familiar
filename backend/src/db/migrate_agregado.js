const db = require('./index');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function migrate() {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');
    console.log('🚀 A migrar para agregado familiar...');

    // 1. Tabela de agregados
    await client.query(`
      CREATE TABLE IF NOT EXISTS agregados (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nome VARCHAR(150) NOT NULL DEFAULT 'O meu agregado',
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    // 2. Tabela de membros do agregado
    await client.query(`
      CREATE TABLE IF NOT EXISTS membros_agregado (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        agregado_id UUID NOT NULL REFERENCES agregados(id) ON DELETE CASCADE,
        utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
        papel VARCHAR(20) DEFAULT 'membro' CHECK (papel IN ('admin', 'membro')),
        criado_em TIMESTAMP DEFAULT NOW(),
        UNIQUE (agregado_id, utilizador_id)
      )
    `);

    // 3. Tabela de convites
    await client.query(`
      CREATE TABLE IF NOT EXISTS convites (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        agregado_id UUID NOT NULL REFERENCES agregados(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        aceite BOOLEAN DEFAULT FALSE,
        criado_por UUID REFERENCES utilizadores(id),
        criado_em TIMESTAMP DEFAULT NOW(),
        expira_em TIMESTAMP DEFAULT NOW() + INTERVAL '7 days'
      )
    `);

    // 4. Adiciona agregado_id e criado_por às tabelas existentes
    const tabelas = ['transacoes', 'prazos', 'metas_poupanca', 'veiculos', 'contas', 'categorias', 'orcamentos'];
    for (const tabela of tabelas) {
      await client.query(`
        ALTER TABLE ${tabela}
        ADD COLUMN IF NOT EXISTS agregado_id UUID REFERENCES agregados(id) ON DELETE CASCADE
      `);
      await client.query(`
        ALTER TABLE ${tabela}
        ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES utilizadores(id)
      `);
    }

    // 5. Para cada utilizador existente, cria um agregado e associa-o
    const { rows: utilizadores } = await client.query('SELECT id, nome FROM utilizadores');
    for (const u of utilizadores) {
      // Cria agregado
      const { rows: [agregado] } = await client.query(
        `INSERT INTO agregados (nome) VALUES ($1) RETURNING id`,
        [`Agregado de ${u.nome.split(' ')[0]}`]
      );

      // Associa utilizador como admin
      await client.query(
        `INSERT INTO membros_agregado (agregado_id, utilizador_id, papel) VALUES ($1, $2, 'admin')`,
        [agregado.id, u.id]
      );

      // Atualiza todas as tabelas com o agregado_id e criado_por
      for (const tabela of tabelas) {
        await client.query(
          `UPDATE ${tabela} SET agregado_id = $1, criado_por = $2 WHERE utilizador_id = $3 AND agregado_id IS NULL`,
          [agregado.id, u.id, u.id]
        );
      }
    }

    // 6. Índices
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transacoes_agregado ON transacoes(agregado_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_prazos_agregado ON prazos(agregado_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_membros_agregado ON membros_agregado(agregado_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_membros_utilizador ON membros_agregado(utilizador_id)`);

    await client.query('COMMIT');
    console.log('✅ Migração concluída com sucesso!');

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