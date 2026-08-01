import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Share, PlusSquare, CheckCircle, ShieldCheck, ArrowRight } from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt
}) => {
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.navigator) {
      const ua = window.navigator.userAgent.toLowerCase();
      setIsIos(/iphone|ipad|ipod/.test(ua));
      setIsAndroid(/android/.test(ua));
    }
  }, []);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#2D2926]/75 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-md bg-[#F7F3EF] border-2 border-[#2D2926] rounded-sm shadow-2xl text-[#2D2926] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#EFE9E2] border-b border-[#2D2926]/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm border border-amber-500/40 bg-[#2D2926] text-white flex items-center justify-center shrink-0 overflow-hidden p-0.5 shadow-sm">
              <img src="/proyect-company-logo.jpg" alt="PROYECT COMPANY" className="w-full h-full object-cover rounded-2xs" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#2D2926] text-lg sm:text-xl leading-tight">Instalar Aplicación Móvil</h3>
              <p className="text-xs text-amber-800 font-bold uppercase tracking-wider">PROYECT COMPANY • App Nativa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#2D2926]/60 hover:text-[#2D2926] hover:bg-[#F7F3EF] rounded-sm transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs sm:text-sm overflow-y-auto max-h-[75vh]">
          
          <div className="p-3 bg-amber-500/10 border border-amber-600/30 rounded-sm text-xs text-[#2D2926] flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-amber-800 shrink-0" />
            <span>
              Instala la aplicación en la pantalla de inicio de tu celular para usarla a pantalla completa con <strong>acceso directo e ícono nativo</strong>.
            </span>
          </div>

          {/* If 1-Tap Browser Native Prompt is Available (Chrome/Android/Edge) */}
          {deferredPrompt && (
            <div className="p-4 bg-[#EFE9E2] border border-[#2D2926]/15 rounded-sm space-y-2 text-center">
              <h4 className="font-serif font-bold text-[#2D2926] text-base">¡Tu navegador permite instalación directa!</h4>
              <p className="text-xs text-[#2D2926]/70">Presiona el botón a continuación para instalar la app en 1 toque:</p>
              <button
                type="button"
                onClick={handleNativeInstall}
                className="w-full py-3 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold text-xs uppercase tracking-widest rounded-sm transition shadow flex items-center justify-center gap-2 mt-2"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Instalar Ahora en 1 Toque</span>
              </button>
            </div>
          )}

          {/* Instructions for iPhone / iOS Safari */}
          {isIos && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-600/30 rounded-sm space-y-2.5">
              <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-xs flex items-center gap-1.5">
                <Share className="w-4 h-4 text-emerald-700" />
                <span>Instrucciones para iPhone / iPad (Safari)</span>
              </h4>
              <ol className="space-y-2 text-xs text-[#2D2926] list-decimal pl-4 font-medium">
                <li>
                  Toca el botón <strong>Compartir</strong> (el ícono de la flecha hacia arriba <Share className="w-3.5 h-3.5 inline text-emerald-700" />) en la parte inferior de Safari.
                </li>
                <li>
                  Desplázate hacia abajo y selecciona <strong>"Agregar a inicio"</strong> (o <em>"Add to Home Screen"</em> <PlusSquare className="w-3.5 h-3.5 inline text-emerald-700" />).
                </li>
                <li>
                  Toca <strong>"Agregar"</strong> arriba a la derecha. ¡Listo, tendrás el ícono en tu teléfono!
                </li>
              </ol>
            </div>
          )}

          {/* Instructions for Android / Chrome */}
          {!deferredPrompt && isAndroid && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-600/30 rounded-sm space-y-2.5">
              <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-xs flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-700" />
                <span>Instrucciones para Android (Chrome / Samsung)</span>
              </h4>
              <ol className="space-y-2 text-xs text-[#2D2926] list-decimal pl-4 font-medium">
                <li>
                  Toca los <strong>3 puntos del menú</strong> (⋮) en la parte superior derecha de tu navegador Chrome.
                </li>
                <li>
                  Selecciona la opción <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                </li>
                <li>
                  Confirma tocando <strong>"Instalar"</strong>.
                </li>
              </ol>
            </div>
          )}

          {/* Instructions for Desktop / Other Browsers */}
          {!isIos && !isAndroid && !deferredPrompt && (
            <div className="p-3.5 bg-[#EFE9E2] border border-[#2D2926]/15 rounded-sm space-y-2 text-xs">
              <h4 className="font-bold text-[#2D2926] uppercase tracking-wider">Instalación en Computadora / Navegador</h4>
              <p className="text-[#2D2926]/80">
                Haz clic en el ícono de <strong>instalación de la barra de direcciones</strong> de Chrome/Edge (icono con forma de pantalla o más) o selecciona <em>"Instalar PROYECT COMPANY"</em> desde el menú de opciones del navegador.
              </p>
            </div>
          )}

          <div className="p-3 bg-[#EFE9E2] rounded-sm text-[11px] text-[#2D2926]/70 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              La aplicación instalada funciona a pantalla completa sin barra de navegación y con carga ultra rápida.
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#EFE9E2] border-t border-[#2D2926]/15 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#2D2926] text-white hover:bg-[#403C39] font-bold text-xs uppercase tracking-wider rounded-sm transition"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
