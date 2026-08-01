import React, { useEffect, useRef, useState } from 'react';
import Quagga from '@ericblade/quagga2';
import { X, Camera, Plus, Minus, Search, AlertCircle, RefreshCw, CheckCircle, ShieldCheck, Check } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { playBeepSound, validateBarcodeFormat, isValidEAN13, isValidEAN8, isValidUPCA } from '../utils/barcodeUtils';
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isHandlingScanRef = useRef<boolean>(false);
  const lastScannedCodeRef = useRef<string | null>(null);
  const scanDebounceTimerRef = useRef<any>(null);
  const candidateMapRef = useRef<Map<string, { count: number; lastTime: number }>>(new Map());

  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | undefined>(undefined);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [continuousMode, setContinuousMode] = useState(false);
  const [recentScansCount, setRecentScansCount] = useState(0);

  // Stop Quagga engine cleanly and release camera
  const stopScanner = () => {
    try {
      Quagga.offDetected(handleQuaggaDetected);
      Quagga.stop();
    } catch (e) {
      console.warn('Error stopping Quagga:', e);
    }

    if (scanDebounceTimerRef.current) {
      clearTimeout(scanDebounceTimerRef.current);
      scanDebounceTimerRef.current = null;
    }

    candidateMapRef.current.clear();
    setIsScanning(false);
    setIsLoading(false);
  };

  // Quagga detection callback with strict checksum & candidate filtering
  const handleQuaggaDetected = (data: any) => {
    if (!data || !data.codeResult || !data.codeResult.code) return;
    const rawCode = data.codeResult.code.trim();
    if (!rawCode || isHandlingScanRef.current) return;

    // 1. Basic format & length check
    if (!validateBarcodeFormat(rawCode)) return;

    // 2. Strict Checksum validation for EAN-13, EAN-8, UPC-A
    if (rawCode.length === 13 && /^\d{13}$/.test(rawCode)) {
      if (!isValidEAN13(rawCode)) return; // Reject false EAN-13 readings!
    } else if (rawCode.length === 8 && /^\d{8}$/.test(rawCode)) {
      if (!isValidEAN8(rawCode)) return; // Reject false EAN-8 readings!
    } else if (rawCode.length === 12 && /^\d{12}$/.test(rawCode)) {
      if (!isValidUPCA(rawCode)) return; // Reject false UPC-A readings!
    }

    // 3. Instant capture for mathematically verified EAN/UPC barcodes
    const isStrictChecksum = 
      (rawCode.length === 13 && isValidEAN13(rawCode)) ||
      (rawCode.length === 8 && isValidEAN8(rawCode)) ||
      (rawCode.length === 12 && isValidUPCA(rawCode));

    if (isStrictChecksum) {
      candidateMapRef.current.clear();
      handleBarcodeScanned(rawCode);
      return;
    }

    // 4. For non-checksum codes (Code 128, etc.), require 2 identical consecutive frames
    const now = Date.now();
    const entry = candidateMapRef.current.get(rawCode) || { count: 0, lastTime: 0 };

    if (now - entry.lastTime > 1500) {
      candidateMapRef.current.set(rawCode, { count: 1, lastTime: now });
      return;
    }

    const newCount = entry.count + 1;
    candidateMapRef.current.set(rawCode, { count: newCount, lastTime: now });

    if (newCount >= 2) {
      candidateMapRef.current.clear();
      handleBarcodeScanned(rawCode);
    }
  };

  // Start Quagga2 Barcode Engine
  const startQuaggaScanner = async () => {
    setCameraError(null);
    setSuccessMsg(null);
    setIsLoading(true);
    isHandlingScanRef.current = false;
    lastScannedCodeRef.current = null;

    stopScanner();

    // Check secure context (HTTPS / Localhost)
    const isHttps = typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost');
    if (!isHttps) {
      setCameraError('El acceso a la cámara en el navegador requiere estar en una conexión segura (HTTPS).');
      setIsLoading(false);
      return;
    }

    // Wait until target container element is rendered
    let targetEl: HTMLElement | null = null;
    for (let i = 0; i < 15; i++) {
      targetEl = containerRef.current || document.getElementById('quagga-reader-container');
      if (targetEl && targetEl.clientWidth > 0) break;
      await new Promise(res => setTimeout(res, 50));
    }

    if (!targetEl) {
      setCameraError('No se encontró el contenedor de cámara en la pantalla.');
      setIsLoading(false);
      return;
    }

    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: targetEl,
          constraints: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        locator: {
          patchSize: 'medium',
          halfSample: true
        },
        numOfWorkers: Math.min(navigator.hardwareConcurrency || 4, 4),
        frequency: 20,
        decoder: {
          readers: [
            'ean_reader',
            'ean_8_reader',
            'code_128_reader',
            'upc_reader',
            'upc_e_reader',
            'code_39_reader'
          ]
        },
        locate: true
      },
      (err: any) => {
        setIsLoading(false);

        if (err) {
          console.error('Quagga initialization error:', err);
          const errName = err?.name || '';
          const isPermissionErr = errName === 'NotAllowedError' || errName === 'PermissionDeniedError';
          
          setCameraError(
            isPermissionErr
              ? 'Permiso de cámara denegado. Presiona el icono del candado (🔒) en la barra de direcciones de tu navegador y autoriza la cámara.'
              : 'No se pudo acceder a la cámara de tu dispositivo. Por favor verifica los permisos o presiona Reintentar.'
          );
          setIsScanning(false);
          return;
        }

        try {
          Quagga.start();
          Quagga.onDetected(handleQuaggaDetected);
          setIsScanning(true);
        } catch (startErr) {
          console.error('Quagga start error:', startErr);
          setCameraError('Error al iniciar el flujo de video de la cámara.');
          setIsScanning(false);
        }
      }
    );
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
          startQuaggaScanner();
        }
      }, 200);

      return () => {
        isMounted = false;
        if (timer) clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  // Handle scanned barcode with debounce and product integration
  const handleBarcodeScanned = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode || isHandlingScanRef.current) return;

    if (lastScannedCodeRef.current === cleanCode && scanDebounceTimerRef.current) {
      return;
    }

    isHandlingScanRef.current = true;
    lastScannedCodeRef.current = cleanCode;

    // Play sound and haptic vibration feedback
    playBeepSound();

    // Show visual confirmation toast
    setSuccessMsg(`¡Código #${cleanCode} leído con Quagga!`);

    // Check if barcode belongs to an existing product in inventory
    const found = getProductByBarcode(cleanCode);

    if (found) {
      setScannedCode(cleanCode);
      setScannedProduct(found);
      setRecentScansCount(prev => prev + 1);

      if (!continuousMode) {
        stopScanner();
      } else {
        scanDebounceTimerRef.current = setTimeout(() => {
          isHandlingScanRef.current = false;
          lastScannedCodeRef.current = null;
        }, 1800);
      }
    } else {
      // Product DOES NOT exist -> Stop camera cleanly, close scanner, and populate Product Form
      setTimeout(() => {
        stopScanner();
        onSelectNewCode(cleanCode);
        onClose();
      }, 700);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    handleBarcodeScanned(manualCodeInput);
    setManualCodeInput('');
  };

  const handleQuickAdd = (delta: number) => {
    if (scannedProduct) {
      adjustQuantity(scannedProduct.id, delta, `Lector Quagga (${delta > 0 ? '+' : ''}${delta})`);
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
              <h3 className="font-serif font-bold text-[#2D2926] text-lg sm:text-xl leading-tight">Escáner de Barras Quagga2</h3>
              <p className="text-xs text-[#2D2926]/60">Reconocimiento multitrama 1D (EAN-13, EAN-8, UPC, Code 128)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#2D2926]/60 hover:text-[#2D2926] hover:bg-[#F7F3EF] rounded-sm transition"
            title="Cancelar escáner"
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

            <button
              onClick={startQuaggaScanner}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#2D2926] text-white hover:bg-[#403C39] rounded-sm transition uppercase font-bold text-[10px] tracking-wider"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reiniciar Cámara</span>
            </button>
          </div>

          {/* Camera Viewport Container for Quagga */}
          <div
            ref={containerRef}
            id="quagga-reader-container"
            className="relative overflow-hidden rounded-sm bg-black border-2 border-[#2D2926] min-h-[280px] sm:min-h-[300px] flex items-center justify-center [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_canvas.drawingBuffer]:absolute [&_canvas.drawingBuffer]:inset-0 [&_canvas.drawingBuffer]:pointer-events-none"
          >
            {/* Loading Indicator while camera initializes */}
            {isLoading && !cameraError && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white space-y-3 z-20">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                  Iniciando motor Quagga2...
                </span>
              </div>
            )}

            {/* Centered Scanning Frame & Laser Animation */}
            {isScanning && !cameraError && !isLoading && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center z-10">
                <div className="relative w-[85%] h-[55%] border-2 border-emerald-400 rounded-sm shadow-[0_0_20px_rgba(16,185,129,0.6)] flex items-center justify-center">
                  {/* Green Laser line */}
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_14px_#10b981] animate-pulse" />
                  
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400" />
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-300 bg-[#2D2926]/90 px-3.5 py-1.5 rounded-sm shadow-md border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Apunte la cámara al código de barras</span>
                </div>
              </div>
            )}

            {/* Success Toast Banner Overlay */}
            {successMsg && (
              <div className="absolute top-3 left-3 right-3 p-3 bg-emerald-900/90 border border-emerald-400 text-white rounded-sm text-xs text-center font-bold flex items-center justify-center gap-2 z-30 shadow-lg animate-fade-in">
                <Check className="w-4 h-4 text-emerald-300" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Camera Error Display */}
            {cameraError && (
              <div className="absolute inset-0 p-6 text-center space-y-3 bg-[#F7F3EF] text-[#2D2926] w-full h-full flex flex-col justify-center items-center z-30">
                <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
                <p className="text-xs text-[#2D2926]/80 font-medium max-w-xs">{cameraError}</p>
                <button
                  onClick={startQuaggaScanner}
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
              <strong>Lector Quagga2:</strong> Apunte la cámara al código de barras. Al detectar el código, se completará automáticamente en el formulario.
            </span>
          </div>

          {/* Scanned Product Card (if product already exists in inventory) */}
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
            className="px-4 py-1.5 bg-[#2D2926] text-white hover:bg-[#403C39] font-bold text-xs uppercase tracking-wider rounded-sm transition font-bold"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
};
