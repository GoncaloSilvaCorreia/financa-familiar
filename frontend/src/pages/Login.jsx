import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'

export default function Login() {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [erros, setErros] = useState({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErros({})
    setLoading(true)
    try {
      const res = await api.post('/auth/login', form)
      login(res.data.token, res.data.utilizador)
    } catch (err) {
      const campo = err.response?.data?.campo
      const msg   = err.response?.data?.erro || 'Erro ao fazer login.'
      if (campo === 'email') {
        setErros({ email: msg })
      } else if (campo === 'password') {
        setErros({ password: msg })
      } else {
        setErros({ geral: msg })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl mb-2"></div>
          <h1 className="text-xl font-semibold text-gray-900">Finança Familiar</h1>
          <p className="text-sm text-gray-500 mt-1">Entra na tua conta</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="exemplo@email.com"
                value={form.email}
                onChange={e => {
                  setForm({ ...form, email: e.target.value })
                  if (erros.email) setErros(prev => ({ ...prev, email: '' }))
                }}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition ${
                  erros.email
                    ? 'border-red-300 focus:ring-red-400 bg-red-50'
                    : 'border-gray-200 focus:ring-blue-500'
                }`}
              />
              {erros.email && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {erros.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => {
                  setForm({ ...form, password: e.target.value })
                  if (erros.password) setErros(prev => ({ ...prev, password: '' }))
                }}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition ${
                  erros.password
                    ? 'border-red-300 focus:ring-red-400 bg-red-50'
                    : 'border-gray-200 focus:ring-blue-500'
                }`}
              />
              {erros.password && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {erros.password}
                </p>
              )}
            </div>

            {erros.geral && (
              <div className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                {erros.geral}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? 'A entrar...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            Não tens conta?{' '}
            <Link to="/registar" className="text-blue-500 hover:underline">Registar</Link>
          </p>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-center text-xs text-gray-400 mb-2">Conta de demonstração</p>
            <button
              type="button"
              onClick={() => setForm({ email: 'goncalo@example.com', password: 'password123' })}
              className="w-full py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              Preencher com dados demo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}