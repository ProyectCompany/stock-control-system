import React from 'react';
import { ShieldCheck, RefreshCw, Package } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

export const Footer: React.FC = () => {
  const { resetToSampleData } = useInventory();

  return (
    <footer className="mt-16 bg-[#2D2926] text-[#F7F3EF] py-12 px-6 border-t-4 border-[#2D2926]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="w-12 h-12 rounded-sm bg-[#403C39] border border-[#F7F3EF]/20 flex items-center justify-center text-[#F7F3EF]">
            <Package className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h4 className="text-base font-serif font-bold tracking-tight text-[#F7F3EF]">
              Stock Control System
            </h4>
            <p className="text-xs text-[#F7F3EF]/60 font-sans mt-0.5">
              Gestión segura con escáner de código de barras y alertas personalizadas
            </p>
          </div>
        </div>

        {/* Center: Explicit Mandatory Credits */}
        <div className="text-center bg-[#403C39] px-6 py-3.5 rounded-sm border border-[#F7F3EF]/10">
          <p className="text-xs font-sans tracking-wide text-[#F7F3EF]/90 flex items-center justify-center gap-1.5">
            <span>Desarrollado por</span>
            <strong className="text-amber-300 font-bold tracking-wider uppercase">dev ezequiel luis lucca</strong>
          </p>
          <p className="text-[10px] text-emerald-400/90 mt-1 uppercase font-mono tracking-widest">
            Todos los derechos reservados
          </p>
        </div>

        {/* Right: Reset Data & Status */}
        <div className="flex items-center gap-4 text-xs font-sans">
          <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 px-3 py-2 rounded-sm border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
            <span className="uppercase font-bold text-[10px] tracking-wider">Sistema Seguro</span>
          </div>

          <button
            onClick={resetToSampleData}
            className="px-3.5 py-2 bg-[#403C39] hover:bg-[#F7F3EF] hover:text-[#2D2926] text-[#F7F3EF] border border-[#F7F3EF]/20 rounded-sm transition flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider"
            title="Restaurar stock a datos de ejemplo iniciales"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reiniciar Datos</span>
          </button>
        </div>

      </div>
    </footer>
  );
};
