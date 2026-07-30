import React, { useState, useEffect } from 'react';
import { X, User, Phone, LogOut, LogIn, Check, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, loginWithGoogle, logout, updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(user.displayName);
  const [email, setEmail] = useState(user.email);
  const [businessName, setBusinessName] = useState(user.businessName);
  const [whatsappNumber, setWhatsappNumber] = useState(user.whatsappNumber);
  const [defaultMinStock, setDefaultMinStock] = useState(user.defaultMinStock);
  const [defaultExpirationAlertDays, setDefaultExpirationAlertDays] = useState(user.defaultExpirationAlertDays);
  const [currency, setCurrency] = useState(user.currency);
  const [totemAnimal, setTotemAnimal] = useState(user.totemAnimal);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(user.displayName);
      setEmail(user.email);
      setBusinessName(user.businessName);
      setWhatsappNumber(user.whatsappNumber);
      setDefaultMinStock(user.defaultMinStock);
      setDefaultExpirationAlertDays(user.defaultExpirationAlertDays);
      setCurrency(user.currency);
      setTotemAnimal(user.totemAnimal);
    }
  }, [user, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      displayName,
      email,
      businessName,
      whatsappNumber,
      defaultMinStock: Number(defaultMinStock) || 5,
      defaultExpirationAlertDays: Number(defaultExpirationAlertDays) || 7,
      currency,
      totemAnimal
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2926]/70 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm shadow-2xl text-[#2D2926] flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-[#EFE9E2] border-b border-[#2D2926]/15 rounded-t-sm">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-10 h-10 rounded-full border-2 border-[#2D2926]/40 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="p-2.5 bg-[#2D2926] text-white rounded-sm">
                <User className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="font-serif font-bold text-[#2D2926] text-xl">Perfil del Cliente</h3>
              <p className="text-xs text-[#2D2926]/60">Configuración de usuario e integración con Google Auth</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#2D2926]/60 hover:text-[#2D2926] hover:bg-[#F7F3EF] rounded-sm transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Google Login Status Banner */}
          <div className="p-4 bg-[#EFE9E2] rounded-sm border border-[#2D2926]/15 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#2D2926] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#2D2926]/60">Google Account Autenticada</p>
                <p className="text-sm font-bold text-[#2D2926]">{user.email}</p>
              </div>
            </div>

            {user.isLoggedIn ? (
              <button
                type="button"
                onClick={logout}
                className="px-3 py-1.5 bg-red-900 hover:bg-red-950 text-white border border-red-900 text-xs font-bold uppercase tracking-wider rounded-sm transition flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={loginWithGoogle}
                className="px-3.5 py-1.5 bg-[#2D2926] hover:bg-[#403C39] text-white text-xs font-bold uppercase tracking-wider rounded-sm transition flex items-center gap-1.5 shadow"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>Conectar Google</span>
              </button>
            )}
          </div>

          {/* User & Store Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2D2926] mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-sm text-[#2D2926] focus:outline-none focus:border-[#2D2926] font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2D2926] mb-1">Nombre Comercial / Local</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-sm font-bold text-[#2D2926] focus:outline-none focus:border-[#2D2926]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2D2926] mb-1">
              Número de WhatsApp para Enviar Reportes
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2D2926]/50" />
              <input
                type="tel"
                placeholder="+5491155554321"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-sm text-[#2D2926] font-mono font-bold focus:outline-none focus:border-[#2D2926]"
              />
            </div>
            <p className="text-[11px] text-[#2D2926]/60 mt-1">
              Incluye código de país (ej. +54 para Argentina, +52 para México, +34 para España).
            </p>
          </div>

          {/* Alert Defaults */}
          <div className="p-4 bg-[#EFE9E2] rounded-sm border border-[#2D2926]/15 space-y-3">
            <h4 className="text-xs font-bold text-[#2D2926] uppercase tracking-wider">
              Configuración Predeterminada de Umbrales
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2D2926]/70 mb-1">Stock Mínimo</label>
                <input
                  type="number"
                  min="0"
                  value={defaultMinStock}
                  onChange={(e) => setDefaultMinStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-3 py-2 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs font-mono font-bold text-amber-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2D2926]/70 mb-1">Días Vencimiento</label>
                <input
                  type="number"
                  min="1"
                  value={defaultExpirationAlertDays}
                  onChange={(e) => setDefaultExpirationAlertDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs font-mono font-bold text-red-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2D2926]/70 mb-1">Moneda</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs font-bold text-[#2D2926]"
                >
                  <option value="$">$ (Pesos / Dólares)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="MXN">MXN ($)</option>
                  <option value="COP">COP ($)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {savedSuccess && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-sm text-emerald-900 text-xs text-center font-bold flex items-center justify-center gap-2 animate-fade-in">
              <Check className="w-4 h-4" />
              <span>¡Perfil actualizado con éxito!</span>
            </div>
          )}

          {/* Submit */}
          <div className="pt-4 border-t border-[#2D2926]/10 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-[#EFE9E2] hover:bg-[#2D2926]/10 text-[#2D2926] font-bold text-xs uppercase tracking-wider rounded-sm transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold text-xs uppercase tracking-widest rounded-sm transition shadow-md"
            >
              Guardar Perfil
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
