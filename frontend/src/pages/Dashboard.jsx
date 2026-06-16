import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Wallet, CalendarClock, ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MESES_COMPLETOS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function moeda(val) {
  return Number(val).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}

function KPICard({ label, value, deltaLabel, delta, icon: Icon, cor }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cor}`}>
          <Icon size={15} />
        </div>
      </div>
      <div className="text-2xl font-semibold text-gray-900 mb-1">{value}</div>
      {deltaLabel && (
        <div className={`flex items-center gap-1 text-xs ${delta >= 0 ? 'text-red-400' : 'text-emerald-500'}`}>
          {delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {deltaLabel}
        </div>
      )}
    </div>
  )
}

const CORES = ['#3B8BD4', '#1D9E75', '#EF9F27', '#D85A30', '#7F77DD', '#E2B53F', '#5DCAA5', '#D4537E']

// ─── Feriados portugueses (fixos + móveis simplificados) ─────────────────────
function getFeriados(ano) {
  // Cálculo da Páscoa (algoritmo de Meeus/Jones/Butcher)
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mesPascoa = Math.floor((h + l - 7 * m + 114) / 31)
  const diaPascoa = ((h + l - 7 * m + 114) % 31) + 1
  const pascoa = new Date(ano, mesPascoa - 1, diaPascoa)

  const addDias = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }

  const feriados = [
    // Fixos
    { mes: 1,  dia: 1,  nome: 'Ano Novo' },
    { mes: 4,  dia: 25, nome: '25 de Abril' },
    { mes: 5,  dia: 1,  nome: 'Dia do Trabalhador' },
    { mes: 6,  dia: 10, nome: 'Dia de Portugal' },
    { mes: 8,  dia: 15, nome: 'Assunção de Nossa Senhora' },
    { mes: 10, dia: 5,  nome: 'Implantação da República' },
    { mes: 11, dia: 1,  nome: 'Dia de Todos os Santos' },
    { mes: 12, dia: 1,  nome: 'Restauração da Independência' },
    { mes: 12, dia: 8,  nome: 'Imaculada Conceição' },
    { mes: 12, dia: 25, nome: 'Natal' },
    // Móveis
    { mes: addDias(pascoa, -47).getMonth() + 1, dia: addDias(pascoa, -47).getDate(), nome: 'Carnaval' },
    { mes: addDias(pascoa, -2).getMonth() + 1,  dia: addDias(pascoa, -2).getDate(),  nome: 'Sexta-feira Santa' },
    { mes: pascoa.getMonth() + 1,               dia: pascoa.getDate(),               nome: 'Páscoa' },
    { mes: addDias(pascoa, 60).getMonth() + 1,  dia: addDias(pascoa, 60).getDate(),  nome: 'Corpo de Deus' },
  ]

  // Converte para mapa { "mes-dia": nome }
  const mapa = {}
  feriados.forEach(f => { mapa[`${f.mes}-${f.dia}`] = f.nome })
  return mapa
}

// ─── Calendário ───────────────────────────────────────────────────────────────
function Calendario({ mes, ano, transacoes, prazos, onDiaClick }) {
  const primeiroDia = new Date(ano, mes - 1, 1).getDay()
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const hoje = new Date()
  const feriados = getFeriados(ano)

  // Agrupa transações por dia
  const transacoesPorDia = {}
  transacoes.forEach(t => {
    const dia = new Date(t.data).getUTCDate()
    if (!transacoesPorDia[dia]) transacoesPorDia[dia] = []
    transacoesPorDia[dia].push(t)
  })

  // Agrupa prazos por dia
  const prazosPorDia = {}
  prazos.forEach(p => {
    const d = new Date(p.data_vencimento)
    if (d.getMonth() + 1 === mes && d.getFullYear() === ano) {
      const dia = d.getDate()
      if (!prazosPorDia[dia]) prazosPorDia[dia] = []
      prazosPorDia[dia].push(p)
    }
  })

  const celulas = []
  for (let i = 0; i < primeiroDia; i++) {
    celulas.push(<div key={`empty-${i}`} />)
  }

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const temTransacoes = transacoesPorDia[dia]?.length > 0
    const temPrazos = prazosPorDia[dia]?.length > 0
    const eHoje = hoje.getDate() === dia && hoje.getMonth() + 1 === mes && hoje.getFullYear() === ano
    const feriado = feriados[`${mes}-${dia}`]
    const diaSemana = new Date(ano, mes - 1, dia).getDay()
    const eFimSemana = diaSemana === 0 || diaSemana === 6
    const totalDia = transacoesPorDia[dia]?.reduce((s, t) => {
      return t.tipo === 'receita' ? s + parseFloat(t.valor) : s - parseFloat(t.valor)
    }, 0) || 0
    const temEventos = temTransacoes || temPrazos

    celulas.push(
      <button
        key={dia}
        title={feriado || undefined}
        onClick={() => temEventos && onDiaClick(dia, transacoesPorDia[dia] || [], prazosPorDia[dia] || [])}
        className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-[13px] transition-all group
          ${eHoje ? 'bg-blue-500 text-white font-semibold shadow-sm' : ''}
          ${feriado && !eHoje ? 'bg-red-50' : ''}
          ${temEventos && !eHoje ? 'hover:bg-gray-50 cursor-pointer' : ''}
          ${!temEventos && !eHoje ? 'cursor-default' : ''}
        `}
      >
        <span className={`
          ${eHoje ? 'text-white' : ''}
          ${feriado && !eHoje ? 'text-red-400 font-medium' : ''}
          ${eFimSemana && !feriado && !eHoje ? 'text-gray-400' : ''}
          ${!eFimSemana && !feriado && !eHoje ? 'text-gray-600' : ''}
        `}>
          {dia}
        </span>
        {/* Pontos indicadores */}
        <div className="flex gap-0.5 mt-0.5 h-1.5 items-center">
          {temTransacoes && (
            <div className={`w-1 h-1 rounded-full ${eHoje ? 'bg-white/80' : totalDia >= 0 ? 'bg-teal-400' : 'bg-rose-300'}`} />
          )}
          {temPrazos && (
            <div className={`w-1 h-1 rounded-full ${eHoje ? 'bg-white/60' : 'bg-amber-400'}`} />
          )}
          {feriado && !eHoje && (
            <div className="w-1 h-1 rounded-full bg-red-300" />
          )}
        </div>
        {/* Tooltip do feriado */}
        {feriado && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {feriado}
          </div>
        )}
      </button>
    )
  }

  return (
    <div>
      {/* Cabeçalho dias semana */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center text-[11px] text-gray-300 font-medium py-1">{d}</div>
        ))}
      </div>
      {/* Grid dias */}
      <div className="grid grid-cols-7 gap-0.5">
        {celulas}
      </div>
    </div>
  )
}

