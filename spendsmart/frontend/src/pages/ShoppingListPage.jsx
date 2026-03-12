import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Plus, Trash2, Check, ShoppingCart } from 'lucide-react'

export default function ShoppingListPage() {
  const [items, setItems] = useState([])
  const [newItem, setNewItem] = useState('')
  const [loading, setLoading] = useState(false)

  const load = () => api.get('/shopping-list').then((r) => setItems(r.data))

  useEffect(() => { load() }, [])

  const addItem = async () => {
    if (!newItem.trim()) return
    try {
      await api.post('/shopping-list', { name: newItem.trim() })
      setNewItem('')
      load()
    } catch {
      toast.error('Erro ao adicionar')
    }
  }

  const toggle = async (id) => {
    try {
      await api.patch(`/shopping-list/${id}/check`)
      setItems((prev) => prev.map((it) => it.id === id ? { ...it, is_checked: !it.is_checked } : it))
    } catch {}
  }

  const remove = async (id) => {
    try {
      await api.delete(`/shopping-list/${id}`)
      setItems((prev) => prev.filter((it) => it.id !== id))
    } catch {}
  }

  const unchecked = items.filter((i) => !i.is_checked)
  const checked = items.filter((i) => i.is_checked)

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 to-purple-700 px-4 pt-12 pb-6 text-white">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6" />
          <h1 className="text-lg font-bold">Lista de Compras</h1>
        </div>
        <p className="text-brand-200 text-sm mt-1">{unchecked.length} item(s) por comprar</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Add item */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            placeholder="Adicionar item..."
          />
          <button
            onClick={addItem}
            className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Items to buy */}
        {unchecked.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Por comprar</p>
            <ul className="divide-y divide-gray-50">
              {unchecked.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => toggle(item.id)}
                    className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
                  />
                  <span className="flex-1 text-sm text-gray-800">{item.name}</span>
                  {item.estimated_price && (
                    <span className="text-xs text-gray-400 mr-1">{item.estimated_price.toFixed(2)}€</span>
                  )}
                  <button onClick={() => remove(item.id)} className="text-gray-300 active:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Checked items */}
        {checked.length > 0 && (
          <div className="bg-gray-50 rounded-2xl overflow-hidden">
            <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Comprado</p>
            <ul className="divide-y divide-gray-100">
              {checked.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => toggle(item.id)}
                    className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </button>
                  <span className="flex-1 text-sm text-gray-400 line-through">{item.name}</span>
                  <button onClick={() => remove(item.id)} className="text-gray-300 active:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Lista vazia</p>
            <p className="text-sm">Adiciona o primeiro item acima</p>
          </div>
        )}
      </div>
    </div>
  )
}
