import React, { useState, useEffect, useRef } from 'react';
import { X, User, Phone, LogOut, LogIn, Check, ShieldCheck, Camera, Upload, Link as LinkIcon, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CameraPhotoCapture } from './CameraPhotoCapture';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  { name: 'Jaguar', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  { name: 'Lobo', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
  { name: 'Águila', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
  { name: 'Pantera', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80' },
  { name: 'León', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80' },
  { name: 'Puma', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80' }
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, loginWithGoogle, logout, updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(user.displayName);
  const [email, setEmail] = useState(user.email);
  const [photoURL, setPhotoURL] = useState(user.photoURL);
  const [businessName, setBusinessName] = useState(user.businessName);
  const [whatsappNumber, setWhatsappNumber] = useState(user.whatsappNumber);
  const [defaultMinStock, setDefaultMinStock] = useState(user.defaultMinStock);
  const [defaultExpirationAlertDays, setDefaultExpirationAlertDays] = useState(user.defaultExpirationAlertDays);
  const [currency, setCurrency] = useState(user.currency);
  const [totemAnimal, setTotemAnimal] = useState(user.totemAnimal);
  
  // UI states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(user.displayName);
      setEmail(user.email);
      setPhotoURL(user.photoURL);
      setBusinessName(user.businessName);
      setWhatsappNumber(user.whatsappNumber);
      setDefaultMinStock(user.defaultMinStock);
      setDefaultExpirationAlertDays(user.defaultExpirationAlertDays);
      setCurrency(user.currency);
      setTotemAnimal(user.totemAnimal);
      setIsCameraActive(false);
      setShowUrlInput(false);
    }
  }, [user, isOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotoURL(reader.result);
          setShowUrlInput(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      displayName,
      email,
      photoURL,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#2D2926]/70 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm shadow-2xl text-[#2D2926] flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#EFE9E2] border-b border-[#2D2926]/15 rounded-t-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#2D2926] text-white rounded-sm">
              <User className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#2D2926] text-lg sm:text-xl leading-tight">Perfil de Cuenta</h3>
              <p className="text-xs text-[#2D2926]/60">Configuración de usuario, foto e integración Google</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#2D2926]/60 hover:text-[#2D2926] hover:bg-[#F7F3EF] rounded-sm transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          
          {/* SECTION: Foto de Perfil Editar */}
          <div className="p-4 bg-[#EFE9E2] rounded-sm border border-[#2D2926]/15 space-y-3">
            <label className="block text-[11px] font-bold text-[#2D2926] uppercase tracking-wider">
              Foto del Perfil de Cuenta
            </label>

            {isCameraActive ? (
              <CameraPhotoCapture
                title="Sacar Foto de Perfil"
                onCapture={(dataUrl) => {
                  setPhotoURL(dataUrl);
                  setIsCameraActive(false);
                }}
                onCancel={() => setIsCameraActive(false)}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  {/* Current Avatar Frame */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[#2D2926] p-0.5 overflow-hidden shrink-0 bg-[#F7F3EF] shadow-md group">
                    {photoURL ? (
                      <img
                        src={photoURL}
                        alt={displayName}
                        className="w-full h-full rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[#2D2926] text-white flex items-center justify-center font-bold text-xl font-serif">
                        {displayName.substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsCameraActive(true)}
                      className="absolute inset-0 bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      title="Sacar foto con cámara"
                    >
                      <Camera className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsCameraActive(true)}
                        className="px-3 py-1.5 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold text-[11px] uppercase tracking-wider rounded-sm flex items-center gap-1.5 shadow-sm transition"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Sacar Foto</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-[#F7F3EF] hover:bg-[#E2DAD0] text-[#2D2926] border border-[#2D2926]/20 font-bold text-[11px] uppercase tracking-wider rounded-sm flex items-center gap-1 transition"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#2D2926]/70" />
                        <span>Subir Imagen</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="px-2.5 py-1.5 bg-[#F7F3EF] hover:bg-[#E2DAD0] text-[#2D2926]/70 border border-[#2D2926]/20 font-bold text-[11px] uppercase rounded-sm flex items-center gap-1"
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span>URL</span>
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {showUrlInput && (
                      <input
                        type="url"
                        placeholder="https://ejemplo.com/mifoto.jpg"
                        value={photoURL}
                        onChange={(e) => setPhotoURL(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs focus:outline-none focus:border-[#2D2926]"
                      />
                    )}
                  </div>
                </div>

                {/* Preset Avatars Selection */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D2926]/70 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>O elige un avatar de la lista:</span>
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {PRESET_AVATARS.map(avatar => (
                      <button
                        key={avatar.name}
                        type="button"
                        onClick={() => setPhotoURL(avatar.url)}
                        className={`p-0.5 rounded-full border-2 transition shrink-0 ${
                          photoURL === avatar.url ? 'border-emerald-600 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                        title={avatar.name}
                      >
                        <img
                          src={avatar.url}
                          alt={avatar.name}
                          className="w-8 h-8 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Google Auth Status Banner */}
          <div className="p-3.5 bg-[#EFE9E2] rounded-sm border border-[#2D2926]/15 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#2D2926] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#2D2926]/60">Google Account</p>
                <p className="text-xs font-bold text-[#2D2926]">{user.email}</p>
              </div>
            </div>

            {user.isLoggedIn ? (
              <button
                type="button"
                onClick={logout}
                className="px-2.5 py-1 bg-red-900 hover:bg-red-950 text-white text-[10px] font-bold uppercase tracking-wider rounded-sm transition flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" />
                <span>Salir</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={loginWithGoogle}
                className="px-3 py-1 bg-[#2D2926] hover:bg-[#403C39] text-white text-[10px] font-bold uppercase tracking-wider rounded-sm transition flex items-center gap-1 shadow"
              >
                <LogIn className="w-3 h-3 text-emerald-400" />
                <span>Conectar</span>
              </button>
            )}
          </div>

          {/* User & Store Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2D2926] mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs font-medium text-[#2D2926] focus:outline-none focus:border-[#2D2926]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2D2926] mb-1">Nombre Comercial / Local</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs font-bold text-[#2D2926] focus:outline-none focus:border-[#2D2926]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2D2926] mb-1">
              WhatsApp para Reportes
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#2D2926]/50" />
              <input
                type="tel"
                placeholder="+5491155554321"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs text-[#2D2926] font-mono font-bold focus:outline-none"
              />
            </div>
          </div>

          {/* Alert Defaults */}
          <div className="p-3.5 bg-[#EFE9E2] rounded-sm border border-[#2D2926]/15 space-y-2">
            <h4 className="text-[11px] font-bold text-[#2D2926] uppercase tracking-wider">
              Umbrales de Alerta Predeterminados
            </h4>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D2926]/70 mb-1">Stock Mín.</label>
                <input
                  type="number"
                  min="0"
                  value={defaultMinStock}
                  onChange={(e) => setDefaultMinStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-2 py-1.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs font-mono font-bold text-amber-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D2926]/70 mb-1">Días Venc.</label>
                <input
                  type="number"
                  min="1"
                  value={defaultExpirationAlertDays}
                  onChange={(e) => setDefaultExpirationAlertDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-2 py-1.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs font-mono font-bold text-red-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D2926]/70 mb-1">Moneda</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-2 py-1.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs font-bold text-[#2D2926]"
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
            <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-sm text-emerald-900 text-xs text-center font-bold flex items-center justify-center gap-2 animate-fade-in">
              <Check className="w-4 h-4" />
              <span>¡Perfil y Foto actualizados con éxito!</span>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2 border-t border-[#2D2926]/10 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#EFE9E2] hover:bg-[#2D2926]/10 text-[#2D2926] font-bold text-xs uppercase tracking-wider rounded-sm transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold text-xs uppercase tracking-widest rounded-sm transition shadow-md"
            >
              Guardar Perfil
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
