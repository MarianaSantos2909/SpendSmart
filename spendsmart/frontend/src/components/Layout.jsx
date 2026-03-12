import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Plus, ScanLine, Wallet, ShoppingCart } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Início' },
  { to: '/shopping', icon: ShoppingCart, label: 'Lista' },
  { to: '/add', icon: Plus, label: 'Adicionar', primary: true },
  { to: '/scanner', icon: ScanLine, label: 'Scanner' },
  { to: '/budget', icon: Wallet, label: 'Orçamento' },
]

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-white shadow-xl relative">
      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 safe-bottom z-50">
        <div className="flex items-end justify-around px-2 pt-2 pb-3">
          {navItems.map(({ to, icon: Icon, label, primary }) =>
            primary ? (
              <NavLink key={to} to={to} className="flex flex-col items-center -mt-6">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs mt-1 text-brand-600 font-medium">{label}</span>
              </NavLink>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${
                    isActive ? 'text-brand-600' : 'text-gray-400'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{label}</span>
              </NavLink>
            )
          )}
        </div>
      </nav>
    </div>
  )
}
