import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X, Check } from 'lucide-react';

interface CameraPhotoCaptureProps {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
  title?: string;
}

export const CameraPhotoCapture: React.FC<CameraPhotoCaptureProps> = ({
  onCapture,
  onCancel,
  title = 'Sacar Foto con Cámara'
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isLoading, setIsLoading] = useState(true);

  const startCamera = async (mode: 'environment' | 'user') => {
    setIsLoading(true);
    setError(null);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 640 },
          height: { ideal: 640 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsLoading(false);
    } catch (err) {
      console.warn('Primary camera stream failed, trying fallback', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
        }
        setIsLoading(false);
      } catch (fallbackErr) {
        console.error('All camera attempts failed', fallbackErr);
        setError('No se pudo acceder a la cámara. Verifica los permisos de tu navegador.');
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    const size = Math.min(video.videoWidth || 640, video.videoHeight || 480);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const startX = (video.videoWidth - size) / 2;
      const startY = (video.videoHeight - size) / 2;
      ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      onCapture(dataUrl);
    }
  };

  return (
    <div className="p-3 bg-[#2D2926] text-white rounded-sm space-y-3 animate-fade-in border border-[#2D2926]/30">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <Camera className="w-4 h-4" />
          {title}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-sm transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error ? (
        <div className="p-3 bg-red-900/60 border border-red-500 rounded-sm text-xs text-red-200 text-center font-medium">
          {error}
        </div>
      ) : (
        <div className="relative w-full aspect-square max-h-56 bg-black rounded-sm overflow-hidden flex items-center justify-center border border-white/10">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-white font-medium">
              Cargando cámara...
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {!error && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={toggleCamera}
            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition"
            title="Cambiar Cámara"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Girar</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-sm text-xs font-bold uppercase transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleTakePhoto}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-sm flex items-center gap-1.5 shadow transition"
            >
              <Check className="w-4 h-4" />
              <span>Tomar Foto</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
