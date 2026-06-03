// services/mapeadorTransacoes.js
// Converte transações do formato Nordigen para o schema da tabela 'transacoes'

/**
 * Normaliza uma transação do Nordigen para inserção na BD.
 *
 * Schema destino (tabela transacoes):
 *   descricao, valor, tipo ('receita'|'despesa'), data, categoria_id,
 *   conta_id, notas, origem, nordigen_id, ligacao_banco_id
 */
function mapearTransacao(t, contaId, ligacaoBancoId) {
  // Valor: Nordigen usa strings com sinal; positivo = crédito, negativo = débito
  const valorBruto = parseFloat(
    t.transactionAmount?.amount ?? t.instructedAmount?.amount ?? '0'
  );
  const tipo  = valorBruto >= 0 ? 'receita' : 'despesa';
  const valor = Math.abs(valorBruto);

  // Descrição: várias fontes possíveis consoante o banco
  const descricao =
    t.remittanceInformationUnstructured ||
    t.remittanceInformationStructured   ||
    t.additionalInformation             ||
    t.creditorName                      ||
    t.debtorName                        ||
    'Transação bancária';

  // Data: preferir data de valor, fallback para data de registo
  const data = t.valueDate || t.bookingDate || new Date().toISOString().split('T')[0];

  // ID externo para evitar duplicados (usar transactionId ou internalTransactionId)
  const nordigenId = t.transactionId || t.internalTransactionId || null;

  // Notas adicionais: junta referência e IBAN do credor/devedor se disponíveis
  const partes = [];
  if (t.creditorAccount?.iban)  partes.push(`IBAN credor: ${t.creditorAccount.iban}`);
  if (t.debtorAccount?.iban)    partes.push(`IBAN devedor: ${t.debtorAccount.iban}`);
  if (t.endToEndId)             partes.push(`Ref: ${t.endToEndId}`);
  const notas = partes.join(' | ') || null;

  return {
    descricao:       descricao.trim().substring(0, 255),
    valor,
    tipo,
    data,
    categoria_id:    null,   // Sem categorização automática por agora
    conta_id:        contaId,
    notas,
    origem:          'banco',
    nordigen_id:     nordigenId,
    ligacao_banco_id: ligacaoBancoId,
  };
}

/**
 * Insere transações mapeadas na BD, ignorando duplicados (ON CONFLICT).
 * Devolve { inseridas, ignoradas }.
 */
async function inserirTransacoes(db, transacoesNordigen, contaId, ligacaoBancoId) {
  let inseridas = 0;
  let ignoradas = 0;

  for (const t of transacoesNordigen) {
    const mapeada = mapearTransacao(t, contaId, ligacaoBancoId);

    try {
      const resultado = await db.query(
        `INSERT INTO transacoes
           (descricao, valor, tipo, data, categoria_id, conta_id,
            notas, origem, nordigen_id, ligacao_banco_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (nordigen_id) DO NOTHING
         RETURNING id`,
        [
          mapeada.descricao,
          mapeada.valor,
          mapeada.tipo,
          mapeada.data,
          mapeada.categoria_id,
          mapeada.conta_id,
          mapeada.notas,
          mapeada.origem,
          mapeada.nordigen_id,
          mapeada.ligacao_banco_id,
        ]
      );

      if (resultado.rows.length > 0) inseridas++;
      else ignoradas++;
    } catch (err) {
      // Log mas não interrompe o loop
      console.error(`Erro ao inserir transação ${mapeada.nordigen_id}:`, err.message);
      ignoradas++;
    }
  }

  return { inseridas, ignoradas };
}

module.exports = { mapearTransacao, inserirTransacoes };