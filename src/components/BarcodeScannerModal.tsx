import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import Quagga from '@ericblade/quagga2';
import { X, Camera, Plus, Minus, Search, AlertCircle, RefreshCw, Zap, Flashlight, CheckCircle } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { playBeepSound } from '../utils/barcodeUtils';
import { Product } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNewCode: (barcode: string) => void;
}

type ScanEngineMode = 'zxing' | 'quagga' | 'native';

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectNewCode
}) => {
  const { getProductByBarcode, adjustQuantity } = useInventory();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isHandlingScanRef = useRef<boolean>(false);

  const [activeEngine, setActiveEngine] = useState<ScanEngineMode>('zxing');
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | undefined>(undefined);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [continuousMode, setContinuousMode] = useState(true);
  const [recentScansCount, setRecentScansCount] = useState(0);

  // Stop all active camera streams & scanner engines
  const stopAllScanners = async () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // Stop ZXing
    if (zxingReaderRef.current) {
      try {
        zxingReaderRef.current.reset();
      } catch (err) {
        console.warn('Error resetting ZXing reader', err);
      }
      zxingReaderRef.current = null;
    }

    // Stop Quagga
    try {
      Quagga.stop();
    } catch (err) {
      // Quagga might not be initialized
    }

    // Stop MediaStream Tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
    setTorchOn(false);
  };

  // Toggle Camera Flashlight / Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Torch failed', err);
      }
    }
  };

  // Check if camera supports Torch / Flashlight
  const checkTorchSupport = (stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    if (track && 'getCapabilities' in track) {
      const capabilities = (track as any).getCapabilities();
      if (capabilities && capabilities.torch) {
        setHasTorch(true);
        return;
      }
    }
    setHasTorch(false);
  };

  // ENGINE 1: ZXing BrowserMultiFormatReader (High precision with TRY_HARDER for mobile)
  const startZXingEngine = async () => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.ITF
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const codeReader = new BrowserMultiFormatReader(hints);
    zxingReaderRef.current = codeReader;

    const constraints: any = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920, min: 1280 },
        height: { ideal: 1080, min: 720 },
        focusMode: { ideal: 'continuous' }
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;
    checkTorchSupport(stream);

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    codeReader.decodeFromStream(stream, videoRef.current!, (result, error) => {
      if (result && result.getText()) {
        handleBarcodeDetected(result.getText());
      }
    });

    setIsScanning(true);
  };

  // ENGINE 2: Quagga2 Stream Engine (Dedicated 1D mobile barcode locator)
  const startQuaggaEngine = async () => {
    return new Promise<void>((resolve, reject) => {
      Quagga.init(
        {
          inputStream: {
            type: 'LiveStream',
            target: videoRef.current!,
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
          numOfWorkers: navigator.hardwareConcurrency || 4,
          decoder: {
            readers: [
              'ean_reader',
              'ean_8_reader',
              'code_128_reader',
              'code_39_reader',
              'upc_reader',
              'upc_e_reader',
              'i2of5_reader'
            ]
          },
          locate: true
        },
        (err) => {
          if (err) {
            console.error('Quagga init error:', err);
            reject(err);
            return;
          }
          Quagga.start();
          Quagga.onDetected((data) => {
            if (data && data.codeResult && data.codeResult.code) {
              handleBarcodeDetected(data.codeResult.code);
            }
          });
          setIsScanning(true);
          resolve();
        }
      );
    });
  };

  // ENGINE 3: Native Browser BarcodeDetector Engine
  const startNativeEngine = async () => {
    if (!('BarcodeDetector' in window)) {
      throw new Error('BarcodeDetector not supported natively in this browser');
    }

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;
    checkTorchSupport(stream);

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    const detector = new (window as any).BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code', 'itf']
    });

    const loopNative = async () => {
      if (videoRef.current && videoRef.current.readyState >= 2 && !isHandlingScanRef.current) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            handleBarcodeDetected(barcodes[0].rawValue);
          }
        } catch (e) {
          // ignore frame detection exception
        }
      }
      if (streamRef.current) {
        animFrameRef.current = requestAnimationFrame(loopNative);
      }
    };

    animFrameRef.current = requestAnimationFrame(loopNative);
    setIsScanning(true);
  };

  // Start selected engine
  const startScanner = async (engine: ScanEngineMode = activeEngine) => {
    setCameraError(null);
    isHandlingScanRef.current = false;
    try {
      await stopAllScanners();

      if (engine === 'zxing') {
        await startZXingEngine();
      } else if (engine === 'quagga') {
        await startQuaggaEngine();
      } else if (engine === 'native') {
        await startNativeEngine();
      }
    } catch (err: any) {
      console.error(`Engine ${engine} failed:`, err);
      // Fallback chain: if selected engine fails, try ZXing fallback
      if (engine !== 'zxing') {
        try {
          setActiveEngine('zxing');
          await startZXingEngine();
          return;
        } catch (zxingFallbackErr) {
          console.error('ZXing fallback failed:', zxingFallbackErr);
        }
      }

      setCameraError(
        'No se pudo conectar con la cámara. Otorga permisos de cámara a tu navegador o escribe el código manualmente.'
      );
      setIsScanning(false);
    }
  };

  const handleEngineSwitch = (newEngine: ScanEngineMode) => {
    setActiveEngine(newEngine);
    startScanner(newEngine);
  };

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      setScannedCode(null);
      setScannedProduct(undefined);
      setRecentScansCount(0);

      const timer = setTimeout(() => {
        if (isMounted) {
          startScanner(activeEngine);
        }
      }, 250);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        stopAllScanners();
      };
    } else {
      stopAllScanners();
    }
  }, [isOpen]);

  // Handle detected barcode
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
        stopAllScanners();
      } else {
        setTimeout(() => {
          isHandlingScanRef.current = false;
        }, 1500);
      }
    } else {
      // Product DOES NOT EXIST -> AUTOMATIC DIRECT REDIRECTION TO ADD PRODUCT!
      stopAllScanners();
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
      adjustQuantity(scannedProduct.id, delta, `Lector directo (${delta > 0 ? '+' : ''}${delta})`);
      setScannedProduct(prev => prev ? { ...prev, quantity: Math.max(0, prev.quantity + delta) } : undefined);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2926]/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm shadow-2xl text-[#2D2926] flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-[#EFE9E2] border-b border-[#2D2926]/15">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#2D2926] text-white rounded-sm">
              <Camera className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#2D2926] text-xl leading-tight">Escáner Celular de Alta Velocidad</h3>
              <p className="text-xs text-[#2D2926]/60 font-sans">Especializado en códigos de producto EAN/UPC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#2D2926]/60 hover:text-[#2D2926] hover:bg-[#F7F3EF] rounded-sm transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 font-sans">
          
          {/* Engine Selector & Controls */}
          <div className="flex flex-col gap-2.5 px-4 py-3 bg-[#EFE9E2] rounded-sm border border-[#2D2926]/10 text-xs">
            
            {/* Engine Tabs */}
            <div className="flex items-center justify-between gap-1 bg-[#F7F3EF] p-1 rounded-sm border border-[#2D2926]/15">
              <button
                type="button"
                onClick={() => handleEngineSwitch('zxing')}
                className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-xs transition flex items-center justify-center gap-1 ${
                  activeEngine === 'zxing'
                    ? 'bg-[#2D2926] text-white shadow-xs'
                    : 'text-[#2D2926]/70 hover:text-[#2D2926]'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>ZXing Ultra</span>
              </button>

              <button
                type="button"
                onClick={() => handleEngineSwitch('quagga')}
                className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-xs transition flex items-center justify-center gap-1 ${
                  activeEngine === 'quagga'
                    ? 'bg-[#2D2926] text-white shadow-xs'
                    : 'text-[#2D2926]/70 hover:text-[#2D2926]'
                }`}
              >
                <span>Quagga 1D</span>
              </button>

              {'BarcodeDetector' in window && (
                <button
                  type="button"
                  onClick={() => handleEngineSwitch('native')}
                  className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-xs transition flex items-center justify-center gap-1 ${
                    activeEngine === 'native'
                      ? 'bg-[#2D2926] text-white shadow-xs'
                      : 'text-[#2D2926]/70 hover:text-[#2D2926]'
                  }`}
                >
                  <span>Nativo GPU</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
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
                {/* Torch / Flashlight Toggle Button if device supported */}
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
                  onClick={() => startScanner(activeEngine)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[#2D2926]/80 hover:text-[#2D2926] hover:bg-[#F7F3EF] rounded-sm transition uppercase font-bold text-[10px] tracking-wider"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Camera Viewport Area */}
          <div className="relative overflow-hidden rounded-sm bg-[#2D2926] border-2 border-[#2D2926] min-h-[260px] flex items-center justify-center">
            
            {/* Direct HTML5 Video Stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Scanning Laser Overlay effect */}
            {isScanning && !cameraError && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="relative w-[85%] h-[60%] border-2 border-emerald-400 rounded-sm shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center justify-center">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_#10b981] animate-pulse" />
                </div>
                <p className="mt-3 text-[11px] font-mono uppercase tracking-widest text-emerald-300 bg-[#2D2926]/90 px-3 py-1 rounded-sm shadow-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Apunta la cámara al código de barras</span>
                </p>
              </div>
            )}

            {/* Camera Permission / Error Fallback */}
            {cameraError && (
              <div className="p-6 text-center space-y-3 bg-[#F7F3EF] text-[#2D2926] w-full h-full flex flex-col justify-center items-center z-10">
                <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
                <p className="text-xs text-[#2D2926]/80 font-medium">{cameraError}</p>
                <button
                  onClick={() => startScanner(activeEngine)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#2D2926] hover:bg-[#403C39] rounded-sm transition"
                >
                  Reintentar Cámara
                </button>
              </div>
            )}
          </div>

          {/* Quick Scanner Usage Tip */}
          <div className="p-3 bg-[#EFE9E2] border border-[#2D2926]/10 rounded-sm text-[11px] text-[#2D2926]/80 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Detección automática:</strong> Si el código no está registrado, se abrirá automáticamente el formulario para darlo de alta.
            </span>
          </div>

          {/* Scanned Existing Product Result */}
          {scannedCode && scannedProduct && (
            <div className="p-4 bg-[#EFE9E2] border border-[#2D2926]/20 rounded-sm space-y-3 animate-fade-in shadow-md">
              <div className="flex items-center justify-between text-xs text-[#2D2926] font-mono">
                <span className="font-sans uppercase font-bold tracking-wider text-[10px] text-[#2D2926]/60">Código Detectado:</span>
                <span className="bg-[#F7F3EF] px-3 py-1 rounded-sm border border-[#2D2926]/20 text-[#2D2926] font-bold text-sm">
                  #{scannedCode}
                </span>
              </div>

              <div className="flex items-center gap-3.5 p-3.5 bg-[#F7F3EF] rounded-sm border border-[#2D2926]/10">
                {scannedProduct.imageUrl ? (
                  <img
                    src={scannedProduct.imageUrl}
                    alt={scannedProduct.name}
                    className="w-14 h-14 object-cover rounded-sm border border-[#2D2926]/15"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 bg-[#EFE9E2] rounded-sm flex items-center justify-center text-[#2D2926]/40 font-bold font-serif text-lg">
                    {scannedProduct.name.substring(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[#2D2926] truncate text-sm">{scannedProduct.name}</h4>
                  <p className="text-xs text-[#2D2926]/60">{scannedProduct.category} • Precio: ${scannedProduct.sellingPrice}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-[#2D2926]/80 font-medium">
                      Stock: <strong className="text-[#2D2926] font-mono font-bold text-sm">{scannedProduct.quantity}</strong> {scannedProduct.unit}
                    </span>
                  </div>
                </div>

                {/* Quick Increment Controls */}
                <div className="flex flex-col gap-1.5">
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
            </div>
          )}

          {/* Manual Input Search & USB Barcode Gun Support */}
          <form onSubmit={handleManualSearch} className="pt-1">
            <p className="text-xs text-[#2D2926]/70 font-medium mb-1.5">¿Ingresar manualmente o con pistola de barra USB?</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Escribe o escanea el código aquí..."
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs text-[#2D2926] focus:outline-none focus:border-[#2D2926] font-mono font-bold"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold text-xs uppercase tracking-wider rounded-sm transition flex items-center gap-1.5"
              >
                <Search className="w-4 h-4" />
                <span>Ingresar</span>
              </button>
            </div>
          </form>

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#EFE9E2] border-t border-[#2D2926]/15 flex justify-between items-center text-xs font-sans text-[#2D2926]/70">
          <span>Escaneos en sesión: <strong className="text-[#2D2926] font-mono font-bold">{recentScansCount}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2D2926] text-white hover:bg-[#403C39] font-bold text-xs uppercase tracking-wider rounded-sm transition"
          >
            Cerrar Lector
          </button>
        </div>

      </div>
    </div>
  );
};
