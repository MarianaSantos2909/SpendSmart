import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { ArrowLeft, Zap } from 'lucide-react'

const CATEGORIES = [
  { id: 'Necessidades', label: 'Necessidades', color: 'bg-blue-100 text-blue-700' },
  { id: 'Estilo de Vida', label: 'Estilo de Vida', color: 'bg-purple-100 text-purple-700' },
  { id: 'Desejos', label: 'Desejos', color: 'bg-pink-100 text-pink-700' },
  { id: 'Outros', label: 'Outros', color: 'bg-gray-100 text-gray-600' },
]

const QUICK = [
  { label: '☕ Café', description: 'café', amount: 1.0 },
  { label: '🍽 Restaurante', description: 'restaurante', amount: 10.0 },
  { label: '🚌 Transporte', description: 'transporte', amount: 2.5 },
  { label: '🛒 Supermercado', description: 'supermercado', amount: 30.0 },
]

export default function AddExpensePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = location.state || {}

  const [form, setForm] = useState({
    description: prefill.description || '',
    amount: prefill.amount || '',
    category: prefill.category || '',
    subcategory: prefill.subcategory || '',
    store: '',
    barcode: prefill.barcode || '',
    expense_date: new Date().toISOString().split('T')[0],
  })
  const [loading, setLoading] = useState(false)
  const [autoCategory, setAutoCategory] = useState('')

  // Auto-categorize as user types
  useEffect(() => {
    if (form.description.length > 2 && !form.category) {
      const t = setTimeout(async () => {
        try {
          const { data } = await api.post('/products/categorize', { description: form.description })
          setAutoCategory(`${data.category} · ${data.subcategory}`)
        } catch {}
      }, 500)
      return () => clearTimeout(t)
    }
  }, [form.description])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Insere um valor válido')
    setLoading(true)
    try {
      await api.post('/expenses', {
        ...form,
        amount: parseFloat(form.amount),
      })
      toast.success('Despesa adicionada!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao guardar')
    } finally {
      setLoading(false)
    }
  }

  const applyQuick = (q) => {
    setForm((f) => ({ ...f, description: q.description, amount: String(q.amount) }))
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 to-purple-700 px-4 pt-12 pb-6 text-white">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold">Adicionar Despesa</h1>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Quick buttons */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-yellow-500" />
            <p className="text-sm font-semibold text-gray-700">Despesas rápidas</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {QUICK.map((q) => (
              <button
                key={q.label}
                onClick={() => applyQuick(q)}
                className="py-2.5 px-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-medium text-gray-700 active:bg-gray-100 text-left"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              placeholder="ex: leite, café, uber..."
            />
            {autoCategory && !form.category && (
              <p className="text-xs text-brand-500 mt-1 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Sugestão: {autoCategory}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setForm({ ...form, category: c.id })}
                  className={`py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                    form.category === c.id
                      ? 'border-brand-500 ' + c.color
                      : 'border-transparent bg-gray-50 text-gray-600'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loja (opcional)</label>
              <input
                type="text"
                value={form.store}
                onChange={(e) => setForm({ ...form, store: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                placeholder="ex: Continente"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-600 to-purple-600 text-white font-semibold text-base shadow-lg shadow-brand-500/30 disabled:opacity-60 active:scale-98 transition-transform"
          >
            {loading ? 'A guardar...' : 'Guardar despesa'}
          </button>
        </form>
      </div>
    </div>
  )
}
