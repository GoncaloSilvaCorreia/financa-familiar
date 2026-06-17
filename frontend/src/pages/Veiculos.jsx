import { useState, useEffect } from 'react'
import { Plus, X, Pencil, Trash2, AlertTriangle, Check } from 'lucide-react'
import api from '../utils/api'

function moeda(val) {
  return Number(val).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}

function diasAte(data) {
  if (!data) return null
  const diff = Math.ceil((new Date(data) - new Date()) / (1000 * 60 * 60 * 24))
  return diff
}

function BadgeData({ label, data, pago }) {
  if (!data) return null
  const dias = diasAte(data)

  if (pago) {
    return (
      <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600">
        <Check size={11} />
        <span>{label}</span>
        <span className="font-medium">Pago</span>
      </div>
    )
  }

  const cls = dias < 0 ? 'bg-gray-100 text-gray-400'
    : dias <= 30 ? 'bg-red-50 text-red-500'
    : dias <= 90 ? 'bg-orange-50 text-orange-500'
    : 'bg-gray-50 text-gray-500'

  return (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg ${cls}`}>
      {dias <= 30 && dias >= 0 && <AlertTriangle size={11} />}
      <span>{label}</span>
      <span className="font-medium">
        {dias < 0 ? 'Vencido' : dias === 0 ? 'Hoje' : `${dias}d`}
      </span>
    </div>
  )
}

function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
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

function FormVeiculo({ inicial, onGuardar, onCancelar }) {
  const [form, setForm] = useState(inicial || {
    nome: '', matricula: '', marca: '', modelo: '', ano: '',
    combustivel: 'Gasolina', iuc_valor: '', iuc_mes_vencimento: '',
    seguro_vencimento: '', inspecao_vencimento: ''
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [campoErro, setCampoErro] = useState('')

  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const COMBUSTIVEIS = ['Gasolina', 'Gasóleo', 'Elétrico', 'Híbrido', 'GPL', 'Outro']

  function atualizarCampo(campo, valor) {
    setForm({ ...form, [campo]: valor })
    if (campoErro === campo) { setCampoErro(''); setErro('') }
  }

  function classeInput(campo) {
    return `w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition ${
      campoErro === campo ? 'border-red-300 focus:ring-red-400 bg-red-50' : 'border-gray-200 focus:ring-blue-500'
    }`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCampoErro('')
    setLoading(true)
    try {
      if (inicial?.id) {
        await api.put(`/veiculos/${inicial.id}`, form)
      } else {
        await api.post('/veiculos', form)
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
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome / Alcunha</label>
          <input required placeholder="Ex: Renault Clio"
            value={form.nome} onChange={e => atualizarCampo('nome', e.target.value)}
            className={classeInput('nome')} />
          {campoErro === 'nome' && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span>⚠</span> {erro}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Marca</label>
          <input placeholder="Ex: Renault"
            value={form.marca} onChange={e => atualizarCampo('marca', e.target.value)}
            className={classeInput('marca')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Modelo</label>
          <input placeholder="Ex: Clio"
            value={form.modelo} onChange={e => atualizarCampo('modelo', e.target.value)}
            className={classeInput('modelo')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Matrícula</label>
          <input placeholder="Ex: 00-AA-00"
            value={form.matricula} onChange={e => atualizarCampo('matricula', e.target.value)}
            className={classeInput('matricula')} />
          {campoErro === 'matricula' && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span>⚠</span> {erro}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Ano</label>
          <input type="number" placeholder="Ex: 2020"
            value={form.ano} onChange={e => atualizarCampo('ano', e.target.value)}
            className={classeInput('ano')} />
          {campoErro === 'ano' && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span>⚠</span> {erro}</p>
          )}
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Combustível</label>
          <div className="flex flex-wrap gap-2">
            {COMBUSTIVEIS.map(c => (
              <button key={c} type="button" onClick={() => atualizarCampo('combustivel', c)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                  form.combustivel === c
                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Impostos & Datas</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">IUC — Valor (€)</label>
            <input type="number" step="0.01" placeholder="0,00"
              value={form.iuc_valor} onChange={e => atualizarCampo('iuc_valor', e.target.value)}
              className={classeInput('iuc_valor')} />
            {campoErro === 'iuc_valor' && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span>⚠</span> {erro}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">IUC — Mês vencimento</label>
            <select value={form.iuc_mes_vencimento}
              onChange={e => atualizarCampo('iuc_mes_vencimento', e.target.value)}
              className={classeInput('iuc_mes_vencimento')}>
              <option value="">Selecionar</option>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Seguro — Vencimento</label>
            <input type="date" value={form.seguro_vencimento}
              onChange={e => atualizarCampo('seguro_vencimento', e.target.value)}
              className={classeInput('seguro_vencimento')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Inspeção — Vencimento</label>
            <input type="date" value={form.inspecao_vencimento}
              onChange={e => atualizarCampo('inspecao_vencimento', e.target.value)}
              className={classeInput('inspecao_vencimento')} />
          </div>
        </div>
      </div>

      {erro && !['nome', 'matricula', 'ano', 'iuc_valor'].includes(campoErro) && (
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

export default function Veiculos() {
  const [veiculos, setVeiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [aApagar, setAApagar] = useState(null)

  async function carregar() {
    setLoading(true)
    try {
      const { data } = await api.get('/veiculos')
      setVeiculos(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function apagar(id) {
    try {
      await api.delete(`/veiculos/${id}`)
      setAApagar(null)
      carregar()
    } catch (err) {
      console.error(err)
    }
  }

  function prazoEstaAtivo(veiculo, tipo) {
    const pendentes = veiculo.prazos_pendentes || []
    return pendentes.some(p => p.tipo === tipo)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Veículos</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {veiculos.length} veículo{veiculos.length !== 1 ? 's' : ''} registado{veiculos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setModal('criar')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
          <Plus size={15} /> Novo veículo
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : veiculos.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-300">
          <div className="text-4xl mb-3">🚗</div>
          Adiciona o teu primeiro veículo
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {veiculos.map(v => {
            const inspecaoPaga = !prazoEstaAtivo(v, 'inspecao')
            const seguroPago   = !prazoEstaAtivo(v, 'seguro')

            return (
              <div key={v.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">🚗</div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{v.nome}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {[v.marca, v.modelo, v.ano].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setModal({
                      ...v,
                      seguro_vencimento: v.seguro_vencimento?.split('T')[0] || '',
                      inspecao_vencimento: v.inspecao_vencimento?.split('T')[0] || ''
                    })}
                      className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setAApagar(v)}
                      className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {v.matricula && (
                    <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg font-mono">{v.matricula}</span>
                  )}
                  {v.combustivel && (
                    <span className="text-xs px-2.5 py-1 bg-gray-50 text-gray-500 rounded-lg">{v.combustivel}</span>
                  )}
                  {v.iuc_valor && (
                    <span className="text-xs px-2.5 py-1 bg-orange-50 text-orange-500 rounded-lg">
                      IUC {moeda(v.iuc_valor)}/ano
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <BadgeData
                    label="Seguro"
                    data={v.seguro_vencimento}
                    pago={v.seguro_vencimento ? seguroPago : false}
                  />
                  <BadgeData
                    label="Inspeção"
                    data={v.inspecao_vencimento}
                    pago={v.inspecao_vencimento ? inspecaoPaga : false}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <Modal titulo={modal === 'criar' ? 'Novo veículo' : 'Editar veículo'} onClose={() => setModal(null)}>
          <FormVeiculo
            key={modal === 'criar' ? 'criar' : modal.id}
            inicial={modal !== 'criar' ? modal : null}
            onGuardar={() => { setModal(null); carregar() }}
            onCancelar={() => setModal(null)}
          />
        </Modal>
      )}

      {aApagar && (
        <Modal titulo="Arquivar veículo" onClose={() => setAApagar(null)}>
          <p className="text-sm text-gray-600 mb-5">
            Tens a certeza que queres arquivar <strong>{aApagar.nome}</strong>?
          </p>
          <div className="flex gap-2">
            <button onClick={() => setAApagar(null)}
              className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button onClick={() => apagar(aApagar.id)}
              className="flex-1 py-2.5 text-sm bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition">
              Arquivar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}