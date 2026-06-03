import { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [utilizador, setUtilizador] = useState(() => {
    const saved = localStorage.getItem('utilizador')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/auth/me')
        .then(res => setUtilizador(res.data))
        .catch(() => logout())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  function login(token, dados) {
    localStorage.setItem('token', token)
    localStorage.setItem('utilizador', JSON.stringify(dados))
    setUtilizador(dados)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('utilizador')
    setUtilizador(null)
  }

  return (
    <AuthContext.Provider value={{ utilizador, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
