import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, ArrowLeftRight, PiggyBank,
  CalendarClock, Car, LogOut, Settings
} from 'lucide-react'

const navItems = [
  { to: '/',           icon: LayoutDashboard, label: 'Visão geral',   exact: true },
  { to: '/transacoes', icon: ArrowLeftRight,  label: 'Transações' },
  { to: '/poupancas',  icon: PiggyBank,       label: 'Poupanças' },
  { to: '/prazos',     icon: CalendarClock,   label: 'Prazos fiscais' },
  { to: '/veiculos',   icon: Car,             label: 'Veículos' },
  { to: '/definicoes', icon: Settings,        label: 'Definições' },
]

export default function Layout() {
  const { utilizador, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[220px] bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="text-[15px] font-semibold text-gray-900">FinançaFamiliar</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Gestão pessoal</div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Utilizador + logout */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {utilizador?.avatar_iniciais || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-gray-800 truncate">{utilizador?.nome}</div>
              <div className="text-[10px] text-gray-400 truncate">{utilizador?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-300 hover:text-red-400 transition-colors"
              title="Sair"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}