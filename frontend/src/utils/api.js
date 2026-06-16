import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const reqUrl = err.config?.url || ''

    // Não redirecionar automaticamente para /login quando o próprio pedido de login falhar
    const isLoginAttempt = reqUrl.includes('/auth/login')

    if ((status === 401 || status === 403) && !isLoginAttempt) {
      localStorage.removeItem('token')
      localStorage.removeItem('utilizador')
      // Só faz redirect se não estivermos já na página de login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(err)
  }
)


export default api