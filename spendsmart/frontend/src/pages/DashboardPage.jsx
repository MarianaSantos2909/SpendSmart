import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, AlertTriangle, LogOut, ChevronRight } from 'lucide-react'

const CATEGORY_COLORS = {
  'Necessidades': '#6366f1',
  'Estilo de Vida': '#a855f7',
  'Desejos': '#ec4899',
  'Outros': '#94a3b8',
}

const fmt = (n) => `${Number(n || 0).toFixed(2)}€`

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [budget, setBudget] = useState(null)
  const [insights, setInsights] = useState(null)
  const [expenses, setExpenses] = useState([])

  useEffect(() => {
    Promise.all([
      api.get('/budget').then((r) => setBudget(r.data)),
      api.get('/insights').then((r) => setInsights(r.data)),
      api.get('/expenses?limit=5').then((r) => setExpenses(r.data)),
    ])
  }, [])

  const budgetPct = budget
    ? Math.min(100, ((budget.spent_month / budget.monthly_budget) * 100) || 0)
    : 0

  const dailyPct = budget
    ? Math.min(100, ((budget.spent_today / budget.daily_budget) * 100) || 0)
    : 0

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-600 to-purple-700 px-5 pt-12 pb-8 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-brand-200 text-sm">Olá,</p>
            <h1 className="text-xl font-bold">{user?.name?.split(' ')[0]} 👋</h1>
          </div>
          <button onClick={() => { logout(); navigate('/login') }}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Monthly budget ring */}
        {budget && (
          <div className="bg-white/15 rounded-2xl p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-brand-200 text-xs">Orçamento Mensal</p>
                <p className="text-2xl font-bold">{fmt(budget.remaining_month)}</p>
                <p className="text-brand-200 text-xs">restante de {fmt(budget.monthly_budget)}</p>
              </div>
              <div className="text-right">
                <p className="text-brand-200 text-xs">Gasto hoje</p>
                <p className="text-lg font-semibold">{fmt(budget.spent_today)}</p>
                <p className="text-brand-200 text-xs">de {fmt(budget.daily_budget)}/dia</p>
              </div>
            </div>

            {/* Monthly progress bar */}
            <div className="space-y-2">
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${budget.over_budget ? 'bg-red-400' : 'bg-white'}`}
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${dailyPct > 90 ? 'bg-orange-400' : 'bg-purple-300'}`}
                  style={{ width: `${dailyPct}%` }}
                />
              </div>
            </div>

            {budget.over_budget && (
              <div className="mt-3 flex items-center gap-2 bg-red-500/20 rounded-xl px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-red-300 flex-shrink-0" />
                <p className="text-xs text-red-200">Orçamento mensal excedido!</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-brand-500" />
              <span className="text-xs text-gray-500">Diário restante</span>
            </div>
            <p className={`text-xl font-bold ${(budget?.daily_remaining || 0) < 0 ? 'text-red-500' : 'text-gray-900'}`}>
              {fmt(budget?.daily_remaining)}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-gray-500">Dias restantes</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{budget?.days_remaining ?? '–'}</p>
          </div>
        </div>

        {/* Category chart */}
        {insights?.by_category?.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-3">Gastos por categoria</h2>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={insights.by_category} dataKey="total" cx="50%" cy="50%" innerRadius={30} outerRadius={55}>
                    {insights.by_category.map((entry, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[entry.category] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {insights.by_category.map((c) => (
                  <div key={c.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[c.category] || '#94a3b8' }} />
                      <span className="text-xs text-gray-600">{c.category}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800">{fmt(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent expenses */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="font-semibold text-gray-800">Últimas despesas</h2>
            <button onClick={() => navigate('/add')} className="text-xs text-brand-600 font-medium flex items-center gap-0.5">
              Ver mais <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {expenses.length === 0 ? (
            <div className="px-4 pb-4 text-center text-gray-400 text-sm py-6">
              Nenhuma despesa ainda.<br />
              <button onClick={() => navigate('/add')} className="text-brand-500 font-medium mt-1">
                Adicionar primeira despesa →
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {expenses.map((e) => (
                <li key={e.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{e.description}</p>
                    <p className="text-xs text-gray-400">{e.category} · {e.expense_date}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{fmt(e.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
