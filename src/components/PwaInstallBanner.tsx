import React from 'react';
import { Download, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';

interface PwaInstallBannerProps {
  onOpenInstallModal: () => void;
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({ onOpenInstallModal }) => {
  return (
    <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#2D2926] via-[#403C39] to-[#2D2926] text-white rounded-sm border-2 border-amber-500/30 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-sans animate-fade-in">
      
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-sm bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-400 shadow-inner">
          <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-serif font-bold text-sm sm:text-base text-white leading-tight">
              Instalar Aplicación Móvil en tu Celular
            </h4>
            <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-bold text-[9px] uppercase tracking-wider rounded-full font-mono">
              App Nativa
            </span>
          </div>
          <p className="text-xs text-[#F7F3EF]/70 mt-0.5">
            Accede con 1 toque desde tu pantalla de inicio a pantalla completa y sin barra de direcciones.
          </p>
        </div>
      </div>

      <button
        onClick={onOpenInstallModal}
        className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-widest rounded-sm transition shadow-md flex items-center justify-center gap-2 shrink-0 border border-amber-400/30"
      >
        <Download className="w-4 h-4 text-amber-200 animate-bounce" />
        <span>Descargar e Instalar App</span>
      </button>

    </div>
  );
};
