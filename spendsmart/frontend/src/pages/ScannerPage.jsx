import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { ArrowLeft, ScanLine, CheckCircle, Loader2, Camera, CameraOff } from 'lucide-react'
import toast from 'react-hot-toast'

const STATES = {
  REQUESTING: 'requesting',   // asking for camera permission
  SCANNING: 'scanning',       // camera active, scanning
  LOADING: 'loading',         // barcode found, looking up product
  FOUND: 'found',
  NOT_FOUND: 'not_found',
  ERROR: 'error',             // camera not available
}

export default function ScannerPage() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const [state, setState] = useState(STATES.REQUESTING)
  const [product, setProduct] = useState(null)
  const [price, setPrice] = useState('')
  const [store, setStore] = useState('')
  const [manualBarcode, setManualBarcode] = useState('')
  const [cameraLabel, setCameraLabel] = useState('')

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const lookupBarcode = useCallback(async (code) => {
    stopCamera()
    setState(STATES.LOADING)
    try {
      const { data } = await api.get(`/products/barcode/${code}`)
      setProduct(data)
      setState(STATES.FOUND)
    } catch {
      setProduct({ barcode: code, name: '', not_found: true })
      setState(STATES.NOT_FOUND)
    }
  }, [stopCamera])

  const startScanning = useCallback(async () => {
    setState(STATES.REQUESTING)
    try {
      // No facingMode constraint — works with Mac webcam and mobile back camera
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      const track = stream.getVideoTracks()[0]
      setCameraLabel(track.label || 'Câmara')

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setState(STATES.SCANNING)

      // Use BarcodeDetector if available (Chrome/Android/Safari 17+)
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
        })

        const detect = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            rafRef.current = requestAnimationFrame(detect)
            return
          }
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) {
              await lookupBarcode(barcodes[0].rawValue)
              return
            }
          } catch {}
          rafRef.current = requestAnimationFrame(detect)
        }
        rafRef.current = requestAnimationFrame(detect)

      } else {
        // Fallback: ZXing via canvas
        const { BrowserMultiFormatReader } = await import('@zxing/library')
        const reader = new BrowserMultiFormatReader()
        try {
          await reader.decodeFromStream(stream, videoRef.current, async (result, err) => {
            if (result) {
              reader.reset()
              await lookupBarcode(result.getText())
            }
          })
        } catch (e) {
          console.error('ZXing error:', e)
        }
      }

    } catch (err) {
      console.error('Camera error:', err)
      if (err.name === 'NotAllowedError') {
        toast.error('Permissão de câmara negada. Verifica as definições do browser.')
      } else {
        toast.error('Câmara não disponível neste dispositivo.')
      }
      setState(STATES.ERROR)
    }
  }, [lookupBarcode])

  useEffect(() => {
    startScanning()
    return () => stopCamera()
  }, [])

  const handleAdd = () => {
    navigate('/add', {
      state: {
        description: product?.name || '',
        amount: price ? parseFloat(price) : undefined,
        barcode: product?.barcode,
        category: product?.category || '',
        store,
      },
    })
  }

  const handleManualLookup = async () => {
    if (!manualBarcode.trim()) return
    await lookupBarcode(manualBarcode.trim())
  }

  const reset = () => {
    setProduct(null)
    setPrice('')
    setStore('')
    startScanning()
  }

  return (
    <div className="flex flex-col min-h-full bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center px-4 pt-12 pb-4">
        <button
          onClick={() => { stopCamera(); navigate(-1) }}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-white font-semibold ml-3">Scanner</h1>
        {cameraLabel && state === STATES.SCANNING && (
          <span className="ml-auto text-xs text-white/50 flex items-center gap-1">
            <Camera className="w-3 h-3" /> {cameraLabel.includes('back') || cameraLabel.includes('rear') ? 'Traseira' : 'Ativa'}
          </span>
        )}
      </div>

      {/* Camera view */}
      <div className="relative flex-1 flex items-center justify-center min-h-[55vh]">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
          autoPlay
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay states */}
        {state === STATES.REQUESTING && (
          <div className="relative z-10 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-full">A iniciar câmara...</p>
          </div>
        )}

        {state === STATES.SCANNING && (
          <div className="relative z-10 flex flex-col items-center">
            {/* Scan frame */}
            <div className="relative w-72 h-44">
              {/* Dimmed overlay with hole */}
              <div className="absolute -inset-[100vw] bg-black/50" style={{ clipPath: 'polygon(0 0, 100vw 0, 100vw 100vh, 0 100vh, 0 0, calc(50% - 144px) calc(50% - 88px), calc(50% - 144px) calc(50% + 88px), calc(50% + 144px) calc(50% + 88px), calc(50% + 144px) calc(50% - 88px), calc(50% - 144px) calc(50% - 88px))' }} />

              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-400 rounded-br-lg" />

              {/* Animated scan line */}
              <div className="absolute left-2 right-2 h-0.5 bg-brand-400 rounded-full shadow-lg shadow-brand-400/50 animate-[scan_2s_ease-in-out_infinite]"
                style={{ animation: 'scan 2s ease-in-out infinite' }} />
            </div>

            <p className="text-white/90 text-sm mt-5 bg-black/40 px-5 py-2 rounded-full backdrop-blur-sm flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-brand-400" />
              Aponta o código de barras para o quadro
            </p>
          </div>
        )}

        {state === STATES.LOADING && (
          <div className="relative z-10 bg-black/60 rounded-2xl p-6 flex flex-col items-center gap-3 backdrop-blur">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            <p className="text-white font-medium">Código detetado!</p>
            <p className="text-white/60 text-sm">A procurar produto...</p>
          </div>
        )}

        {state === STATES.ERROR && (
          <div className="relative z-10 flex flex-col items-center gap-3 px-8 text-center">
            <CameraOff className="w-12 h-12 text-white/40" />
            <p className="text-white font-medium">Câmara não disponível</p>
            <p className="text-white/60 text-sm">Verifica as permissões do browser nas definições do iPhone/Mac</p>
          </div>
        )}
      </div>

      {/* Bottom sheet */}
      <div className="relative z-20 bg-white rounded-t-3xl px-5 py-6 space-y-4 max-h-[50vh] overflow-y-auto">

        {/* Product found */}
        {state === STATES.FOUND && (
          <>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{product.name}</p>
                {product.brand && <p className="text-sm text-gray-500">{product.brand}</p>}
                <p className="text-xs text-gray-400 mt-0.5">Código: {product.barcode}</p>
                {product.category && (
                  <span className="inline-block mt-1 text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                    {product.category}
                  </span>
                )}
              </div>
            </div>

            {product?.price_history?.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">Histórico de preços</p>
                {product.price_history.slice(0, 3).map((ph, i) => (
                  <div key={i} className="flex justify-between text-sm py-0.5">
                    <span className="text-gray-600">{ph.store}</span>
                    <span className="font-medium">{ph.price.toFixed(2)}€</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Preço (€)</label>
                <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Loja</label>
                <input type="text" value={store} onChange={e => setStore(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  placeholder="ex: Lidl" />
              </div>
            </div>
            <button onClick={handleAdd}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-purple-600 text-white font-semibold shadow-md">
              Adicionar despesa
            </button>
            <button onClick={reset} className="w-full py-2 text-sm text-gray-400">
              ↩ Scannar outro produto
            </button>
          </>
        )}

        {/* Product not found */}
        {state === STATES.NOT_FOUND && (
          <>
            <div>
              <p className="font-medium text-gray-700">Produto não encontrado</p>
              <p className="text-sm text-gray-400 mb-2">Código: {product?.barcode}</p>
              <input type="text" placeholder="Escreve o nome do produto"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                onChange={e => setProduct(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Preço (€)</label>
                <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Loja</label>
                <input type="text" value={store} onChange={e => setStore(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  placeholder="ex: Lidl" />
              </div>
            </div>
            <button onClick={handleAdd}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-purple-600 text-white font-semibold shadow-md">
              Adicionar na mesma
            </button>
            <button onClick={reset} className="w-full py-2 text-sm text-gray-400">↩ Tentar novamente</button>
          </>
        )}

        {/* Scanning state — manual fallback */}
        {(state === STATES.SCANNING || state === STATES.ERROR) && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Introduzir código manualmente:</p>
            <div className="flex gap-2">
              <input type="text" value={manualBarcode} onChange={e => setManualBarcode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                placeholder="ex: 5601234567890" />
              <button onClick={handleManualLookup}
                className="px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold">
                Procurar
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center">
              O scanner usa a câmara traseira automaticamente
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 8px; opacity: 1; }
          50% { top: calc(100% - 8px); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
