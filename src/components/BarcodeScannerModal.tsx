import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Plus, Minus, Search, AlertCircle, RefreshCw, Flashlight, CheckCircle, ShieldCheck } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { playBeepSound } from '../utils/barcodeUtils';
import { Product } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNewCode: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectNewCode
}) => {
  const { getProductByBarcode, adjustQuantity } = useInventory();

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isHandlingScanRef = useRef<boolean>(false);

  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | undefined>(undefined);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [continuousMode, setContinuousMode] = useState(true);
  const [recentScansCount, setRecentScansCount] = useState(0);
  const [scanStatusMsg, setScanStatusMsg] = useState<string>('Apunte al código completo del producto');

  // Stop scanner & free camera media tracks safely
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Error al detener scanner:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextState = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }] as any
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  const startEngine = async () => {
    setCameraError(null);
    isHandlingScanRef.current = false;
    await stopScanner();

    // Ensure secure context (HTTPS / Localhost)
    const isHttps = typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost');
    if (!isHttps) {
      setCameraError('El acceso a la cámara en el navegador requiere estar en una conexión segura (HTTPS).');
      return;
    }

    // Wait until DOM element #html5-reader-viewport exists in DOM
    let container: HTMLElement | null = null;
    for (let i = 0; i < 15; i++) {
      container = document.getElementById('html5-reader-viewport');
      if (container) break;
      await new Promise(res => setTimeout(res, 40));
    }

    if (!container) return;

    try {
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.QR_CODE
      ];

      const html5QrCode = new Html5Qrcode('html5-reader-viewport', {
        formatsToSupport,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        verbose: false
      });

      scannerRef.current = html5QrCode;

      const config = {
        fps: 25,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.min(viewfinderWidth - 20, 420);
          const height = Math.min(viewfinderHeight - 20, 220);
          return { width: Math.max(width, 200), height: Math.max(height, 100) };
        },
        aspectRatio: 1.333333,
        disableFlip: false
      };

      const onScanSuccess = (decodedText: string) => {
        if (!decodedText || isHandlingScanRef.current) return;
        const clean = decodedText.trim();
        if (!clean) return;

        handleBarcodeDetected(clean);
      };

      const onScanError = () => {
        // Silent frame scanning
      };

      // Standard facingMode environment works on 100% of iOS, Android, and Desktop browsers
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanError
      );

      setIsScanning(true);
      setScanStatusMsg('Lector Activo • Apunte al código');

      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        }
      } catch (tErr) {}

    } catch (err: any) {
      console.error('Html5Qrcode engine failed to start:', err);
      const isPermissionErr = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      setCameraError(
        isPermissionErr
          ? 'Permiso de cámara denegado. Presiona el icono del candado (🔒) en la barra de direcciones de tu navegador y autoriza la cámara.'
          : 'No se pudo acceder a la cámara. Por favor otorga permisos a tu navegador o presiona Reintentar.'
      );
      setIsScanning(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let timer: any = null;

    if (isOpen) {
      setScannedCode(null);
      setScannedProduct(undefined);
      setRecentScansCount(0);

      timer = setTimeout(() => {
        if (isMounted) {
          startEngine();
        }
      }, 150);

      return () => {
        isMounted = false;
        if (timer) clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  const handleBarcodeDetected = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode || isHandlingScanRef.current) return;

    isHandlingScanRef.current = true;
    playBeepSound();

    const found = getProductByBarcode(cleanCode);
    if (found) {
      setScannedCode(cleanCode);
      setScannedProduct(found);
      setRecentScansCount(prev => prev + 1);

      if (!continuousMode) {
        stopScanner();
      } else {
        setTimeout(() => {
          isHandlingScanRef.current = false;
        }, 1500);
      }
    } else {
      stopScanner();
      onSelectNewCode(cleanCode);
      onClose();
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    handleBarcodeDetected(manualCodeInput);
    setManualCodeInput('');
  };

  const handleQuickAdd = (delta: number) => {
    if (scannedProduct) {
      adjustQuantity(scannedProduct.id, delta, `Lector Industrial (${delta > 0 ? '+' : ''}${delta})`);
      setScannedProduct(prev => prev ? { ...prev, quantity: Math.max(0, prev.quantity + delta) } : undefined);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#2D2926]/70 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-lg overflow-hidden bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm shadow-2xl text-[#2D2926] flex flex-col max-h-[94vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#EFE9E2] border-b border-[#2D2926]/15">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#2D2926] text-white rounded-sm">
              <Camera className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#2D2926] text-lg sm:text-xl leading-tight">Escáner de Barras HD</h3>
              <p className="text-xs text-[#2D2926]/60">Detección nativa por hardware en pantalla completa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#2D2926]/60 hover:text-[#2D2926] hover:bg-[#F7F3EF] rounded-sm transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">

          {/* Controls Bar */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#EFE9E2] rounded-sm border border-[#2D2926]/10 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-[#2D2926] font-bold uppercase tracking-wider text-[11px]">
              <input
                type="checkbox"
                checked={continuousMode}
                onChange={(e) => setContinuousMode(e.target.checked)}
                className="w-4 h-4 accent-[#2D2926]"
              />
              <span>Modo continuo</span>
            </label>

            <div className="flex items-center gap-2">
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider transition ${
                    torchOn ? 'bg-amber-400 text-amber-950 font-extrabold' : 'bg-[#2D2926] text-white'
                  }`}
                  title="Encender / Apagar Linterna"
                >
                  <Flashlight className="w-3.5 h-3.5" />
                  <span>{torchOn ? 'Luz ON' : 'Luz OFF'}</span>
                </button>
              )}

              <button
                onClick={startEngine}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#2D2926] text-white hover:bg-[#403C39] rounded-sm transition uppercase font-bold text-[10px] tracking-wider"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>

          {/* Camera Viewport Area */}
          <div
            className="relative overflow-hidden rounded-sm bg-black border-2 border-[#2D2926] min-h-[280px] sm:min-h-[300px] flex items-center justify-center"
          >
            {/* Target element for Html5Qrcode */}
            <div
              id="html5-reader-viewport"
              style={{ width: '100%', minHeight: '280px' }}
              className="w-full h-full min-h-[280px] [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
            />

            {/* Scanning Laser Overlay effect */}
            {isScanning && !cameraError && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center z-10">
                <div className="relative w-[90%] h-[55%] border-2 border-emerald-400 rounded-sm shadow-[0_0_20px_rgba(16,185,129,0.6)] flex items-center justify-center">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_14px_#10b981] animate-pulse" />
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-300 bg-[#2D2926]/90 px-3 py-1 rounded-sm shadow-md border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>{scanStatusMsg}</span>
                </div>
              </div>
            )}

            {/* Camera Error Fallback */}
            {cameraError && (
              <div className="absolute inset-0 p-6 text-center space-y-3 bg-[#F7F3EF] text-[#2D2926] w-full h-full flex flex-col justify-center items-center z-20">
                <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
                <p className="text-xs text-[#2D2926]/80 font-medium">{cameraError}</p>
                <button
                  onClick={startEngine}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#2D2926] hover:bg-[#403C39] rounded-sm transition font-bold"
                >
                  Reintentar Cámara
                </button>
              </div>
            )}
          </div>

          {/* Usage Tip */}
          <div className="p-3 bg-[#EFE9E2] border border-[#2D2926]/10 rounded-sm text-[11px] text-[#2D2926]/80 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Escaneo Instantáneo:</strong> Apunta la cámara al código de barras. La lectura se realiza de forma automática por hardware.
            </span>
          </div>

          {/* Scanned Product Card */}
          {scannedCode && scannedProduct && (
            <div className="p-3.5 bg-[#EFE9E2] border border-[#2D2926]/20 rounded-sm space-y-2.5 animate-fade-in shadow-md">
              <div className="flex items-center justify-between text-xs text-[#2D2926] font-mono">
                <span className="font-sans uppercase font-bold tracking-wider text-[10px] text-[#2D2926]/60">Código Verificado:</span>
                <span className="bg-[#F7F3EF] px-2.5 py-0.5 rounded-sm border border-[#2D2926]/20 text-[#2D2926] font-bold text-sm">
                  #{scannedCode}
                </span>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#F7F3EF] rounded-sm border border-[#2D2926]/10">
                {scannedProduct.imageUrl ? (
                  <img
                    src={scannedProduct.imageUrl}
                    alt={scannedProduct.name}
                    className="w-12 h-12 object-cover rounded-sm border border-[#2D2926]/15"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 bg-[#EFE9E2] rounded-sm flex items-center justify-center text-[#2D2926]/40 font-bold font-serif text-base">
                    {scannedProduct.name.substring(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[#2D2926] truncate text-xs sm:text-sm">{scannedProduct.name}</h4>
                  <p className="text-[11px] text-[#2D2926]/60">{scannedProduct.category} • ${scannedProduct.sellingPrice}</p>
                  <p className="text-xs text-[#2D2926]/80 font-medium mt-0.5">
                    Stock actual: <strong className="text-[#2D2926] font-mono font-bold">{scannedProduct.quantity}</strong> {scannedProduct.unit}
                  </p>
                </div>

                {/* Stock Adjustment Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleQuickAdd(-1)}
                    className="p-1.5 bg-[#2D2926] hover:bg-[#403C39] text-white rounded-sm transition"
                    title="Restar 1"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleQuickAdd(1)}
                    className="p-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-sm transition font-bold"
                    title="Sumar 1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleQuickAdd(5)}
                    className="px-2 py-1 bg-[#2D2926] hover:bg-[#403C39] text-white rounded-sm font-bold text-xs transition"
                    title="Sumar 5"
                  >
                    +5
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Manual USB / Keyboard scanner search */}
          <form onSubmit={handleManualSearch} className="pt-1">
            <p className="text-[11px] text-[#2D2926]/70 font-medium mb-1">¿Ingresar manualmente o con pistola USB?</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Escribe o escanea aquí..."
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs text-[#2D2926] focus:outline-none focus:border-[#2D2926] font-mono font-bold"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold text-xs uppercase tracking-wider rounded-sm transition flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Ingresar</span>
              </button>
            </div>
          </form>

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#EFE9E2] border-t border-[#2D2926]/15 flex justify-between items-center text-xs font-sans text-[#2D2926]/70">
          <span>Escaneos en sesión: <strong className="text-[#2D2926] font-mono font-bold">{recentScansCount}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2D2926] text-white hover:bg-[#403C39] font-bold text-xs uppercase tracking-wider rounded-sm transition"
          >
            Cerrar Lector
          </button>
        </div>

      </div>
    </div>
  );
};
