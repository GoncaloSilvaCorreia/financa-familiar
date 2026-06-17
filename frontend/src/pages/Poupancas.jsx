import { useState, useEffect } from 'react'
import { Plus, X, Pencil, Trash2, TrendingUp } from 'lucide-react'
import api from '../utils/api'

function moeda(val) {
  return Number(val).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}

// Valida os campos do formulário de meta localmente, antes de chamar a API
function validarFormularioMeta(form) {
  const erros = {}

  if (!form.nome || !form.nome.trim()) {
    erros.nome = 'O nome da meta é obrigatório.'
  }

  if (form.valor_meta === '' || form.valor_meta === null || form.valor_meta === undefined) {
    erros.valor_meta = 'O valor objetivo é obrigatório.'
  } else {
    const vMeta = parseFloat(form.valor_meta)
    if (isNaN(vMeta) || vMeta <= 0) {
      erros.valor_meta = 'O valor objetivo deve ser positivo.'
    }
  }

  if (form.valor_atual !== '' && form.valor_atual !== null && form.valor_atual !== undefined) {
    const vAtual = parseFloat(form.valor_atual)
    if (isNaN(vAtual) || vAtual < 0) {
      erros.valor_atual = 'O valor atual não pode ser negativo.'
    } else if (!isNaN(parseFloat(form.valor_meta)) && vAtual > parseFloat(form.valor_meta)) {
      erros.valor_atual = 'O valor atual não pode ser superior ao valor objetivo.'
    }
  }

  if (form.data_alvo) {
    const data = new Date(form.data_alvo)
    if (isNaN(data.getTime())) {
      erros.data_alvo = 'Data inválida.'
    } else {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      if (data < hoje) {
        erros.data_alvo = 'A data objetivo não pode estar no passado.'
      }
    }
  }

  return erros
}

