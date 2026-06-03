// pages/ContasBancarias.jsx
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

// ─── Sub-componente: Card de ligação ativa ────────────────────────────────────
function CartaoLigacao({ ligacao, onSincronizar, onRemover, sincronizando }) {
  const ultimaSync = ligacao.ultima_sincronizacao
    ? new Date(ligacao.ultima_sincronizacao).toLocaleString('pt-PT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : 'Nunca';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {ligacao.banco_logo ? (
          <img src={ligacao.banco_logo} alt={ligacao.banco_nome} className="w-10 h-10 rounded-lg object-contain flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-600 font-semibold text-sm">
              {ligacao.banco_nome?.[0] ?? 'B'}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">{ligacao.banco_nome}</p>
          <p className="text-sm text-gray-500 truncate">{ligacao.iban ?? 'IBAN não disponível'}</p>
          <p className="text-xs text-gray-400 mt-0.5">Sincronizado: {ultimaSync}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
          Ativo
        </span>
        <button
          onClick={() => onSincronizar(ligacao.id)}
          disabled={sincronizando === ligacao.id}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
          title="Sincronizar agora"
        >
          <svg className={`w-4 h-4 ${sincronizando === ligacao.id ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button
          onClick={() => onRemover(ligacao.id, ligacao.banco_nome)}
          className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          title="Remover ligação"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Sub-componente: Modal para ligar banco ───────────────────────────────────
function ModalLigarBanco({ aberto, onFechar, onLigacaoIniciada }) {
  const [bancos, setBancos]       = useState([]);
  const [pesquisa, setPesquisa]   = useState('');
  const [selecionado, setSelecionado] = useState(null);
  const [carregando, setCarregando]   = useState(false);
  const [erro, setErro]           = useState('');

  useEffect(() => {
    if (!aberto) return;
    setErro('');
    setSelecionado(null);
    setPesquisa('');
    api.get('/banco/bancos-disponiveis')
      .then(r => setBancos(r.data))
      .catch(() => setErro('Não foi possível carregar a lista de bancos.'));
  }, [aberto]);

  const bancosFiltrados = bancos.filter(b =>
    b.nome.toLowerCase().includes(pesquisa.toLowerCase())
  );

  const iniciarLigacao = async () => {
    if (!selecionado) return;
    setCarregando(true);
    setErro('');
    try {
      const { data } = await api.post('/banco/iniciar', { institutionId: selecionado.id });
      // Guardar requisitionId no sessionStorage para o callback
      sessionStorage.setItem('nordigen_req_id', data.requisitionId);
      // Redirecionar para o banco
      window.location.href = data.linkAutorizacao;
      onLigacaoIniciada?.();
    } catch {
      setErro('Erro ao iniciar a ligação. Tente novamente.');
      setCarregando(false);
    }
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[85vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Ligar banco</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Corpo */}
        <div className="flex flex-col gap-3 p-5 overflow-y-auto flex-1">
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {erro}
            </div>
          )}

          <p className="text-sm text-gray-500">
            Seleciona o teu banco. Serás redirecionado para autenticar com segurança.
          </p>

          {/* Pesquisa */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Pesquisar banco..."
              value={pesquisa}
              onChange={e => setPesquisa(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Lista de bancos */}
          <div className="flex flex-col gap-1">
            {bancosFiltrados.length === 0 && !erro && (
              <p className="text-sm text-gray-400 text-center py-4">
                {bancos.length === 0 ? 'A carregar bancos...' : 'Nenhum banco encontrado'}
              </p>
            )}
            {bancosFiltrados.map(banco => (
              <button
                key={banco.id}
                onClick={() => setSelecionado(banco)}
                className={`flex items-center gap-3 p-3 rounded-xl text-left transition-colors border ${
                  selecionado?.id === banco.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-transparent hover:bg-gray-50'
                }`}
              >
                {banco.logo ? (
                  <img src={banco.logo} alt={banco.nome} className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-500 text-xs font-semibold">{banco.nome[0]}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{banco.nome}</p>
                  {banco.diasHistorico && (
                    <p className="text-xs text-gray-400">Histórico: {banco.diasHistorico} dias</p>
                  )}
                </div>
                {selecionado?.id === banco.id && (
                  <svg className="w-4 h-4 text-blue-500 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button
            onClick={onFechar}
            className="flex-1 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={iniciarLigacao}
            disabled={!selecionado || carregando}
            className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {carregando ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                A redirecionar...
              </>
            ) : 'Ligar banco'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ContasBancarias() {
  const [ligacoes, setLigacoes]         = useState([]);
  const [carregando, setCarregando]     = useState(true);
  const [modalAberto, setModalAberto]   = useState(false);
  const [sincronizando, setSincronizando] = useState(null);
  const [mensagem, setMensagem]         = useState(null); // { tipo: 'sucesso'|'erro', texto }

  const mostrarMensagem = (tipo, texto) => {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem(null), 4000);
  };

  const carregarLigacoes = useCallback(async () => {
    try {
      const { data } = await api.get('/banco/ligacoes');
      setLigacoes(data.filter(l => l.ativo));
    } catch {
      mostrarMensagem('erro', 'Erro ao carregar ligações bancárias.');
    } finally {
      setCarregando(false);
    }
  }, []);

  // Verificar se o utilizador voltou do banco (callback)
  useEffect(() => {
    const requisitionId = sessionStorage.getItem('nordigen_req_id');
    if (requisitionId) {
      sessionStorage.removeItem('nordigen_req_id');
      api.post('/banco/callback', { requisitionId })
        .then(({ data }) => {
          mostrarMensagem('sucesso', `${data.banco} ligado com sucesso! ${data.inseridas} transações importadas.`);
          carregarLigacoes();
        })
        .catch(() => {
          mostrarMensagem('erro', 'Erro ao finalizar a ligação. Tenta novamente.');
        });
    }
  }, [carregarLigacoes]);

  useEffect(() => {
    carregarLigacoes();
  }, [carregarLigacoes]);

  const sincronizar = async (id) => {
    setSincronizando(id);
    try {
      const { data } = await api.post(`/banco/sincronizar/${id}`);
      mostrarMensagem('sucesso', `Sincronizado! ${data.inseridas} transações novas importadas.`);
      carregarLigacoes();
    } catch {
      mostrarMensagem('erro', 'Erro ao sincronizar. Tenta novamente.');
    } finally {
      setSincronizando(null);
    }
  };

  const remover = async (id, nomeBanco) => {
    if (!window.confirm(`Remover a ligação com ${nomeBanco}? As transações já importadas serão mantidas.`)) return;
    try {
      await api.delete(`/banco/ligacoes/${id}`);
      mostrarMensagem('sucesso', `Ligação com ${nomeBanco} removida.`);
      setLigacoes(prev => prev.filter(l => l.id !== id));
    } catch {
      mostrarMensagem('erro', 'Erro ao remover ligação.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Contas bancárias</h1>
          <p className="text-sm text-gray-500 mt-1">
            Liga o teu banco para importar transações automaticamente
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ligar banco
        </button>
      </div>

      {/* Toast de mensagem */}
      {mensagem && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
          mensagem.tipo === 'sucesso'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {mensagem.tipo === 'sucesso' ? (
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
          )}
          {mensagem.texto}
        </div>
      )}

      {/* Lista de ligações */}
      {carregando ? (
        <div className="flex justify-center py-12">
          <svg className="w-6 h-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      ) : ligacoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <p className="font-medium text-gray-700">Nenhum banco ligado</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs">
            Liga o teu banco para que os gastos com cartão sejam importados automaticamente
          </p>
          <button
            onClick={() => setModalAberto(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Ligar primeiro banco
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ligacoes.map(ligacao => (
            <CartaoLigacao
              key={ligacao.id}
              ligacao={ligacao}
              onSincronizar={sincronizar}
              onRemover={remover}
              sincronizando={sincronizando}
            />
          ))}

          {/* Info sobre sincronização automática */}
          <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
            <p className="text-xs text-blue-700">
              As transações são importadas automaticamente quando o banco reporta novos movimentos via webhook. Podes também sincronizar manualmente a qualquer momento.
            </p>
          </div>
        </div>
      )}

      {/* Modal */}
      <ModalLigarBanco
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onLigacaoIniciada={() => setModalAberto(false)}
      />
    </div>
  );
}