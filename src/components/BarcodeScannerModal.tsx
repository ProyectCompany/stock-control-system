import React, { useEffect, useRef, useState } from 'react';
import Quagga from '@ericblade/quagga2';
import { X, Camera, Plus, Minus, Search, AlertCircle, RefreshCw, CheckCircle, ShieldCheck, Check, Edit3, ArrowRight, HelpCircle } from 'lucide-react';
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
  const [guidanceMsg, setGuidanceMsg] = useState<string>('Apunte la cámara al código de barras');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Results state
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | undefined>(undefined);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [manualCodeInput, setManualCodeInput] = useState('');
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
    if (!data || !data.codeResult || !data.codeResult.code) {
      setGuidanceMsg('Inténtelo otra vez • Enfoque el código');
      return;
    }

    const rawCode = data.codeResult.code.trim();
    if (!rawCode || isHandlingScanRef.current) return;

    // 1. Basic format & length check
    if (!validateBarcodeFormat(rawCode)) {
      setGuidanceMsg('Inténtelo otra vez • Código no reconocido');
      return;
    }

    // 2. Strict Checksum validation for EAN-13, EAN-8, UPC-A
    if (rawCode.length === 13 && /^\d{13}$/.test(rawCode)) {
      if (!isValidEAN13(rawCode)) {
        setGuidanceMsg('Inténtelo otra vez • Ajuste la distancia');
        return;
      }
    } else if (rawCode.length === 8 && /^\d{8}$/.test(rawCode)) {
      if (!isValidEAN8(rawCode)) {
        setGuidanceMsg('Inténtelo otra vez • Ajuste la distancia');
        return;
      }
    } else if (rawCode.length === 12 && /^\d{12}$/.test(rawCode)) {
      if (!isValidUPCA(rawCode)) {
        setGuidanceMsg('Inténtelo otra vez • Ajuste la distancia');
        return;
      }
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
      setGuidanceMsg('Inténtelo otra vez • Mantenga el pulso');
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
    setNotFoundBarcode(null);
    setScannedCode(null);
    setScannedProduct(undefined);
    setGuidanceMsg('Apunte la cámara al código de barras');
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
      setNotFoundBarcode(null);
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

  // Handle scanned barcode
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

    // Check if barcode belongs to an existing product in inventory
    const found = getProductByBarcode(cleanCode);

    stopScanner();

    if (found) {
      setSuccessMsg(`¡Producto Encontrado: ${found.name}!`);
      setScannedCode(cleanCode);
      setScannedProduct(found);
      setRecentScansCount(prev => prev + 1);
    } else {
      setNotFoundBarcode(cleanCode);
    }
  };

  const handleConfirmAddNewProduct = () => {
    if (notFoundBarcode) {
      onSelectNewCode(notFoundBarcode);
      onClose();
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
      adjustQuantity(scannedProduct.id, delta, `Lector Escáner (${delta > 0 ? '+' : ''}${delta})`);
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
              <h3 className="font-serif font-bold text-[#2D2926] text-lg sm:text-xl leading-tight">Escáner de Barras</h3>
              <p className="text-xs text-[#2D2926]/60">Búsqueda rápida y verificación de mercadería</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#2D2926]/60 hover:text-[#2D2926] hover:bg-[#F7F3EF] rounded-sm transition"
            title="Cerrar escáner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">

          {/* Controls Bar */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#EFE9E2] rounded-sm border border-[#2D2926]/10 text-xs">
            <span className="text-[11px] font-bold text-[#2D2926] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Detección de Alta Precisión</span>
            </span>

            <button
              onClick={startQuaggaScanner}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#2D2926] text-white hover:bg-[#403C39] rounded-sm transition uppercase font-bold text-[10px] tracking-wider"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Escanear Otro</span>
            </button>
          </div>

          {/* Camera Viewport Container for Quagga */}
          <div
            ref={containerRef}
            id="quagga-reader-container"
            className="relative overflow-hidden rounded-sm bg-black border-2 border-[#2D2926] min-h-[260px] sm:min-h-[280px] flex items-center justify-center [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_canvas.drawingBuffer]:absolute [&_canvas.drawingBuffer]:inset-0 [&_canvas.drawingBuffer]:pointer-events-none"
          >
            {/* Loading Indicator while camera initializes */}
            {isLoading && !cameraError && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white space-y-3 z-20">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                  Iniciando cámara trasera...
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
                  <span>{guidanceMsg}</span>
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

          {/* PROMINENT DIALOG: PRODUCT NOT FOUND ("¿No se encontró el producto, deseas agregarlo?") */}
          {notFoundBarcode && (
            <div className="p-4 bg-amber-500/10 border-2 border-amber-600/30 rounded-sm space-y-3 animate-fade-in shadow-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-600 text-white rounded-sm shrink-0">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-[#2D2926] text-sm sm:text-base leading-tight">
                    No se encontró el producto con el código: <span className="font-mono font-extrabold text-amber-900">#{notFoundBarcode}</span>
                  </h4>
                  <p className="text-xs text-[#2D2926]/80">
                    Este código no pertenece a ningún producto actualmente registrado en tu inventario. ¿Deseas darlo de alta ahora?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={startQuaggaScanner}
                  className="px-3 py-2 bg-[#EFE9E2] hover:bg-[#2D2926]/10 text-[#2D2926] font-bold text-xs uppercase tracking-wider rounded-sm transition"
                >
                  Escanear Otro
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddNewProduct}
                  className="px-4 py-2 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold text-xs uppercase tracking-wider rounded-sm transition flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Sí, Agregar Producto</span>
                </button>
              </div>
            </div>
          )}

          {/* PROMINENT CARD: PRODUCT FOUND IN FRONT OF USER */}
          {scannedCode && scannedProduct && (
            <div className="p-4 bg-emerald-950/10 border-2 border-emerald-600/30 rounded-sm space-y-3 animate-fade-in shadow-xl">
              <div className="flex items-center justify-between text-xs text-[#2D2926] font-mono">
                <span className="font-sans uppercase font-bold tracking-wider text-[10px] text-emerald-800 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>¡Producto Encontrado en Frente!</span>
                </span>
                <span className="bg-[#F7F3EF] px-2.5 py-0.5 rounded-sm border border-[#2D2926]/20 text-[#2D2926] font-bold text-sm">
                  #{scannedCode}
                </span>
              </div>

              <div className="flex items-center gap-3.5 p-3.5 bg-[#F7F3EF] rounded-sm border border-[#2D2926]/15 shadow-inner">
                {scannedProduct.imageUrl ? (
                  <img
                    src={scannedProduct.imageUrl}
                    alt={scannedProduct.name}
                    className="w-16 h-16 object-cover rounded-sm border border-[#2D2926]/20 shrink-0 shadow"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 bg-[#EFE9E2] rounded-sm flex items-center justify-center text-[#2D2926]/50 font-bold font-serif text-xl border border-[#2D2926]/15 shrink-0">
                    {scannedProduct.name.substring(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[#2D2926] text-sm sm:text-base leading-snug truncate font-sans">{scannedProduct.name}</h4>
                  <p className="text-xs text-[#2D2926]/70 mt-0.5">
                    Categoría: <strong className="text-[#2D2926]">{scannedProduct.category}</strong> • Precio: <strong className="text-emerald-900 font-mono">${scannedProduct.sellingPrice}</strong>
                  </p>
                  <p className="text-xs text-[#2D2926]/90 font-medium mt-1">
                    Stock actual: <strong className="text-[#2D2926] font-mono text-sm font-bold">{scannedProduct.quantity}</strong> {scannedProduct.unit}
                  </p>
                </div>

                {/* Stock Adjustment Controls */}
                <div className="flex flex-col gap-1 items-center justify-center pl-2 border-l border-[#2D2926]/10">
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
                  </div>
                  <button
                    onClick={() => handleQuickAdd(5)}
                    className="w-full py-0.5 bg-[#2D2926] hover:bg-[#403C39] text-white rounded-sm font-bold text-[10px] transition text-center"
                    title="Sumar 5"
                  >
                    +5
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={startQuaggaScanner}
                  className="px-3.5 py-2 bg-[#EFE9E2] hover:bg-[#2D2926]/10 text-[#2D2926] font-bold text-xs uppercase tracking-wider rounded-sm transition"
                >
                  Escanear Otro
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectNewCode(scannedCode);
                    onClose();
                  }}
                  className="px-4 py-2 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold text-xs uppercase tracking-wider rounded-sm transition flex items-center gap-1.5 shadow"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Editar Producto</span>
                </button>
              </div>
            </div>
          )}

          {/* Manual USB / Keyboard scanner search */}
          {!notFoundBarcode && !scannedProduct && (
            <form onSubmit={handleManualSearch} className="pt-1">
              <p className="text-[11px] text-[#2D2926]/70 font-medium mb-1">¿Ingresar manualmente o con pistola USB?</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escribe o escanea código..."
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs text-[#2D2926] focus:outline-none focus:border-[#2D2926] font-mono font-bold"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold text-xs uppercase tracking-wider rounded-sm transition flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Buscar</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#EFE9E2] border-t border-[#2D2926]/15 flex justify-between items-center text-xs font-sans text-[#2D2926]/70">
          <span>Escaneos en sesión: <strong className="text-[#2D2926] font-mono font-bold">{recentScansCount}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2D2926] text-white hover:bg-[#403C39] font-bold text-xs uppercase tracking-wider rounded-sm transition font-bold"
          >
            Cerrar Lector
          </button>
        </div>

      </div>
    </div>
  );
};
