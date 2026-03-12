import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
import api from '../utils/api'
import { ArrowLeft, ScanLine, CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const STATES = {
  SCANNING: 'scanning',
  LOADING: 'loading',
  FOUND: 'found',
  NOT_FOUND: 'not_found',
}

export default function ScannerPage() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [state, setState] = useState(STATES.SCANNING)
  const [product, setProduct] = useState(null)
  const [price, setPrice] = useState('')
  const [store, setStore] = useState('')
  const [manualBarcode, setManualBarcode] = useState('')

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    reader.decodeFromVideoDevice(null, videoRef.current, async (result, err) => {
      if (result) {
        reader.reset()
        const code = result.getText()
        setState(STATES.LOADING)
        try {
          const { data } = await api.get(`/products/barcode/${code}`)
          setProduct(data)
          setState(STATES.FOUND)
        } catch {
          setProduct({ barcode: code, name: '', not_found: true })
          setState(STATES.NOT_FOUND)
        }
      }
    }).catch(() => {
      toast.error('Câmara não disponível')
    })

    return () => {
      try { reader.reset() } catch {}
    }
  }, [])

  const handleAdd = () => {
    navigate('/add', {
      state: {
        description: product?.name || manualBarcode,
        amount: price ? parseFloat(price) : undefined,
        barcode: product?.barcode,
        category: product?.category || '',
        store,
      },
    })
  }

  const handleManualLookup = async () => {
    if (!manualBarcode) return
    setState(STATES.LOADING)
    try {
      const { data } = await api.get(`/products/barcode/${manualBarcode}`)
      setProduct(data)
      setState(STATES.FOUND)
    } catch {
      setProduct({ barcode: manualBarcode, name: '', not_found: true })
      setState(STATES.NOT_FOUND)
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-black">
      {/* Back button */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center px-4 pt-12 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-white font-semibold ml-3">Scanner de Código de Barras</h1>
      </div>

      {/* Video */}
      <div className="relative flex-1 flex items-center justify-center">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />

        {/* Scan overlay */}
        {state === STATES.SCANNING && (
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-64 h-40 border-2 border-white rounded-2xl relative">
              <div className="absolute inset-0 overflow-hidden rounded-2xl">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-brand-400 animate-bounce" style={{ animationDuration: '1.5s' }} />
              </div>
              {/* Corner decorations */}
              {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                <div key={i} className={`absolute w-6 h-6 border-4 border-brand-400 ${pos} ${i < 2 ? '' : ''}`} style={{
                  borderRight: i % 2 === 0 ? 'none' : undefined,
                  borderLeft: i % 2 === 1 ? 'none' : undefined,
                  borderBottom: i < 2 ? 'none' : undefined,
                  borderTop: i >= 2 ? 'none' : undefined,
                  borderRadius: i === 0 ? '8px 0 0 0' : i === 1 ? '0 8px 0 0' : i === 2 ? '0 0 0 8px' : '0 0 8px 0',
                }} />
              ))}
            </div>
            <p className="text-white/80 text-sm mt-4 backdrop-blur-sm bg-black/30 px-4 py-1.5 rounded-full">
              <ScanLine className="w-4 h-4 inline mr-2" />
              Aponta para o código de barras
            </p>
          </div>
        )}

        {state === STATES.LOADING && (
          <div className="relative z-10 bg-black/50 rounded-2xl p-6 flex flex-col items-center gap-3 backdrop-blur">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            <p className="text-white">A procurar produto...</p>
          </div>
        )}
      </div>

      {/* Bottom sheet */}
      <div className="relative z-20 bg-white rounded-t-3xl px-5 py-6 space-y-4">
        {(state === STATES.FOUND || state === STATES.NOT_FOUND) && (
          <>
            {state === STATES.FOUND ? (
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800">{product.name}</p>
                  {product.brand && <p className="text-sm text-gray-500">{product.brand}</p>}
                  {product.category && (
                    <span className="inline-block mt-1 text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                      {product.category}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-700 font-medium">Produto não encontrado</p>
                <p className="text-sm text-gray-500">Código: {product?.barcode}</p>
                <input
                  type="text"
                  placeholder="Nome do produto"
                  className="w-full mt-2 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  onChange={(e) => setProduct((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
            )}

            {/* Price history */}
            {product?.price_history?.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">Histórico de preços</p>
                <div className="space-y-1">
                  {product.price_history.slice(0, 3).map((ph, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-600">{ph.store}</span>
                      <span className="font-medium text-gray-800">{ph.price.toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Preço (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Loja</label>
                <input
                  type="text"
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  placeholder="ex: Lidl"
                />
              </div>
            </div>

            <button
              onClick={handleAdd}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-purple-600 text-white font-semibold shadow-md active:scale-95 transition-transform"
            >
              Adicionar despesa
            </button>

            <button
              onClick={() => { setState(STATES.SCANNING); setProduct(null) }}
              className="w-full py-2 text-sm text-gray-500 active:text-gray-700"
            >
              Scannar outro produto
            </button>
          </>
        )}

        {state === STATES.SCANNING && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Ou introduz o código manualmente:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                placeholder="Código de barras"
              />
              <button
                onClick={handleManualLookup}
                className="px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium"
              >
                Procurar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
