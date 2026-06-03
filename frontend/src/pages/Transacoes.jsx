import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import api from '../utils/api'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function moeda(val) {
  return Number(val).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}

const TIPOS = [
  { value: 'gasto',         label: 'Gasto',         cor: 'bg-red-50 text-red-500' },
  { value: 'receita',       label: 'Receita',        cor: 'bg-emerald-50 text-emerald-600' },
  { value: 'transferencia', label: 'Transferência',  cor: 'bg-blue-50 text-blue-500' },
]

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

function FormTransacao({ inicial, categorias, contas, onGuardar, onCancelar }) {
  const [form, setForm] = useState(inicial || {
    descricao: '', valor: '', tipo: 'gasto',
    data: new Date().toISOString().split('T')[0],
    categoria_id: '', conta_id: '', notas: ''
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      if (inicial?.id) {
        await api.put(`/transacoes/${inicial.id}`, form)
      } else {
        await api.post('/transacoes', form)
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
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Descrição</label>
        <input
          required
          placeholder="Ex: Continente, EDP..."
          value={form.descricao}
          onChange={e => setForm({ ...form, descricao: e.target.value })}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Valor (€)</label>
          <input
            required type="number" step="0.01" min="0.01"
            placeholder="0,00"
            value={form.valor}
            onChange={e => setForm({ ...form, valor: e.target.value })}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Data</label>
          <input
            required type="date"
            value={form.data}
            onChange={e => setForm({ ...form, data: e.target.value })}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Tipo</label>
        <div className="flex gap-2">
          {TIPOS.map(t => (
            <button
              key={t.value} type="button"
              onClick={() => setForm({ ...form, tipo: t.value })}
              className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                form.tipo === t.value
                  ? `${t.cor} border-current`
                  : 'border-gray-200 text-gray-400 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Categoria</label>
        <select
          value={form.categoria_id}
          onChange={e => setForm({ ...form, categoria_id: e.target.value })}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Sem categoria</option>
          {categorias.map(c => (
            <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Conta</label>
        <select
          value={form.conta_id}
          onChange={e => setForm({ ...form, conta_id: e.target.value })}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Sem conta</option>
          {contas.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Notas (opcional)</label>
        <textarea
          placeholder="Notas adicionais..."
          value={form.notas}
          onChange={e => setForm({ ...form, notas: e.target.value })}
          rows={2}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
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

export default function Transacoes() {
  const agora = new Date()
  const [mes, setMes] = useState(agora.getMonth() + 1)
  const [ano, setAno] = useState(agora.getFullYear())
  const [tipo, setTipo] = useState('')
  const [transacoes, setTransacoes] = useState([])
  const [categorias, setCategorias] = useState([])
  const [contas, setContas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'criar' | transacao
  const [aApagar, setAApagar] = useState(null)

  async function carregar() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ mes, ano, limite: 100 })
      if (tipo) params.append('tipo', tipo)
      const [t, c, ct] = await Promise.all([
        api.get(`/transacoes?${params}`),
        api.get('/categorias'),
        api.get('/contas'),
      ])
      setTransacoes(t.data.transacoes)
      setCategorias(c.data || [])
      setContas(ct.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [mes, ano, tipo])

  async function apagar(id) {
    try {
      await api.delete(`/transacoes/${id}`)
      setAApagar(null)
      carregar()
    } catch (err) {
      console.error(err)
    }
  }

  const totalGastos   = transacoes.filter(t => t.tipo === 'gasto').reduce((s, t) => s + parseFloat(t.valor), 0)
  const totalReceitas = transacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + parseFloat(t.valor), 0)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Transações</h1>
          <p className="text-sm text-gray-400 mt-0.5">{transacoes.length} registos · {MESES[mes-1]} {ano}</p>
        </div>
        <button
          onClick={() => setModal('criar')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
        >
          <Plus size={15} /> Nova transação
        </button>
      </div>

      {/* Filtros + totais */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select value={mes} onChange={e => setMes(Number(e.target.value))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={ano} onChange={e => setAno(Number(e.target.value))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
          {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={tipo} onChange={e => setTipo(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os tipos</option>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <div className="ml-auto flex gap-3">
          <div className="text-sm text-emerald-600 font-medium">+{moeda(totalReceitas)}</div>
          <div className="text-sm text-red-400 font-medium">-{moeda(totalGastos)}</div>
          <div className={`text-sm font-semibold ${totalReceitas - totalGastos >= 0 ? 'text-gray-700' : 'text-red-500'}`}>
            = {moeda(totalReceitas - totalGastos)}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transacoes.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-300">
            <div className="text-4xl mb-3">💸</div>
            Sem transações neste período
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Descrição</th>
                <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Categoria</th>
                <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Data</th>
                <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">Valor</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {transacoes.map((t, i) => (
                <tr key={t.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i === transacoes.length - 1 ? 'border-0' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-sm flex-shrink-0">
                        {t.categoria_icone || '💰'}
                      </div>
                      <span className="text-sm text-gray-800 font-medium">{t.descricao}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs text-gray-400">{t.categoria_nome || '—'}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs text-gray-400">
                      {new Date(t.data).toLocaleDateString('pt-PT')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-sm font-semibold ${t.tipo === 'receita' ? 'text-emerald-500' : t.tipo === 'transferencia' ? 'text-blue-500' : 'text-red-400'}`}>
                      {t.tipo === 'receita' ? '+' : '-'}{moeda(t.valor)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal(t)}
                        className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setAApagar(t)}
                        className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal criar/editar */}
      {modal && (
        <Modal
          titulo={modal === 'criar' ? 'Nova transação' : 'Editar transação'}
          onClose={() => setModal(null)}
        >
          <FormTransacao
            inicial={modal !== 'criar' ? {
              ...modal,
              valor: modal.valor,
              data: modal.data?.split('T')[0],
              categoria_id: modal.categoria_id || '',
              conta_id: modal.conta_id || '',
            } : null}
            categorias={categorias}
            contas={contas}
            onGuardar={() => { setModal(null); carregar() }}
            onCancelar={() => setModal(null)}
          />
        </Modal>
      )}

      {/* Modal confirmar apagar */}
      {aApagar && (
        <Modal titulo="Apagar transação" onClose={() => setAApagar(null)}>
          <p className="text-sm text-gray-600 mb-5">
            Tens a certeza que queres apagar <strong>{aApagar.descricao}</strong>?
            Esta ação não pode ser revertida.
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