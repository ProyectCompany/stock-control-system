import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Plus, Minus, Search, AlertCircle, RefreshCw, Upload, Sparkles, SwitchCamera } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerId = 'interactive-barcode-scanner';

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | undefined>(undefined);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [continuousMode, setContinuousMode] = useState(true);
  const [recentScansCount, setRecentScansCount] = useState(0);

  // Stop scanner safely
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping html5Qrcode scanner', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  // Fetch available camera devices
  const loadCameras = async (): Promise<string | null> => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const formatted = devices.map(d => ({
          id: d.id,
          label: d.label || `Cámara ${d.id.substring(0, 5)}`
        }));
        setCameras(formatted);

        // Prefer rear / environment camera if present
        const rearCamera = formatted.find(c =>
          /back|rear|trasera|environment|principal|main/i.test(c.label)
        );

        const chosenId = rearCamera ? rearCamera.id : formatted[0].id;
        setSelectedCameraId(chosenId);
        return chosenId;
      }
    } catch (err) {
      console.warn('Could not enumerate cameras via getCameras()', err);
    }
    return null;
  };

  // Start Camera Scanner
  const startScanner = async (targetCamId?: string) => {
    setCameraError(null);
    try {
      await stopScanner();

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

      // Full frame scanning for better detection rate
      const config = {
        fps: 25,
        disableFlip: false
      };

      // Determine camera target (Camera ID object or facingMode fallback)
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
        () => {
          // Frame scan callback (silent)
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera start error:', err);
      // Fallback try: fallback to facingMode 'user' or default constraint if camera ID failed
      try {
        if (scannerRef.current) {
          await scannerRef.current.start(
            { facingMode: 'user' },
            { fps: 20, disableFlip: false },
            (decodedText) => handleBarcodeDetected(decodedText),
            () => {}
          );
          setIsScanning(true);
          return;
        }
      } catch (fallbackErr) {
        console.error('Fallback camera start error:', fallbackErr);
      }

      setCameraError(
        'No se pudo acceder a la cámara activa. Por favor verifica los permisos de cámara en tu navegador, o usa el botón "Google Lens / Foto" para escanear una imagen.'
      );
      setIsScanning(false);
    }
  };

  // Switch camera dropdown
  const handleCameraChange = async (newCamId: string) => {
    setSelectedCameraId(newCamId);
    await startScanner(newCamId);
  };

  // Google Lens style photo scanner
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setCameraError(null);

    try {
      // 1. Try native BarcodeDetector API if supported by browser
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code']
          });
          const imageBitmap = await createImageBitmap(file);
          const barcodes = await barcodeDetector.detect(imageBitmap);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            handleBarcodeDetected(barcodes[0].rawValue);
            setIsProcessingImage(false);
            return;
          }
        } catch (nativeErr) {
          console.warn('Native BarcodeDetector attempt failed, falling back to html5Qrcode file scan', nativeErr);
        }
      }

      // 2. Fallback to html5Qrcode file scanner
      const tempScanner = new Html5Qrcode('google-lens-file-scanner-temp');
      const result = await tempScanner.scanFileV2(file, true);
      if (result && result.decodedText) {
        handleBarcodeDetected(result.decodedText);
      } else {
        setCameraError('No se reconoció un código de barras en la foto. Asegúrate de enfocar bien el código de barras y que haya buena iluminación.');
      }
    } catch (err: any) {
      console.error('Error scanning photo:', err);
      setCameraError('No se pudo leer el código de barras en la imagen.');
    } finally {
      setIsProcessingImage(false);
      if (e.target) e.target.value = '';
    }
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

  const handleBarcodeDetected = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    playBeepSound();
    setScannedCode(cleanCode);

    const found = getProductByBarcode(cleanCode);
    setScannedProduct(found);
    setRecentScansCount(prev => prev + 1);

    if (!continuousMode) {
      stopScanner();
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
      adjustQuantity(scannedProduct.id, delta, `Scanner directo (${delta > 0 ? '+' : ''}${delta})`);
      setScannedProduct(prev => prev ? { ...prev, quantity: Math.max(0, prev.quantity + delta) } : undefined);
    }
  };

  const handleCreateProduct = () => {
    if (scannedCode) {
      onSelectNewCode(scannedCode);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2926]/70 backdrop-blur-sm animate-fade-in">
      {/* Hidden dummy div for temp file scanner */}
      <div id="google-lens-file-scanner-temp" className="hidden" />

      <div className="relative w-full max-w-lg overflow-hidden bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm shadow-2xl text-[#2D2926] flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-[#EFE9E2] border-b border-[#2D2926]/15">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#2D2926] text-white rounded-sm">
              <Camera className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#2D2926] text-xl leading-tight">Lector de Código de Barras</h3>
              <p className="text-xs text-[#2D2926]/60 font-sans">Escáner cámara en vivo & Google Lens</p>
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
          
          {/* Camera Selection Dropdown & Controls */}
          <div className="flex flex-col gap-2.5 px-4 py-3 bg-[#EFE9E2] rounded-sm border border-[#2D2926]/10 text-xs">
            
            {/* Camera Select Dropdown */}
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

            <div className="flex flex-wrap items-center justify-between gap-2">
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
                {/* Google Lens Image Scan Trigger */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingImage}
                  className="flex items-center gap-1.5 px-3 py-1 bg-[#2D2926] text-white hover:bg-[#403C39] rounded-sm transition uppercase font-bold text-[10px] tracking-wider shadow-sm"
                  title="Escanear foto estilo Google Lens"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>Google Lens / Foto</span>
                </button>

                <button
                  onClick={() => startScanner(selectedCameraId)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[#2D2926]/80 hover:text-[#2D2926] hover:bg-[#F7F3EF] rounded-sm transition uppercase font-bold text-[10px] tracking-wider"
                  title="Reiniciar Cámara"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Camera Viewport */}
          <div className="relative overflow-hidden rounded-sm bg-[#2D2926] border-2 border-[#2D2926] min-h-[240px] flex items-center justify-center">
            
            {/* HTML5 QR Code Mount Element */}
            <div id={containerId} className="w-full h-full overflow-hidden text-center text-white" />

            {/* Processing Photo Indicator */}
            {isProcessingImage && (
              <div className="absolute inset-0 bg-[#2D2926]/90 backdrop-blur-xs flex flex-col items-center justify-center space-y-3 text-white z-20">
                <Sparkles className="w-10 h-10 text-amber-400 animate-spin" />
                <p className="text-xs font-bold font-mono text-amber-200">Analizando foto con escáner óptico (Google Lens)...</p>
              </div>
            )}

            {/* Scanning Laser Overlay effect */}
            {isScanning && !cameraError && !isProcessingImage && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative w-[85%] h-[60%] border-2 border-emerald-400 rounded-sm shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_10px_#10b981] animate-pulse" />
                  <p className="absolute bottom-2 text-[10px] font-mono uppercase tracking-widest text-emerald-300 bg-[#2D2926]/80 px-2 py-0.5 rounded-sm">
                    Apunta la cámara al código...
                  </p>
                </div>
              </div>
            )}

            {/* Error Message Fallback */}
            {cameraError && !isProcessingImage && (
              <div className="p-6 text-center space-y-3 bg-[#F7F3EF] text-[#2D2926] w-full h-full flex flex-col justify-center items-center">
                <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
                <p className="text-xs text-[#2D2926]/80 font-medium">{cameraError}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => startScanner(selectedCameraId)}
                    className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#2D2926] hover:bg-[#403C39] rounded-sm transition"
                  >
                    Reintentar Cámara
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-sm transition flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Foto</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Scanned Result Card */}
          {scannedCode && (
            <div className="p-4 bg-[#EFE9E2] border border-[#2D2926]/20 rounded-sm space-y-3 animate-fade-in shadow-md">
              <div className="flex items-center justify-between text-xs text-[#2D2926] font-mono">
                <span className="font-sans uppercase font-bold tracking-wider text-[10px] text-[#2D2926]/60">Código Detectado:</span>
                <span className="bg-[#F7F3EF] px-3 py-1 rounded-sm border border-[#2D2926]/20 text-[#2D2926] font-bold text-sm">
                  #{scannedCode}
                </span>
              </div>

              {scannedProduct ? (
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
              ) : (
                <div className="p-3 bg-amber-100 border border-amber-300 rounded-sm flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-amber-900">Producto no registrado</p>
                    <p className="text-[11px] text-amber-800">¿Deseas darlo de alta ahora con este código?</p>
                  </div>
                  <button
                    onClick={handleCreateProduct}
                    className="whitespace-nowrap px-3 py-2 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold text-xs uppercase tracking-wider rounded-sm transition flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Producto</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Manual Barcode Search Fallback */}
          <form onSubmit={handleManualSearch} className="pt-2">
            <p className="text-xs text-[#2D2926]/70 font-medium mb-1.5">¿Búsqueda manual por código?</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ej: 7791234567890"
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs text-[#2D2926] focus:outline-none focus:border-[#2D2926] font-mono font-bold"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold text-xs uppercase tracking-wider rounded-sm transition flex items-center gap-1.5"
              >
                <Search className="w-4 h-4" />
                <span>Buscar</span>
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
