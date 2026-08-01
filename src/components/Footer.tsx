import React from 'react';
import { ShieldCheck, RefreshCw, MessageCircle, Mail, Phone, ScrollText } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

interface FooterProps {
  onOpenTerms?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenTerms }) => {
  const { resetToSampleData } = useInventory();

  const developerPhone = '+543644656935';
  const developerEmail = 'devezequiellucca@gmail.com';
  const whatsappUrl = `https://wa.me/543644656935?text=${encodeURIComponent(
    'Hola Ezequiel, te contacto desde la app web de Stock Control por una consulta / error / negocio.'
  )}`;

  return (
    <footer className="mt-16 bg-[#2D2926] text-[#F7F3EF] py-10 px-4 sm:px-8 border-t-4 border-amber-600 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-[#F7F3EF]/10">
          
          {/* Brand & Logo */}
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-12 h-12 rounded-sm border-2 border-amber-500/50 bg-[#403C39] overflow-hidden p-0.5 shrink-0 shadow-md">
              <img src="/proyect-company-logo.jpg" alt="PROYECT COMPANY" className="w-full h-full object-cover rounded-2xs" />
            </div>
            <div>
              <h4 className="text-lg font-serif font-extrabold tracking-tight text-[#F7F3EF] uppercase">
                PROYECT COMPANY
              </h4>
              <p className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                Servicios de programación • Sistema de Control de Stock
              </p>
            </div>
          </div>

          {/* Developer Contact Card & WhatsApp Action */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#403C39] p-3 sm:px-5 sm:py-3 rounded-sm border border-[#F7F3EF]/15">
            <div className="text-center sm:text-left space-y-0.5">
              <p className="text-xs font-bold text-[#F7F3EF]">
                Dev / Fundador: <strong className="text-amber-300">Ezequiel Luis Lucca</strong>
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] font-mono text-[#F7F3EF]/70">
                <a href={`mailto:${developerEmail}`} className="hover:text-amber-300 transition flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>{developerEmail}</span>
                </a>
                <a href={`tel:${developerPhone}`} className="hover:text-amber-300 transition flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{developerPhone}</span>
                </a>
              </div>
            </div>

            {/* Direct WhatsApp Contact Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition shadow flex items-center gap-1.5 whitespace-nowrap"
              title="Contactar al desarrollador por cualquier error de la app o negocio"
            >
              <MessageCircle className="w-4 h-4 fill-white text-emerald-700" />
              <span>Contactar Desarrollador</span>
            </a>
          </div>

        </div>

        {/* Bottom Bar: Terms & System Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#F7F3EF]/60 font-sans">
          
          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start">
            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-sm border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
              <span className="uppercase font-bold text-[10px] tracking-wider">Sistema Seguro</span>
            </div>

            {onOpenTerms && (
              <button
                type="button"
                onClick={onOpenTerms}
                className="hover:text-amber-300 underline uppercase tracking-wider font-bold text-[11px] transition flex items-center gap-1"
              >
                <ScrollText className="w-3.5 h-3.5 text-amber-400" />
                <span>Términos y Condiciones de Uso</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={resetToSampleData}
              className="px-3.5 py-1.5 bg-[#403C39] hover:bg-[#F7F3EF] hover:text-[#2D2926] text-[#F7F3EF] border border-[#F7F3EF]/20 rounded-sm transition flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider"
              title="Restaurar stock a datos de ejemplo iniciales"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reiniciar Datos</span>
            </button>

            <span className="text-[10px] font-mono text-[#F7F3EF]/40">v2.4.0</span>
          </div>

        </div>

      </div>
    </footer>
  );
};
