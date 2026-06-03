import { useState, useEffect } from 'react'
import { Plus, X, Check, Pencil, Trash2 } from 'lucide-react'
import api from '../utils/api'

function moeda(val) {
  return Number(val).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}

const TIPOS = [
  { value: 'irs',      label: 'IRS',       icone: '📄' },
  { value: 'iuc',      label: 'IUC',       icone: '🚗' },
  { value: 'imi',      label: 'IMI',       icone: '🏠' },
  { value: 'seguro',   label: 'Seguro',    icone: '🛡️' },
  { value: 'inspecao', label: 'Inspeção',  icone: '🔧' },
  { value: 'fatura',   label: 'Fatura',    icone: '🧾' },
  { value: 'outro',    label: 'Outro',     icone: '📅' },
]

const URGENCIA = {
  vencido: { label: 'Vencido',  cls: 'bg-gray-100 text-gray-400' },
  critico: { label: 'Urgente',  cls: 'bg-red-50 text-red-500' },
  aviso:   { label: 'Em breve', cls: 'bg-orange-50 text-orange-500' },
  ok:      { label: 'OK',       cls: 'bg-emerald-50 text-emerald-600' },
}

function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
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

function FormPrazo({ inicial, veiculos, onGuardar, onCancelar }) {
  const [form, setForm] = useState(inicial || {
    nome: '', tipo: 'outro', data_vencimento: '', valor_estimado: '',
    recorrente: false, recorrencia_meses: 12, veiculo_id: '', notas: ''
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      if (inicial?.id) {
        await api.put(`/prazos/${inicial.id}`, form)
      } else {
        await api.post('/prazos', form)
      }
      onGuardar()
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao guardar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome</label>
        <input required placeholder="Ex: IUC — Renault Clio"
          value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Tipo</label>
          <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.icone} {t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Data vencimento</label>
          <input required type="date" value={form.data_vencimento}
            onChange={e => setForm({ ...form, data_vencimento: e.target.value })}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Valor estimado (€)</label>
          <input type="number" step="0.01" min="0" placeholder="0,00"
            value={form.valor_estimado} onChange={e => setForm({ ...form, valor_estimado: e.target.value })}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Veículo</label>
          <select value={form.veiculo_id} onChange={e => setForm({ ...form, veiculo_id: e.target.value })}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Nenhum</option>
            {veiculos.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <input type="checkbox" id="recorrente" checked={form.recorrente}
          onChange={e => setForm({ ...form, recorrente: e.target.checked })}
          className="rounded" />
        <label htmlFor="recorrente" className="text-sm text-gray-600">Prazo recorrente</label>
        {form.recorrente && (
          <select value={form.recorrencia_meses}
            onChange={e => setForm({ ...form, recorrencia_meses: Number(e.target.value) })}
            className="ml-auto text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none">
            <option value={1}>Mensal</option>
            <option value={3}>Trimestral</option>
            <option value={6}>Semestral</option>
            <option value={12}>Anual</option>
          </select>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Notas</label>
        <textarea placeholder="Notas opcionais..." value={form.notas}
          onChange={e => setForm({ ...form, notas: e.target.value })}
          rows={2} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>

      {erro && <div className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{erro}</div>}

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

export default function Prazos() {
  const [prazos, setPrazos] = useState([])
  const [veiculos, setVeiculos] = useState([])
  const [filtro, setFiltro] = useState('pendentes') // pendentes | todos | pagos
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [aApagar, setAApagar] = useState(null)
  const [aPagar, setAPagar] = useState(null)

  async function carregar() {
    setLoading(true)
    try {
      const params = filtro === 'pendentes' ? '?pago=false' : filtro === 'pagos' ? '?pago=true' : ''
      const [p, v] = await Promise.all([
        api.get(`/prazos${params}`),
        api.get('/veiculos'),
      ])
      setPrazos(p.data)
      setVeiculos(v.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [filtro])

  async function marcarPago(id) {
    try {
      await api.patch(`/prazos/${id}/pagar`, {})
      setAPagar(null)
      carregar()
    } catch (err) {
      console.error(err)
    }
  }

  async function desfazerPagamento(id) {
    try {
      await api.patch(`/prazos/${id}/despagar`, {})
      carregar()
    } catch (err) {
      console.error(err)
    }
  }

  async function apagar(id) {
    try {
      await api.delete(`/prazos/${id}`)
      setAApagar(null)
      carregar()
    } catch (err) {
      console.error(err)
    }
  }

  const totalPendente = prazos
    .filter(p => !p.pago && p.valor_estimado)
    .reduce((s, p) => s + parseFloat(p.valor_estimado), 0)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Prazos fiscais</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {prazos.filter(p => !p.pago).length} pendentes
            {totalPendente > 0 && ` · ${moeda(totalPendente)} estimado`}
          </p>
        </div>
        <button onClick={() => setModal('criar')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
          <Plus size={15} /> Novo prazo
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-5">
        {[
          { value: 'pendentes', label: 'Pendentes' },
          { value: 'todos',     label: 'Todos' },
          { value: 'pagos',     label: 'Pagos' },
        ].map(f => (
          <button key={f.value} onClick={() => setFiltro(f.value)}
            className={`px-4 py-1.5 text-sm rounded-lg transition ${
              filtro === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : prazos.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-300">
          <div className="text-4xl mb-3">📅</div>
          Sem prazos neste filtro
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {prazos.map(p => {
            const tipo = TIPOS.find(t => t.value === p.tipo) || TIPOS[6]
            const urg = URGENCIA[p.urgencia] || URGENCIA.ok
            return (
              <div key={p.id} className={`bg-white rounded-2xl border p-4 flex items-center gap-4 ${p.pago ? 'border-gray-100 opacity-60' : 'border-gray-100'}`}>
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">
                  {tipo.icone}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{p.nome}</span>
                    {p.recorrente && <span className="text-xs text-gray-300">↻</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {new Date(p.data_vencimento).toLocaleDateString('pt-PT')}
                    {p.valor_estimado ? ` · ${moeda(p.valor_estimado)}` : ''}
                    {p.veiculo_nome ? ` · ${p.veiculo_nome}` : ''}
                  </div>
                </div>

                {!p.pago && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${urg.cls}`}>
                    {p.dias_restantes < 0 ? 'Vencido' : `${p.dias_restantes}d`}
                  </span>
                )}

                {p.pago ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 font-medium flex items-center gap-1">
                      <Check size={11} /> Pago
                    </span>
                    <button onClick={() => desfazerPagamento(p.id)}
                      className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-400 hover:text-orange-500 hover:border-orange-200 hover:bg-orange-50 transition">
                      Desfazer
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setAPagar(p)}
                    className="text-xs px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition">
                    Marcar pago
                  </button>
                )}

                <div className="flex items-center gap-1">
                  <button onClick={() => setModal(p)}
                    className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setAApagar(p)}
                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <Modal titulo={modal === 'criar' ? 'Novo prazo' : 'Editar prazo'} onClose={() => setModal(null)}>
          <FormPrazo
            inicial={modal !== 'criar' ? { ...modal, data_vencimento: modal.data_vencimento?.split('T')[0], veiculo_id: modal.veiculo_id || '' } : null}
            veiculos={veiculos}
            onGuardar={() => { setModal(null); carregar() }}
            onCancelar={() => setModal(null)}
          />
        </Modal>
      )}

      {/* Modal confirmar pago */}
      {aPagar && (
        <Modal titulo="Marcar como pago" onClose={() => setAPagar(null)}>
          <p className="text-sm text-gray-600 mb-5">
            Confirmas o pagamento de <strong>{aPagar.nome}</strong>
            {aPagar.valor_estimado ? ` (${moeda(aPagar.valor_estimado)})` : ''}?
            {aPagar.recorrente && <span className="block mt-1 text-xs text-blue-500">O próximo prazo será criado automaticamente.</span>}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setAPagar(null)}
              className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button onClick={() => marcarPago(aPagar.id)}
              className="flex-1 py-2.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition">
              Confirmar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal apagar */}
      {aApagar && (
        <Modal titulo="Apagar prazo" onClose={() => setAApagar(null)}>
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