function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-sm font-semibold text-gray-800">{titulo}</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function FormMeta({ inicial, onGuardar, onCancelar }) {
  const [form, setForm] = useState(inicial || {
    nome: '', descricao: '', valor_meta: '', valor_atual: '0',
    data_alvo: '', icone: '🎯', cor: '#1D9E75', notas: ''
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [campoErro, setCampoErro] = useState('') // nome do campo com erro, para destacar

  const ICONES = ['🎯', '✈️', '🚗', '🏠', '📱', '💻', '🛡️', '🎓', '💍', '🐷', '🌍', '🎸']
  const CORES  = ['#1D9E75', '#3B8BD4', '#EF9F27', '#D85A30', '#7F77DD', '#D4537E']

  function atualizarCampo(campo, valor) {
    setForm({ ...form, [campo]: valor })
    if (campoErro === campo) { setCampoErro(''); setErro('') }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCampoErro('')

    // ── Validação local de todos os campos antes de chamar a API ─────────────
    const erros = validarFormularioMeta(form)
    if (Object.keys(erros).length > 0) {
      const primeiroCampo = Object.keys(erros)[0]
      setCampoErro(primeiroCampo)
      setErro(erros[primeiroCampo])
      return
    }

    setLoading(true)
    try {
      if (inicial?.id) {
        await api.put(`/poupancas/${inicial.id}`, form)
      } else {
        await api.post('/poupancas', form)
      }
      onGuardar()
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao guardar. Verifica os dados e tenta novamente.')
      setCampoErro(err.response?.data?.campo || '')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome da meta</label>
        <input placeholder="Ex: Férias de verão"
          value={form.nome} onChange={e => atualizarCampo('nome', e.target.value)}
          className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition ${
            campoErro === 'nome' ? 'border-red-300 focus:ring-red-400 bg-red-50' : 'border-gray-200 focus:ring-blue-500'
          }`} />
        {campoErro === 'nome' && (
          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span>⚠</span> {erro}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Valor objetivo (€)</label>
          <input type="number" step="0.01" min="0.01" placeholder="0,00"
            value={form.valor_meta} onChange={e => atualizarCampo('valor_meta', e.target.value)}
            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition ${
              campoErro === 'valor_meta' ? 'border-red-300 focus:ring-red-400 bg-red-50' : 'border-gray-200 focus:ring-blue-500'
            }`} />
          {campoErro === 'valor_meta' && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span>⚠</span> {erro}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Valor atual (€)</label>
          <input type="number" step="0.01" min="0" placeholder="0,00"
            value={form.valor_atual} onChange={e => atualizarCampo('valor_atual', e.target.value)}
            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition ${
              campoErro === 'valor_atual' ? 'border-red-300 focus:ring-red-400 bg-red-50' : 'border-gray-200 focus:ring-blue-500'
            }`} />
          {campoErro === 'valor_atual' && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span>⚠</span> {erro}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Data objetivo</label>
        <input type="date" value={form.data_alvo}
          onChange={e => atualizarCampo('data_alvo', e.target.value)}
          className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition ${
            campoErro === 'data_alvo' ? 'border-red-300 focus:ring-red-400 bg-red-50' : 'border-gray-200 focus:ring-blue-500'
          }`} />
        {campoErro === 'data_alvo' && (
          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span>⚠</span> {erro}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Ícone</label>
        <div className="flex flex-wrap gap-2">
          {ICONES.map(ic => (
            <button key={ic} type="button" onClick={() => setForm({ ...form, icone: ic })}
              className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition ${
                form.icone === ic ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-50 hover:bg-gray-100'
              }`}>
              {ic}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Cor</label>
        <div className="flex gap-2">
          {CORES.map(c => (
            <button key={c} type="button" onClick={() => setForm({ ...form, cor: c })}
              className={`w-7 h-7 rounded-full transition ${form.cor === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
              style={{ background: c }} />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Notas (opcional)</label>
        <textarea
          placeholder="Ex: https://www.fnac.pt/computador-portatil-..."
          value={form.notas}
          onChange={e => setForm({ ...form, notas: e.target.value })}
          rows={3}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {erro && !['nome', 'valor_meta', 'valor_atual', 'data_alvo'].includes(campoErro) && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2.5 rounded-lg flex items-start gap-2">
          <span className="mt-0.5">⚠</span>
          <span>{erro}</span>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancelar}
          className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition">
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-lg transition">
          {loading ? 'A guardar...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

function ModalDeposito({ meta, onGuardar, onCancelar }) {
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState('depositar')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const v = tipo === 'depositar' ? Math.abs(valor) : -Math.abs(valor)
      await api.patch(`/poupancas/${meta.id}/depositar`, { valor: v })
      onGuardar()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-2">
        {[
          { value: 'depositar', label: '+ Depositar' },
          { value: 'levantar',  label: '- Levantar' },
        ].map(t => (
          <button key={t.value} type="button" onClick={() => setTipo(t.value)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg border transition ${
              tipo === t.value
                ? t.value === 'depositar' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-500 border-red-200'
                : 'border-gray-200 text-gray-400 hover:border-gray-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Valor (€)</label>
        <input required type="number" step="0.01" min="0.01" placeholder="0,00"
          value={valor} onChange={e => setValor(e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancelar}
          className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition">
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-lg transition">
          {loading ? 'A guardar...' : 'Confirmar'}
        </button>
      </div>
    </form>
  )
}

// ─── Modal de Detalhes da Meta ────────────────────────────────────────────────
function ModalDetalhes({ meta, onClose, onEditar, onDepositar, onApagar }) {
  const pct = Math.min(parseFloat(meta.percentagem || 0), 100)
  const falta = Math.max(parseFloat(meta.valor_meta) - parseFloat(meta.valor_atual), 0)

  // Detecta links nas notas e torna-os clicáveis
  function renderNotas(texto) {
    if (!texto) return null
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const partes = texto.split(urlRegex)
    return partes.map((parte, i) =>
      urlRegex.test(parte) ? (
        <a key={i} href={parte} target="_blank" rel="noopener noreferrer"
          className="text-blue-500 hover:underline break-all">
          {parte}
        </a>
      ) : <span key={i}>{parte}</span>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="rounded-t-2xl px-5 py-5" style={{ background: meta.cor + '15' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: meta.cor + '25' }}>
                {meta.icone}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">{meta.nome}</h2>
                {meta.data_alvo && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Objetivo: {new Date(meta.data_alvo).toLocaleDateString('pt-PT')}
                  </p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={17} />
            </button>
          </div>
          <div className="mt-4">
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-gray-900">{moeda(meta.valor_atual)}</span>
              <span className="text-sm text-gray-400 mb-0.5">/ {moeda(meta.valor_meta)}</span>
            </div>
            <div className="mt-2 h-2 bg-white/50 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: meta.cor }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400">{pct}%</span>
              <span className="text-xs text-gray-400">{moeda(falta)} em falta</span>
            </div>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Notas */}
          {meta.notas && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1.5">Notas</p>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {renderNotas(meta.notas)}
              </p>
            </div>
          )}

          <div className="border-t border-gray-100" />

          <div className="flex gap-2">
            <button onClick={() => { onClose(); onApagar(meta) }}
              className="flex-1 py-2 text-xs text-red-400 border border-red-100 rounded-lg hover:bg-red-50 transition font-medium">
              Apagar
            </button>
            {!meta.concluida && (
              <button onClick={() => { onClose(); onDepositar(meta) }}
                className="flex-1 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition font-medium">
                Atualizar
              </button>
            )}
            <button onClick={() => { onClose(); onEditar(meta) }}
              className="flex-1 py-2 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition font-medium">
              Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Poupancas() {
  const [metas, setMetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [modalDeposito, setModalDeposito] = useState(null)
  const [modalDetalhes, setModalDetalhes] = useState(null)
  const [aApagar, setAApagar] = useState(null)

  async function carregar() {
    setLoading(true)
    try {
      const { data } = await api.get('/poupancas')
      setMetas(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function apagar(id) {
    try {
      await api.delete(`/poupancas/${id}`)
      setAApagar(null)
      carregar()
    } catch (err) {
      console.error(err)
    }
  }

  const totalPoupado = metas.reduce((s, m) => s + parseFloat(m.valor_atual), 0)
  const totalMeta    = metas.reduce((s, m) => s + parseFloat(m.valor_meta), 0)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Poupanças</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {moeda(totalPoupado)} poupados de {moeda(totalMeta)} total
          </p>
        </div>
        <button onClick={() => setModal('criar')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
          <Plus size={15} /> Nova meta
        </button>
      </div>

      {metas.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progresso total</span>
            <span className="text-sm font-semibold text-gray-900">
              {totalMeta > 0 ? Math.round((totalPoupado / totalMeta) * 100) : 0}%
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${totalMeta > 0 ? Math.min((totalPoupado / totalMeta) * 100, 100) : 0}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-gray-400">{moeda(totalPoupado)}</span>
            <span className="text-xs text-gray-400">{moeda(totalMeta)}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : metas.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-300">
          <div className="text-4xl mb-3">🐷</div>
          Cria a tua primeira meta de poupança
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metas.map(m => {
            const pct = Math.min(parseFloat(m.percentagem || 0), 100)
            const falta = Math.max(parseFloat(m.valor_meta) - parseFloat(m.valor_atual), 0)
            return (
              <div key={m.id}
                onClick={() => setModalDetalhes(m)}
                className={`bg-white rounded-2xl border p-5 cursor-pointer hover:shadow-md transition-shadow ${m.concluida ? 'border-emerald-200' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: m.cor + '20' }}>
                      {m.icone}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{m.nome}</span>
                        {m.notas && <span className="text-gray-300 text-xs">📎</span>}
                      </div>
                      {m.data_alvo && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          Objetivo: {new Date(m.data_alvo).toLocaleDateString('pt-PT')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setModal(m)}
                      className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setAApagar(m)}
                      className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-gray-400">{pct}% concluído</span>
                    <span className="text-xs text-gray-400">{moeda(falta)} em falta</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: m.cor }} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-gray-900">{moeda(m.valor_atual)}</span>
                    <span className="text-sm text-gray-300 ml-1">/ {moeda(m.valor_meta)}</span>
                  </div>
                  {m.concluida ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 font-medium">
                      ✓ Concluída
                    </span>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); setModalDeposito(m) }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition">
                      <TrendingUp size={12} /> Atualizar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal detalhes */}
      {modalDetalhes && (
        <ModalDetalhes
          meta={modalDetalhes}
          onClose={() => setModalDetalhes(null)}
          onEditar={m => setModal({ ...m, data_alvo: m.data_alvo?.split('T')[0] || '' })}
          onDepositar={m => setModalDeposito(m)}
          onApagar={m => setAApagar(m)}
        />
      )}

      {/* Modal criar/editar */}
      {modal && (
        <Modal titulo={modal === 'criar' ? 'Nova meta' : 'Editar meta'} onClose={() => setModal(null)}>
          <FormMeta
            inicial={modal !== 'criar' ? { ...modal, data_alvo: modal.data_alvo?.split('T')[0] || '' } : null}
            onGuardar={() => { setModal(null); carregar() }}
            onCancelar={() => setModal(null)}
          />
        </Modal>
      )}

      {/* Modal depositar/levantar */}
      {modalDeposito && (
        <Modal titulo={`Atualizar — ${modalDeposito.nome}`} onClose={() => setModalDeposito(null)}>
          <ModalDeposito
            meta={modalDeposito}
            onGuardar={() => { setModalDeposito(null); carregar() }}
            onCancelar={() => setModalDeposito(null)}
          />
        </Modal>
      )}

      {/* Modal apagar */}
      {aApagar && (
        <Modal titulo="Apagar meta" onClose={() => setAApagar(null)}>
          <p className="text-sm text-gray-600 mb-5">
            Tens a certeza que queres apagar <strong>{aApagar.nome}</strong>?
          </p>
          <div className="flex gap-2">
            <button onClick={() => setAApagar(null)}
              className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button onClick={() => apagar(aApagar.id)}
              className="flex-1 py-2.5 text-sm bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition">
              Apagar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}