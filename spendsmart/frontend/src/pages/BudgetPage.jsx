import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { ArrowLeft, PiggyBank, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'

const fmt = (n) => `${Number(n || 0).toFixed(2)}€`

export default function BudgetPage() {
  const navigate = useNavigate()
  const [budget, setBudget] = useState(null)
  const [insights, setInsights] = useState(null)
  const [newBudget, setNewBudget] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/budget').then((r) => { setBudget(r.data); setNewBudget(String(r.data.monthly_budget || '')) }),
      api.get('/insights').then((r) => setInsights(r.data)),
    ])
  }, [])

  const saveBudget = async () => {
    const val = parseFloat(newBudget)
    if (!val || val <= 0) return toast.error('Valor inválido')
    setSaving(true)
    try {
      await api.put('/budget', { monthly_budget: val })
      const { data } = await api.get('/budget')
      setBudget(data)
      toast.success('Orçamento atualizado!')
    } catch {
      toast.error('Erro ao atualizar')
    } finally {
      setSaving(false)
    }
  }

  const trendData = insights?.daily_trend?.slice(-14).map((d) => ({
    day: d.expense_date.slice(5),
    total: d.total,
  })) || []

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 to-purple-700 px-4 pt-12 pb-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold">Orçamento</h1>
        </div>

        {budget && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/15 rounded-2xl p-3 text-center">
              <p className="text-brand-200 text-xs mb-1">Mensal</p>
              <p className="text-xl font-bold">{fmt(budget.monthly_budget)}</p>
              <p className="text-xs text-brand-200">gasto: {fmt(budget.spent_month)}</p>
            </div>
            <div className="bg-white/15 rounded-2xl p-3 text-center">
              <p className="text-brand-200 text-xs mb-1">Diário restante</p>
              <p className={`text-xl font-bold ${budget.daily_remaining < 0 ? 'text-red-300' : ''}`}>
                {fmt(budget.daily_remaining)}
              </p>
              <p className="text-xs text-brand-200">hoje: {fmt(budget.spent_today)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Set budget */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <PiggyBank className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-gray-800">Definir orçamento mensal</h2>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
              <input
                type="number"
                step="10"
                min="0"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="ex: 600"
              />
            </div>
            <button
              onClick={saveBudget}
              disabled={saving}
              className="px-5 py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm disabled:opacity-60"
            >
              {saving ? '...' : 'Guardar'}
            </button>
          </div>
          {budget && (
            <p className="text-xs text-gray-500 mt-2">
              Com {budget.days_remaining} dias restantes → {fmt(budget.daily_budget)}/dia recomendado
            </p>
          )}
        </div>

        {/* Daily trend chart */}
        {trendData.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-purple-500" />
              <h2 className="font-semibold text-gray-800">Gastos dos últimos 14 dias</h2>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
                <Tooltip formatter={(v) => [`${v.toFixed(2)}€`, 'Gasto']} />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top expenses */}
        {insights?.top_expenses?.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-3">Top gastos este mês</h2>
            <div className="space-y-2">
              {insights.top_expenses.map((e, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 capitalize">{e.description}</span>
                      <span className="text-sm font-semibold text-gray-900">{fmt(e.total)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full"
                        style={{ width: `${Math.min(100, (e.total / (insights.top_expenses[0]?.total || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
