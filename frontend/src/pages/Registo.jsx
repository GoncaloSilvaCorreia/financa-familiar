import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'

export default function Registo() {
  const { login } = useAuth()
  const [form, setForm] = useState({ nome: '', email: '', password: '' })
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const res = await api.post('/auth/registar', form)
      login(res.data.token, res.data.utilizador)
    } catch (err) {
      setErro(err.response?.data?.erro || err.response?.data?.erros?.[0]?.msg || 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">💼</div>
          <h1 className="text-xl font-semibold text-gray-900">FinançaFamiliar</h1>
          <p className="text-sm text-gray-500 mt-1">Cria a tua conta</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome</label>
              <input
                type="text"
                required
                placeholder="O teu nome"
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                required
                placeholder="exemplo@email.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <input
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {erro && (
              <div className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{erro}</div>
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