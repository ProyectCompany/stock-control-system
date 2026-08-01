import React, { useState, useEffect } from 'react';
import { X, Send, Phone, MessageSquare, FileText, CheckCircle2 } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { formatWhatsAppStockMessage } from '../utils/whatsappHelper';
import { shareStockPDFViaWhatsApp } from '../utils/pdfGenerator';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose }) => {
  const { products } = useInventory();
  const { user, updateProfile } = useAuth();

  const [phone, setPhone] = useState(user.whatsappNumber || '');
  const [reportType, setReportType] = useState<'FULL' | 'ALERTS_ONLY'>('FULL');
  const [messagePreview, setMessagePreview] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPhone(user.whatsappNumber || '');
    }
  }, [user.whatsappNumber, isOpen]);

  useEffect(() => {
    const productsToInclude = reportType === 'ALERTS_ONLY'
      ? products.filter(p => {
          const isLow = p.quantity <= p.minStockThreshold;
          let isExp = false;
          if (p.expirationDate) {
            const exp = new Date(p.expirationDate);
            const today = new Date();
            const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
            isExp = diffDays <= p.expirationAlertDays;
          }
          return isLow || isExp;
        })
      : products;

    const formatted = formatWhatsAppStockMessage(productsToInclude, user);
    setMessagePreview(formatted);
  }, [products, user, reportType, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setIsSending(true);

    if (phone.trim() !== user.whatsappNumber) {
      updateProfile({ whatsappNumber: phone.trim() });
    }

    const productsToInclude = reportType === 'ALERTS_ONLY'
      ? products.filter(p => {
          const isLow = p.quantity <= p.minStockThreshold;
          let isExp = false;
          if (p.expirationDate) {
            const exp = new Date(p.expirationDate);
            const today = new Date();
            const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
            isExp = diffDays <= p.expirationAlertDays;
          }
          return isLow || isExp;
        })
      : products;

    try {
      await shareStockPDFViaWhatsApp(productsToInclude, user, phone.trim(), messagePreview);
    } catch (err) {
      console.warn('Error sending WhatsApp with PDF:', err);
    }

    setIsSending(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#2D2926]/70 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm shadow-2xl text-[#2D2926] flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#EFE9E2] border-b border-[#2D2926]/15 rounded-t-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#2D2926] text-white rounded-sm">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#2D2926] text-lg sm:text-xl">Enviar Reporte PDF a WhatsApp</h3>
              <p className="text-xs text-[#2D2926]/60">Exportación automática de mensaje + archivo PDF adjunto</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#2D2926]/60 hover:text-[#2D2926] hover:bg-[#F7F3EF] rounded-sm transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSend} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2D2926] mb-1">
              Número de WhatsApp Destinatario <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2D2926]/50" />
              <input
                type="tel"
                required
                placeholder="+5491155554321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs sm:text-sm font-mono font-bold text-[#2D2926] focus:outline-none focus:border-[#2D2926]"
              />
            </div>
            <p className="text-[11px] text-[#2D2926]/60 mt-1">
              Ingresa el código de país (Ej: +54911... o 54911...)
            </p>
          </div>

          {/* PDF Info Card */}
          <div className="p-3 bg-emerald-500/10 border border-emerald-600/20 rounded-sm text-xs text-[#2D2926] flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>
              <strong>Adjunto PDF Automático:</strong> Al presionar enviar, en teléfonos móviles (Android / iPhone) se compartirá directamente el <strong>archivo PDF completo del reporte</strong> en el chat de WhatsApp.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2D2926] mb-1">Tipo de Reporte</label>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => setReportType('FULL')}
                className={`p-2.5 rounded-sm border font-bold uppercase tracking-wider text-[11px] transition ${
                  reportType === 'FULL'
                    ? 'bg-[#2D2926] border-[#2D2926] text-white'
                    : 'bg-[#F7F3EF] border-[#2D2926]/20 text-[#2D2926] hover:bg-[#EFE9E2]'
                }`}
              >
                Stock Completo + PDF
              </button>

              <button
                type="button"
                onClick={() => setReportType('ALERTS_ONLY')}
                className={`p-2.5 rounded-sm border font-bold uppercase tracking-wider text-[11px] transition ${
                  reportType === 'ALERTS_ONLY'
                    ? 'bg-amber-800 border-amber-900 text-white'
                    : 'bg-[#F7F3EF] border-amber-700/30 text-amber-900 hover:bg-[#EFE9E2]'
                }`}
              >
                Alertas Urgentes + PDF
              </button>
            </div>
          </div>

          {/* Message Text Preview Box */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2D2926] mb-1">Vista Previa del Mensaje</label>
            <textarea
              readOnly
              rows={5}
              value={messagePreview}
              className="w-full p-3 bg-[#EFE9E2] border border-[#2D2926]/15 rounded-sm text-xs font-mono text-[#2D2926] focus:outline-none resize-none leading-relaxed"
            />
          </div>

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
              disabled={isSending}
              className="px-5 py-2 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold text-xs uppercase tracking-widest rounded-sm transition shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-emerald-400" />
              <span>{isSending ? 'Generando PDF...' : 'Enviar con PDF por WhatsApp'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
