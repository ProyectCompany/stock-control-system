import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Plus, Minus, Search, AlertCircle, RefreshCw } from 'lucide-react';
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
  const containerId = 'interactive-barcode-scanner';

  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | undefined>(undefined);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [continuousMode, setContinuousMode] = useState(true);
  const [recentScansCount, setRecentScansCount] = useState(0);

  // Stop scanner safely
  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping html5Qrcode scanner', err);
      }
    }
  };

  // Start Scanner
  const startScanner = async () => {
    setCameraError(null);
    try {
      await stopScanner();

      const html5Qrcode = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false
      });

      scannerRef.current = html5Qrcode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.5
      };

      await html5Qrcode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleBarcodeDetected(decodedText);
        },
        () => {
          // Ignore scanning error per frame
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera barcode scan error:', err);
      setCameraError(
        'No se pudo acceder a la cámara. Por favor asegúrate de otorgar permisos de cámara en tu navegador o escribe el código manualmente.'
      );
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setScannedCode(null);
      setScannedProduct(undefined);
      setRecentScansCount(0);
      // Small timeout to allow container element rendering
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => {
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
      adjustQuantity(scannedProduct.id, delta, `Scanner directo cámara (${delta > 0 ? '+' : ''}${delta})`);
      // Update local preview state
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
      <div className="relative w-full max-w-lg overflow-hidden bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm shadow-2xl text-[#2D2926] flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-[#EFE9E2] border-b border-[#2D2926]/15">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#2D2926] text-white rounded-sm">
              <Camera className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#2D2926] text-xl leading-tight">Lector de Código de Barras</h3>
              <p className="text-xs text-[#2D2926]/60 font-sans">Apunta la cámara del dispositivo hacia el código</p>
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
        <div className="p-6 overflow-y-auto space-y-5 flex-1 font-sans">
          
          {/* Controls Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#EFE9E2] rounded-sm border border-[#2D2926]/10 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-[#2D2926] font-bold uppercase tracking-wider text-[11px]">
              <input
                type="checkbox"
                checked={continuousMode}
                onChange={(e) => setContinuousMode(e.target.checked)}
                className="w-4 h-4 accent-[#2D2926]"
              />
              <span>Escaneo continuo</span>
            </label>

            {isScanning && (
              <button
                onClick={startScanner}
                className="flex items-center gap-1.5 px-3 py-1 text-[#2D2926]/80 hover:text-[#2D2926] hover:bg-[#F7F3EF] rounded-sm transition uppercase font-bold text-[10px] tracking-wider"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reiniciar Cámara</span>
              </button>
            )}
          </div>

          {/* Camera Viewport */}
          <div className="relative overflow-hidden rounded-sm bg-[#2D2926] border-2 border-[#2D2926] min-h-[220px] flex items-center justify-center">
            
            {/* HTML5 QR Code Mount Element */}
            <div id={containerId} className="w-full h-full overflow-hidden text-center text-white" />

            {/* Scanning Laser Overlay effect */}
            {isScanning && !cameraError && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative w-[280px] h-[160px] border-2 border-emerald-400 rounded-sm shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_10px_#10b981] animate-pulse" />
                  <p className="absolute bottom-2 text-[10px] font-mono uppercase tracking-widest text-emerald-300 bg-[#2D2926]/80 px-2 py-0.5 rounded-sm">
                    Buscando código...
                  </p>
                </div>
              </div>
            )}

            {/* Error Message Fallback */}
            {cameraError && (
              <div className="p-6 text-center space-y-3 bg-[#F7F3EF] text-[#2D2926] w-full h-full flex flex-col justify-center items-center">
                <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
                <p className="text-xs text-[#2D2926]/80 font-medium">{cameraError}</p>
                <button
                  onClick={startScanner}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#2D2926] hover:bg-[#403C39] rounded-sm transition"
                >
                  Reintentar Cámara
                </button>
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
