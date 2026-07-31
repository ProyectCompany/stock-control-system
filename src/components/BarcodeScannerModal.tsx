import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { X, Camera, Plus, Minus, Search, AlertCircle, RefreshCw, CheckCircle, ShieldCheck, Check } from 'lucide-react';
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isHandlingScanRef = useRef<boolean>(false);
  const lastScannedCodeRef = useRef<string | null>(null);
  const scanDebounceTimerRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | undefined>(undefined);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [continuousMode, setContinuousMode] = useState(false);
  const [recentScansCount, setRecentScansCount] = useState(0);

  // Cleanly stop scanner and release all hardware camera tracks
  const stopScanner = () => {
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch (e) {
        console.warn('Error closing ZXing reader:', e);
      }
      readerRef.current = null;
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      } catch (e) {
        console.warn('Error stopping stream tracks:', e);
      }
      streamRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const activeStream = videoRef.current.srcObject as MediaStream;
        activeStream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      } catch (e) {
        console.warn('Error clearing video srcObject:', e);
      }
    }

    if (scanDebounceTimerRef.current) {
      clearTimeout(scanDebounceTimerRef.current);
      scanDebounceTimerRef.current = null;
    }

    setIsScanning(false);
    setIsLoading(false);
  };

  // Start ZXing Browser Scanner Engine
  const startZXingScanner = async () => {
    setCameraError(null);
    setSuccessMsg(null);
    setIsLoading(true);
    isHandlingScanRef.current = false;
    lastScannedCodeRef.current = null;

    stopScanner();

    // Check secure context
    const isHttps = typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost');
    if (!isHttps) {
      setCameraError('El acceso a la cámara en el navegador requiere estar en una conexión segura (HTTPS).');
      setIsLoading(false);
      return;
    }

    // Verify browser supports mediaDevices API
    if (!navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Tu navegador o dispositivo no admite el acceso directo a la cámara.');
      setIsLoading(false);
      return;
    }

    try {
      // Configure formats: EAN-13, EAN-8, UPC-A, UPC-E, CODE-128, CODE-39
      const hints = new Map();
      const formats = [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39
      ];
      hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints);
      readerRef.current = codeReader;

      // Progressive constraint strategy for rear camera
      let mediaStream: MediaStream | null = null;
      const constraintCandidates = [
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: { facingMode: 'environment' } },
        { video: { facingMode: 'user' } },
        { video: true }
      ];

      let lastError: any = null;
      for (const constraints of constraintCandidates) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          if (mediaStream) break;
        } catch (e) {
          lastError = e;
        }
      }

      if (!mediaStream) {
        throw lastError || new Error('No camera stream available');
      }

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play promise deferred:', playErr);
        }
      }

      setIsLoading(false);
      setIsScanning(true);

      // Start continuous ZXing decoding loop
      codeReader.decodeFromStream(mediaStream, videoRef.current, (result, error) => {
        if (result && result.getText()) {
          const rawText = result.getText().trim();
          if (rawText) {
            handleBarcodeScanned(rawText);
          }
        }
      });

    } catch (err: any) {
      console.error('ZXing Scanner initialization failed:', err);
      setIsLoading(false);
      setIsScanning(false);

      const errName = err?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError(
          'Permiso de cámara denegado. Haz clic en el ícono del candado (🔒) en la barra de direcciones de tu navegador y autoriza el acceso a la cámara.'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError('No se encontró ninguna cámara disponible en tu dispositivo.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraError('La cámara ya está siendo utilizada por otra aplicación. Por favor ciérrala y vuelve a intentarlo.');
      } else {
        setCameraError('Error al iniciar la cámara. Verifica los permisos de tu navegador o presiona Reintentar.');
      }
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
          startZXingScanner();
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

    // Prevent immediate duplicate readings of the exact same code
    if (lastScannedCodeRef.current === cleanCode && scanDebounceTimerRef.current) {
      return;
    }

    isHandlingScanRef.current = true;
    lastScannedCodeRef.current = cleanCode;

    // Play sound and haptic vibration feedback
    playBeepSound();

    // Show visual confirmation toast
    setSuccessMsg(`¡Código #${cleanCode} leído correctamente!`);

    // Check if barcode belongs to an existing product in inventory
    const found = getProductByBarcode(cleanCode);

    if (found) {
      setScannedCode(cleanCode);
      setScannedProduct(found);
      setRecentScansCount(prev => prev + 1);

      if (!continuousMode) {
        // Stop scanning, release camera, and show product card
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
      adjustQuantity(scannedProduct.id, delta, `Lector ZXing (${delta > 0 ? '+' : ''}${delta})`);
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
              <h3 className="font-serif font-bold text-[#2D2926] text-lg sm:text-xl leading-tight">Escáner de Barras ZXing</h3>
              <p className="text-xs text-[#2D2926]/60">Lectura profesional multilente (EAN-13, EAN-8, UPC, Code 128)</p>
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
              onClick={startZXingScanner}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#2D2926] text-white hover:bg-[#403C39] rounded-sm transition uppercase font-bold text-[10px] tracking-wider"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reiniciar Cámara</span>
            </button>
          </div>

          {/* Camera Viewport Container */}
          <div
            className="relative overflow-hidden rounded-sm bg-black border-2 border-[#2D2926] min-h-[280px] sm:min-h-[300px] flex items-center justify-center"
          >
            {/* HTML5 Video Element for ZXing Stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

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
                  <span>Buscando código... Apunte la cámara al código</span>
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
                  onClick={startZXingScanner}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#2D2926] hover:bg-[#403C39] rounded-sm transition"
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
              <strong>Lector ZXing:</strong> Apunte la cámara al código de barras. Al detectar el código, se completará automáticamente en el formulario.
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
