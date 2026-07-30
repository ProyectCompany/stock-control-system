import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Plus, Minus, Search, AlertCircle, RefreshCw, SwitchCamera, CheckCircle } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { playBeepSound } from '../utils/barcodeUtils';
import { Product } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNewCode: (barcode: string) => void;
}

interface CameraDevice {
  id: string;
  label: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectNewCode
}) => {
  const { getProductByBarcode, adjustQuantity } = useInventory();

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isHandlingScanRef = useRef<boolean>(false);
  const containerId = 'interactive-barcode-scanner';

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | undefined>(undefined);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [continuousMode, setContinuousMode] = useState(true);
  const [recentScansCount, setRecentScansCount] = useState(0);

  // Stop all camera streams and scanner instances
  const stopScanner = async () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping html5Qrcode', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  // Enumerate cameras
  const loadCameras = async (): Promise<string | null> => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const formatted = devices.map(d => ({
          id: d.id,
          label: d.label || `Cámara ${d.id.substring(0, 6)}`
        }));
        setCameras(formatted);

        const rearCam = formatted.find(c =>
          /back|rear|trasera|environment|principal|main/i.test(c.label)
        );

        const chosenId = rearCam ? rearCam.id : formatted[0].id;
        setSelectedCameraId(chosenId);
        return chosenId;
      }
    } catch (err) {
      console.warn('Could not list cameras', err);
    }
    return null;
  };

  // Start Scanner with Dual Detection Engines
  const startScanner = async (targetCamId?: string) => {
    setCameraError(null);
    isHandlingScanRef.current = false;
    try {
      await stopScanner();

      // Engine 1: Native BarcodeDetector if supported by the browser engine
      if ('BarcodeDetector' in window && videoRef.current) {
        try {
          const constraints: MediaStreamConstraints = {
            video: targetCamId
              ? { deviceId: { exact: targetCamId }, width: { ideal: 1280 }, height: { ideal: 720 } }
              : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
          };

          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }

          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code', 'itf']
          });

          const scanNativeLoop = async () => {
            if (videoRef.current && videoRef.current.readyState >= 2 && !isHandlingScanRef.current) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  handleBarcodeDetected(barcodes[0].rawValue);
                }
              } catch (e) {
                // frame detection pass error ignore
              }
            }
            if (streamRef.current) {
              animFrameRef.current = requestAnimationFrame(scanNativeLoop);
            }
          };

          animFrameRef.current = requestAnimationFrame(scanNativeLoop);
          setIsScanning(true);
          return;
        } catch (nativeStreamErr) {
          console.warn('Native BarcodeDetector stream setup failed, falling back to Html5Qrcode', nativeStreamErr);
        }
      }

      // Engine 2: Html5Qrcode fallback engine
      const html5Qrcode = new Html5Qrcode(containerId, {
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.ITF
        ],
        verbose: false
      });

      scannerRef.current = html5Qrcode;

      const config = {
        fps: 25,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.min(viewfinderWidth * 0.9, 360);
          const height = Math.min(viewfinderHeight * 0.65, 200);
          return { width, height };
        },
        aspectRatio: 1.5
      };

      let cameraConfig: string | { facingMode: string } = targetCamId || selectedCameraId;
      if (!cameraConfig) {
        cameraConfig = { facingMode: 'environment' };
      }

      await html5Qrcode.start(
        cameraConfig,
        config,
        (decodedText) => {
          handleBarcodeDetected(decodedText);
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('All camera engines failed:', err);
      setCameraError(
        'No se pudo acceder a la cámara. Por favor asegúrate de otorgar permisos de cámara en tu navegador o ingresa el código manualmente abajo.'
      );
      setIsScanning(false);
    }
  };

  const handleCameraChange = async (newCamId: string) => {
    setSelectedCameraId(newCamId);
    await startScanner(newCamId);
  };

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      setScannedCode(null);
      setScannedProduct(undefined);
      setRecentScansCount(0);

      const initModal = async () => {
        const defaultCamId = await loadCameras();
        if (isMounted) {
          await startScanner(defaultCamId || undefined);
        }
      };

      const timer = setTimeout(initModal, 250);
      return () => {
        isMounted = false;
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
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
      // Product EXISTS -> Show product card with quick stock modification
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
      // Product DOES NOT EXIST -> AUTOMATIC IMMEDIATE REDIRECT TO ADD PRODUCT!
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
      adjustQuantity(scannedProduct.id, delta, `Lector de código (${delta > 0 ? '+' : ''}${delta})`);
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
              <h3 className="font-serif font-bold text-[#2D2926] text-xl leading-tight">Escáner de Código de Barras</h3>
              <p className="text-xs text-[#2D2926]/60 font-sans">Detección automática en tiempo real</p>
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
          
          {/* Controls & Camera Selector Bar */}
          <div className="flex flex-col gap-2.5 px-4 py-3 bg-[#EFE9E2] rounded-sm border border-[#2D2926]/10 text-xs">
            
            {cameras.length > 1 && (
              <div className="flex items-center gap-2">
                <SwitchCamera className="w-4 h-4 text-[#2D2926]/70" />
                <label className="text-[11px] font-bold text-[#2D2926]/70 uppercase tracking-wider">Cámara:</label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => handleCameraChange(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs font-bold text-[#2D2926] focus:outline-none"
                >
                  {cameras.map((cam) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

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

              <button
                onClick={() => startScanner(selectedCameraId)}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#2D2926] text-white hover:bg-[#403C39] rounded-sm transition uppercase font-bold text-[10px] tracking-wider"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reiniciar Cámara</span>
              </button>
            </div>
          </div>

          {/* Camera Viewport Area */}
          <div className="relative overflow-hidden rounded-sm bg-[#2D2926] border-2 border-[#2D2926] min-h-[250px] flex items-center justify-center">
            
            {/* Direct Native Video Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Html5Qrcode Mount Container Fallback */}
            <div id={containerId} className="w-full h-full overflow-hidden text-center text-white" />

            {/* Scanning Laser Overlay effect */}
            {isScanning && !cameraError && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="relative w-[85%] h-[60%] border-2 border-emerald-400 rounded-sm shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center justify-center">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_#10b981] animate-pulse" />
                </div>
                <p className="mt-3 text-[11px] font-mono uppercase tracking-widest text-emerald-300 bg-[#2D2926]/90 px-3 py-1 rounded-sm shadow-md">
                  Ubica el código de barras en el rectángulo
                </p>
              </div>
            )}

            {/* Camera Permission / Error Fallback */}
            {cameraError && (
              <div className="p-6 text-center space-y-3 bg-[#F7F3EF] text-[#2D2926] w-full h-full flex flex-col justify-center items-center z-10">
                <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
                <p className="text-xs text-[#2D2926]/80 font-medium">{cameraError}</p>
                <button
                  onClick={() => startScanner(selectedCameraId)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#2D2926] hover:bg-[#403C39] rounded-sm transition"
                >
                  Reintentar Permisos Cámara
                </button>
              </div>
            )}
          </div>

          {/* Quick Scanner Usage Tip */}
          <div className="p-3 bg-[#EFE9E2] border border-[#2D2926]/10 rounded-sm text-[11px] text-[#2D2926]/80 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Consejo:</strong> Mantén el código plano a 15-20 cm de la cámara con buena luz. Si no está registrado, se abrirá la ventana de alta automáticamente.
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
            <p className="text-xs text-[#2D2926]/70 font-medium mb-1.5">¿Ingresar o escanear con pistola USB?</p>
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
