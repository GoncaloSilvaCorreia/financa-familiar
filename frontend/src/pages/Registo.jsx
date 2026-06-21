import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'

export default function Registo() {
  const [form, setForm] = useState({ nome: '', email: '', password: '' })
  const [erros, setErros] = useState({})
  const [loading, setLoading] = useState(false)
  const [contaCriada, setContaCriada] = useState(false)
  const [mensagemSucesso, setMensagemSucesso] = useState('')

  function atualizarCampo(campo, valor) {
    setForm({ ...form, [campo]: valor })
    if (erros[campo]) setErros(prev => ({ ...prev, [campo]: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErros({})
    setLoading(true)
    try {
      const { data } = await api.post('/auth/registar', form)
      setMensagemSucesso(data.mensagem || data.aviso || 'Conta criada! Verifica o teu email.')
      setContaCriada(true)
    } catch (err) {
      const campo = err.response?.data?.campo
      const msg   = err.response?.data?.erro || 'Erro ao criar conta.'
      if (campo) {
        setErros({ [campo]: msg })
      } else {
        setErros({ geral: msg })
      }
    } finally {
      setLoading(false)
    }
  }

  if (contaCriada) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="text-4xl mb-3">📧</div>
            <h1 className="text-lg font-semibold text-gray-900 mb-2">Verifica o teu email</h1>
            <p className="text-sm text-gray-500 mb-6">{mensagemSucesso}</p>
            <Link to="/login"
              className="inline-block w-full py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">🏠</div>
          <h1 className="text-xl font-semibold text-gray-900">Finança Familiar</h1>
          <p className="text-sm text-gray-500 mt-1">Cria a tua conta</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome completo</label>
              <input
                placeholder="O teu nome"
                value={form.nome}
                onChange={e => atualizarCampo('nome', e.target.value)}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition ${
                  erros.nome ? 'border-red-300 focus:ring-red-400 bg-red-50' : 'border-gray-200 focus:ring-blue-500'
                }`}
              />
              {erros.nome && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span>⚠</span> {erros.nome}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="exemplo@email.com"
                value={form.email}
                onChange={e => atualizarCampo('email', e.target.value)}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition ${
                  erros.email ? 'border-red-300 focus:ring-red-400 bg-red-50' : 'border-gray-200 focus:ring-blue-500'
                }`}
              />
              {erros.email && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span>⚠</span> {erros.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={e => atualizarCampo('password', e.target.value)}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition ${
                  erros.password ? 'border-red-300 focus:ring-red-400 bg-red-50' : 'border-gray-200 focus:ring-blue-500'
                }`}
              />
              {erros.password && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span>⚠</span> {erros.password}</p>
              )}
            </div>

            {erros.geral && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2.5 rounded-lg flex items-start gap-2">
                <span className="mt-0.5">⚠</span>
                <span>{erros.geral}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? 'A criar conta...' : 'Criar conta'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            Já tens conta?{' '}
            <Link to="/login" className="text-blue-500 hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}