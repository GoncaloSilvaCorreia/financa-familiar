import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Registo from './pages/Registo'
import Dashboard from './pages/Dashboard'
import Transacoes from './pages/Transacoes'
import Prazos from './pages/Prazos'
import Poupancas from './pages/Poupancas'
import Veiculos from './pages/Veiculos'
import ContasBancarias from './pages/ContasBancarias';

function RotaProtegida({ children }) {
  const { utilizador, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return utilizador ? children : <Navigate to="/login" replace />
}

function RotaPublica({ children }) {
  const { utilizador } = useAuth()
  return utilizador ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<RotaPublica><Login /></RotaPublica>} />
          <Route path="/registar" element={<RotaPublica><Registo /></RotaPublica>} />
          <Route path="/" element={<RotaProtegida><Layout /></RotaProtegida>}>
            <Route index element={<Dashboard />} />
            <Route path="transacoes" element={<Transacoes />} />
            <Route path="prazos" element={<Prazos />} />
            <Route path="poupancas" element={<Poupancas />} />
            <Route path="veiculos" element={<Veiculos />} />
          </Route>
          <Route path="/contas-bancarias" element={<ContasBancarias />} />
          <Route path="/contas-bancarias/callback" element={<ContasBancarias />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}