// ─── Painel lateral do dia ────────────────────────────────────────────────────
function PainelDia({ dia, mes, ano, transacoes, prazos, onClose }) {
  const data = new Date(ano, mes - 1, dia)
  const label = data.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
  const totalGastos   = transacoes.filter(t => t.tipo !== 'receita').reduce((s, t) => s + parseFloat(t.valor), 0)
  const totalReceitas = transacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + parseFloat(t.valor), 0)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="text-sm font-semibold text-gray-800 capitalize">{label}</div>
            {(totalGastos > 0 || totalReceitas > 0) && (
              <div className="flex gap-3 mt-0.5">
                {totalReceitas > 0 && <span className="text-xs text-emerald-500">+{moeda(totalReceitas)}</span>}
                {totalGastos > 0 && <span className="text-xs text-red-400">-{moeda(totalGastos)}</span>}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Prazos do dia */}
          {prazos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Prazos</p>
              <div className="flex flex-col gap-2">
                {prazos.map(p => {
                  const icones = { irs: '📄', iuc: '🚗', imi: '🏠', seguro: '🛡️', inspecao: '🔧', outro: '📅' }
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                      <span className="text-xl">{icones[p.tipo] || '📅'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{p.nome}</div>
                        {p.valor_estimado && <div className="text-xs text-orange-500">{moeda(p.valor_estimado)}</div>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.pago ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                        {p.pago ? 'Pago' : 'Pendente'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Transações do dia */}
          {transacoes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Transações</p>
              <div className="flex flex-col gap-2">
                {transacoes.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-base flex-shrink-0 shadow-sm">
                      {t.categoria_icone || '💰'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{t.descricao}</div>
                      <div className="text-xs text-gray-400">{t.categoria_nome || 'Sem categoria'}</div>
                    </div>
                    <div className={`text-sm font-semibold ${t.tipo === 'receita' ? 'text-emerald-500' : 'text-red-400'}`}>
                      {t.tipo === 'receita' ? '+' : '-'}{moeda(t.valor)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {transacoes.length === 0 && prazos.length === 0 && (
            <p className="text-sm text-gray-300 text-center py-8">Sem eventos neste dia</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function Dashboard() {
  const { utilizador } = useAuth()
  const agora = new Date()
  const [mes, setMes] = useState(agora.getMonth() + 1)
  const [ano, setAno] = useState(agora.getFullYear())
  const [calMes, setCalMes] = useState(agora.getMonth() + 1)
  const [calAno, setCalAno] = useState(agora.getFullYear())
  const [resumo, setResumo] = useState(null)
  const [transacoes, setTransacoes] = useState([])
  const [todasTransacoes, setTodasTransacoes] = useState([])
  const [prazos, setPrazos] = useState([])
  const [loading, setLoading] = useState(true)
  const [diaAtivo, setDiaAtivo] = useState(null) // { dia, transacoes, prazos }

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      try {
        const [r, t, p] = await Promise.all([
          api.get(`/transacoes/resumo?mes=${mes}&ano=${ano}`),
          api.get(`/transacoes?mes=${mes}&ano=${ano}&limite=5`),
          api.get('/prazos?pago=false&dias=90'),
        ])
        setResumo(r.data)
        setTransacoes(t.data.transacoes)
        setPrazos(p.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [mes, ano])

  // Carrega todas as transações do mês do calendário
  useEffect(() => {
    async function carregarCalendario() {
      try {
        const { data } = await api.get(`/transacoes?mes=${calMes}&ano=${calAno}&limite=200`)
        setTodasTransacoes(data.transacoes)
      } catch (err) {
        console.error(err)
      }
    }
    carregarCalendario()
  }, [calMes, calAno])

  // Carrega também todos os prazos para o calendário
  const [todosPrazos, setTodosPrazos] = useState([])
  useEffect(() => {
    api.get('/prazos').then(r => setTodosPrazos(r.data)).catch(console.error)
  }, [])

  const totalGastos   = resumo?.totais?.find(t => t.tipo === 'gasto')?.total || 0
  const totalReceitas = resumo?.totais?.find(t => t.tipo === 'receita')?.total || 0
  const totalPoupanca = resumo?.totais?.find(t => t.tipo === 'transferencia')?.total || 0

  const evolucaoMap = {}
  resumo?.evolucao?.forEach(e => {
    const key = `${e.ano}-${String(e.mes).padStart(2, '0')}`
    if (!evolucaoMap[key]) evolucaoMap[key] = { mes: MESES[e.mes - 1], gastos: 0, receitas: 0 }
    if (e.tipo === 'gasto') evolucaoMap[key].gastos = parseFloat(e.total)
    if (e.tipo === 'receita') evolucaoMap[key].receitas = parseFloat(e.total)
  })
  const evolucaoData = Object.values(evolucaoMap)

  const categoriasData = resumo?.porCategoria
    ?.filter(c => c.nome)
    ?.map(c => ({ name: c.nome, value: parseFloat(c.total) })) || []

  const horaAtual = agora.getHours()
  const saudacao = horaAtual < 12 ? 'Bom dia' : horaAtual < 19 ? 'Boa tarde' : 'Boa noite'

  function navegarCalendario(delta) {
    let novoMes = calMes + delta
    let novoAno = calAno
    if (novoMes > 12) { novoMes = 1; novoAno++ }
    if (novoMes < 1)  { novoMes = 12; novoAno-- }
    setCalMes(novoMes)
    setCalAno(novoAno)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {saudacao}, {utilizador?.nome?.split(' ')[0]}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{MESES[mes - 1]} {ano} · Resumo mensal</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Receitas" value={moeda(totalReceitas)} icon={TrendingUp} cor="bg-emerald-50 text-emerald-500" />
        <KPICard label="Gastos" value={moeda(totalGastos)} icon={TrendingDown} cor="bg-red-50 text-red-400" />
        <KPICard label="Poupança" value={moeda(totalPoupanca)} icon={Wallet} cor="bg-blue-50 text-blue-500" />
        <KPICard
          label="Próximo prazo"
          value={prazos[0]?.nome?.split('—')[0]?.trim() || '—'}
          deltaLabel={prazos[0] ? `${prazos[0].dias_restantes} dias` : null}
          delta={1}
          icon={CalendarClock}
          cor="bg-orange-50 text-orange-400"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Evolução mensal</h2>
          {evolucaoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={evolucaoData} barSize={10} barGap={3}>
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
                <Tooltip formatter={v => moeda(v)} contentStyle={{ borderRadius: 8, border: '1px solid #f3f4f6', fontSize: 12 }} />
                <Bar dataKey="receitas" fill="#1D9E75" radius={[4, 4, 0, 0]} name="Receitas" />
                <Bar dataKey="gastos" fill="#3B8BD4" radius={[4, 4, 0, 0]} name="Gastos" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-300">Sem dados para este período</div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Gastos por categoria</h2>
          {categoriasData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoriasData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {categoriasData.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>} />
                <Tooltip formatter={v => moeda(v)} contentStyle={{ borderRadius: 8, border: '1px solid #f3f4f6', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-300">Sem dados para este período</div>
          )}
        </div>
      </div>

      {/* Calendário + prazos próximos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Calendário */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-700">
              {MESES_COMPLETOS[calMes - 1]} {calAno}
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={() => navegarCalendario(-1)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => navegarCalendario(1)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <Calendario
            mes={calMes}
            ano={calAno}
            transacoes={todasTransacoes}
            prazos={todosPrazos}
            onDiaClick={(dia, t, p) => setDiaAtivo({ dia, transacoes: t, prazos: p })}
          />
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-teal-400" /> Receita
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-rose-300" /> Gasto
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-amber-400" /> Prazo
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-red-300" /> Feriado
            </div>
          </div>
        </div>

        {/* Prazos próximos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Prazos próximos</h2>
          {prazos.length > 0 ? (
            <div className="flex flex-col gap-3">
              {prazos.slice(0, 5).map(p => {
                const badge = { critico: 'bg-red-50 text-red-500', aviso: 'bg-orange-50 text-orange-500', ok: 'bg-emerald-50 text-emerald-600', vencido: 'bg-gray-100 text-gray-400' }
                const icones = { irs: '📄', iuc: '🚗', imi: '🏠', seguro: '🛡️', inspecao: '🔧', outro: '📅' }
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-base flex-shrink-0">
                      {icones[p.tipo] || '📅'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{p.nome}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(p.data_vencimento).toLocaleDateString('pt-PT')}
                        {p.valor_estimado ? ` · ${moeda(p.valor_estimado)}` : ''}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge[p.urgencia]}`}>
                      {p.dias_restantes < 0 ? 'Vencido' : `${p.dias_restantes}d`}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-300 text-center py-6">Sem prazos nos próximos 90 dias</p>
          )}
        </div>
      </div>

      {/* Últimas transações */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Últimas transações</h2>
        {transacoes.length > 0 ? (
          <div className="flex flex-col gap-3">
            {transacoes.map(t => (
              <div key={t.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-base flex-shrink-0">
                  {t.categoria_icone || '💰'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{t.descricao}</div>
                  <div className="text-xs text-gray-400">{t.categoria_nome || 'Sem categoria'}</div>
                </div>
                <div className={`text-sm font-semibold ${t.tipo === 'receita' ? 'text-emerald-500' : 'text-red-400'}`}>
                  {t.tipo === 'receita' ? '+' : '-'}{moeda(t.valor)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-300 text-center py-6">Sem transações este mês</p>
        )}
      </div>

      {/* Painel lateral do dia */}
      {diaAtivo && (
        <PainelDia
          dia={diaAtivo.dia}
          mes={calMes}
          ano={calAno}
          transacoes={diaAtivo.transacoes}
          prazos={diaAtivo.prazos}
          onClose={() => setDiaAtivo(null)}
        />
      )}
    </div>
  )
}