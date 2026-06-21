import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../utils/api'

export default function ConfirmarEmail() {
  const { token } = useParams()
  const [estado, setEstado] = useState('a_confirmar') // a_confirmar | sucesso | erro
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    async function confirmar() {
      try {
        const { data } = await api.get(`/auth/confirmar/${token}`)
        setMensagem(data.mensagem)
        setEstado('sucesso')
      } catch (err) {
        setMensagem(err.response?.data?.erro || 'Não foi possível confirmar o email.')
        setEstado('erro')
      }
    }
    confirmar()
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          {estado === 'a_confirmar' && (
            <>
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">A confirmar o teu email...</p>
            </>
          )}

          {estado === 'sucesso' && (
            <>
              <div className="text-4xl mb-3">✅</div>
              <h1 className="text-lg font-semibold text-gray-900 mb-2">Conta confirmada!</h1>
              <p className="text-sm text-gray-500 mb-6">{mensagem}</p>
              <Link to="/login"
                className="inline-block w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                Ir para o login
              </Link>
            </>
          )}

          {estado === 'erro' && (
            <>
              <div className="text-4xl mb-3">⚠️</div>
              <h1 className="text-lg font-semibold text-gray-900 mb-2">Algo correu mal</h1>
              <p className="text-sm text-gray-500 mb-6">{mensagem}</p>
              <Link to="/login"
                className="inline-block w-full py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                Voltar ao login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}