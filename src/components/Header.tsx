import React from 'react';
import { Camera, ShieldAlert, MessageSquare, FileText, Package, Palette } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { useTheme, THEME_OPTIONS } from '../context/ThemeContext';
import { generateStockPDF } from '../utils/pdfGenerator';

interface HeaderProps {
  onOpenScanner: () => void;
  onOpenAlerts: () => void;
  onOpenProfile: () => void;
  onOpenWhatsAppModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenScanner,
  onOpenAlerts,
  onOpenProfile,
  onOpenWhatsAppModal
}) => {
  const { user } = useAuth();
  const { alerts, products } = useInventory();
  const { theme, setTheme } = useTheme();

  const handlePDFDownload = () => {
    generateStockPDF(products, user);
  };

  const handleCycleTheme = () => {
    const currentIndex = THEME_OPTIONS.findIndex(t => t.id === theme);
    const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
    setTheme(THEME_OPTIONS[nextIndex].id);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F7F3EF]/95 backdrop-blur-md border-b border-[#2D2926]/10 px-3 sm:px-6 lg:px-10 py-2.5 sm:py-4 transition">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand Header with PROYECT COMPANY Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer" onClick={onOpenProfile}>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-sm border-2 border-amber-500/40 bg-[#2D2926] text-white flex items-center justify-center shrink-0 shadow-md overflow-hidden p-0.5">
            <img
              src="/proyect-company-logo.jpg"
              alt="PROYECT COMPANY"
              className="w-full h-full object-cover rounded-2xs"
            />
          </div>

          <div className="flex flex-col">
            <h1 className="text-sm sm:text-xl font-serif font-extrabold tracking-tight uppercase leading-none text-[#2D2926]">
              PROYECT COMPANY
            </h1>
            <span className="text-[9px] sm:text-[10px] tracking-[0.12em] uppercase font-sans font-bold text-amber-700 mt-0.5">
              Servicios de Programación • {user.businessName || 'Stock Control'}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          
          {/* Camera Scanner Trigger */}
          <button
            onClick={onOpenScanner}
            className="bg-[#2D2926] text-white hover:bg-[#403C39] px-2.5 py-1.5 sm:px-3.5 sm:py-2.5 flex items-center gap-1.5 transition text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-sm shadow-sm"
            title="Lector de Código de Barras por Cámara"
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            <span className="hidden md:inline">Escanear</span>
          </button>

          {/* Alerts Counter Trigger */}
          <button
            onClick={onOpenAlerts}
            className={`relative p-1.5 sm:p-2.5 rounded-sm border transition flex items-center gap-1 ${
              alerts.length > 0
                ? 'bg-amber-100 text-amber-900 border-amber-400'
                : 'bg-[#EFE9E2] text-[#2D2926] border-[#2D2926]/15 hover:bg-[#E2DAD0]'
            }`}
            title="Centro de Alertas de Stock y Vencimiento"
          >
            <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {alerts.length > 0 && (
              <span className="font-sans text-[10px] sm:text-[11px] font-bold px-1 py-0.2 bg-amber-500 text-slate-950 rounded-full">
                {alerts.length}
              </span>
            )}
          </button>

          {/* WhatsApp Export Quick Button */}
          <button
            onClick={onOpenWhatsAppModal}
            className="p-1.5 sm:p-2.5 bg-[#EFE9E2] hover:bg-[#E2DAD0] text-[#2D2926] border border-[#2D2926]/15 rounded-sm transition hidden sm:flex"
            title="Enviar Reporte por WhatsApp"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* PDF Export Quick Button */}
          <button
            onClick={handlePDFDownload}
            className="p-1.5 sm:p-2.5 bg-[#EFE9E2] hover:bg-[#E2DAD0] text-[#2D2926] border border-[#2D2926]/15 rounded-sm transition hidden sm:flex"
            title="Descargar Reporte PDF"
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Theme Palette Switcher */}
          <button
            onClick={handleCycleTheme}
            className="p-1.5 sm:p-2.5 bg-[#EFE9E2] hover:bg-[#E2DAD0] text-[#2D2926] border border-[#2D2926]/15 rounded-sm transition flex items-center gap-1"
            title={`Cambiar Tema de Color (Actual: ${THEME_OPTIONS.find(t => t.id === theme)?.name})`}
          >
            <Palette className="w-4 h-4 text-emerald-700" />
          </button>

          {/* User Profile / Google Sign In */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-[#2D2926]/10 text-right hover:opacity-80 transition"
            title="Ver Perfil y Cuenta de Google"
          >
            <div className="hidden sm:block">
              <p className="font-sans text-xs font-bold uppercase tracking-wider text-[#2D2926]">
                {user.displayName.split(' ')[0]}
              </p>
              <p className="font-sans text-[10px] text-[#2D2926]/50 uppercase tracking-widest font-bold">
                Google Auth
              </p>
            </div>

            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-[#2D2926] p-0.5 overflow-hidden shrink-0 bg-[#EFE9E2]">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#2D2926] text-[#F7F3EF] flex items-center justify-center font-bold text-xs">
                  {user.displayName.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </button>

        </div>

      </div>
    </header>
  );
};
