import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import Quagga from '@ericblade/quagga2';
import { X, Camera, Plus, Minus, Search, AlertCircle, RefreshCw, Flashlight, CheckCircle, Zap, ShieldCheck } from 'lucide-react';
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const quaggaContainerRef = useRef<HTMLDivElement | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isHandlingScanRef = useRef<boolean>(false);
  const candidateMapRef = useRef<Map<string, { count: number; lastTime: number }>>(new Map());

  const [scannerEngine, setScannerEngine] = useState<'ZXing' | 'Quagga'>('ZXing');
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

  // Stop scanner & free camera media tracks
  const stopScanner = async () => {
    // Stop ZXing
    if (zxingReaderRef.current) {
      try {
        zxingReaderRef.current.reset();
      } catch (e) {
        // ignore
      }
      zxingReaderRef.current = null;
    }

    // Stop Quagga
    try {
      Quagga.offDetected(onQuaggaDetected);
      Quagga.stop();
    } catch (err) {
      // ignore
    }

    // Stop media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const activeStream = videoRef.current.srcObject as MediaStream;
      activeStream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
    setTorchOn(false);
    candidateMapRef.current.clear();
  };

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    try {
      let activeTrack: MediaStreamTrack | null = null;
      if (streamRef.current) {
        activeTrack = streamRef.current.getVideoTracks()[0] || null;
      } else {
        activeTrack = Quagga.CameraAccess.getActiveTrack();
      }

      if (activeTrack && 'applyConstraints' in activeTrack) {
        const nextState = !torchOn;
        await (activeTrack as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setTorchOn(nextState);
      }
    } catch (err) {
      console.warn('Torch toggle failed', err);
    }
  };

  const checkTorchSupport = (track: MediaStreamTrack) => {
    try {
      if (track && 'getCapabilities' in track) {
        const capabilities = (track as any).getCapabilities();
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
          return;
        }
      }
    } catch (e) {
      // ignore
    }
    setHasTorch(false);
  };

  // Raw candidate filtering with checksum & consensus verification
  const processCandidateCode = (rawCode: string, engineName: string) => {
    if (!rawCode || isHandlingScanRef.current) return;
    const code = rawCode.trim();

    // 1. Strict Checksum & Format Validation
    if (!validateBarcodeFormat(code)) {
      setScanStatusMsg(`Descartando lectura parcial/inválida (${code})`);
      return;
    }

    // 2. Consensus Buffer Check (Require at least 2 identical frames within 1 second)
    const now = Date.now();
    const entry = candidateMapRef.current.get(code) || { count: 0, lastTime: 0 };
    
    // Reset candidate if older than 1.2 seconds
    if (now - entry.lastTime > 1200) {
      candidateMapRef.current.set(code, { count: 1, lastTime: now });
      setScanStatusMsg(`Verificando código ${code}... Mantenga firme`);
      return;
    }

    const newCount = entry.count + 1;
    candidateMapRef.current.set(code, { count: newCount, lastTime: now });

    if (newCount >= 2) {
      // Confirmed checksum + consensus match!
      candidateMapRef.current.clear();
      setScanStatusMsg(`¡Código 100% verificado por ${engineName}!`);
      handleBarcodeDetected(code);
    }
  };

  // Quagga callback
  const onQuaggaDetected = (data: any) => {
    if (data && data.codeResult && data.codeResult.code) {
      processCandidateCode(data.codeResult.code, 'Quagga 1D');
    }
  };

  // Primary Industrial Engine: ZXing
  const startZXingScanner = async () => {
    setCameraError(null);
    isHandlingScanRef.current = false;
    await stopScanner();

    if (!videoRef.current) return;

    try {
      const hints = new Map();
      const formats = [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E
      ];
      hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints);
      zxingReaderRef.current = codeReader;

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) checkTorchSupport(videoTrack);

      setScannerEngine('ZXing');
      setIsScanning(true);
      setScanStatusMsg('Lector ZXing HD Activo con Verificación Checksum');

      codeReader.decodeFromStream(mediaStream, videoRef.current, (result, error) => {
        if (result && result.getText()) {
          processCandidateCode(result.getText(), 'ZXing HD');
        }
      });
    } catch (err) {
      console.warn('ZXing scanner start failed, switching to Quagga engine fallback', err);
      startQuaggaFallbackScanner();
    }
  };

  // Fallback Engine: Quagga 2 with strict filters
  const startQuaggaFallbackScanner = async () => {
    setScannerEngine('Quagga');
    if (!quaggaContainerRef.current) return;

    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: quaggaContainerRef.current,
          constraints: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        locator: {
          patchSize: 'large',
          halfSample: false
        },
        numOfWorkers: navigator.hardwareConcurrency || 4,
        frequency: 15,
        decoder: {
          readers: [
            'ean_reader',
            'ean_8_reader',
            'code_128_reader',
            'upc_reader',
            'upc_e_reader'
          ]
        },
        locate: true
      },
      (err) => {
        if (err) {
          console.error('Quagga init error:', err);
          setCameraError(
            'No se pudo acceder a la cámara. Por favor otorga permisos de cámara a tu navegador (Chrome/Safari/Edge) o ingresa el código manualmente.'
          );
          setIsScanning(false);
          return;
        }

        Quagga.start();
        Quagga.onDetected(onQuaggaDetected);
        checkTorchSupport(Quagga.CameraAccess.getActiveTrack());
        setIsScanning(true);
        setScanStatusMsg('Lector Quagga Activo (Modo Verificado)');
      }
    );
  };

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      setScannedCode(null);
      setScannedProduct(undefined);
      setRecentScansCount(0);

      const timer = setTimeout(() => {
        if (isMounted) {
          startZXingScanner();
        }
      }, 250);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  // Confirmed barcode detection
  const handleBarcodeDetected = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode || isHandlingScanRef.current) return;

    isHandlingScanRef.current = true;
    playBeepSound();

    const found = getProductByBarcode(cleanCode);
    if (found) {
      // Product EXISTS -> Show product card with stock adjustments
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
      // Product DOES NOT EXIST -> AUTOMATIC DIRECT REDIRECTION TO ADD PRODUCT!
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
      adjustQuantity(scannedProduct.id, delta, `Lector HD ${scannerEngine} (${delta > 0 ? '+' : ''}${delta})`);
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
              <p className="text-xs text-[#2D2926]/60">Lectura 100% exacta con verificación Checksum EAN-13/UPC</p>
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
              <span>Escaneo continuo</span>
            </label>

            <div className="flex items-center gap-2">
              {/* Flashlight Button */}
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
                onClick={startZXingScanner}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#2D2926] text-white hover:bg-[#403C39] rounded-sm transition uppercase font-bold text-[10px] tracking-wider"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>

          {/* Camera Viewport Area */}
          <div
            ref={quaggaContainerRef}
            className="relative overflow-hidden rounded-sm bg-black border-2 border-[#2D2926] min-h-[260px] sm:min-h-[280px] flex items-center justify-center [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_canvas]:absolute [&_canvas]:inset-0 [&_canvas]:pointer-events-none"
          >
            {/* HTML5 Video Element for ZXing */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Scanning Laser Overlay effect */}
            {isScanning && !cameraError && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center z-10">
                <div className="relative w-[85%] h-[55%] border-2 border-emerald-400 rounded-sm shadow-[0_0_20px_rgba(16,185,129,0.6)] flex items-center justify-center">
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
              <div className="p-6 text-center space-y-3 bg-[#F7F3EF] text-[#2D2926] w-full h-full flex flex-col justify-center items-center z-20">
                <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
                <p className="text-xs text-[#2D2926]/80 font-medium">{cameraError}</p>
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
              <strong>Lector de Alta Precisión:</strong> Apunta el código al recuadro verde. La app valida automáticamente el checksum completo (EAN-13, EAN-8, UPC) para garantizar 0 errores.
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
