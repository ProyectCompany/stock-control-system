import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  danger = true,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="w-full max-w-md bg-[#F7F3EF] border-2 border-[#2D2926] shadow-2xl rounded-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 flex items-center justify-between border-b ${
          danger ? 'bg-red-800 text-white' : 'bg-[#2D2926] text-white'
        }`}>
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-300" />
            <h3 className="font-serif font-bold text-base uppercase tracking-tight">
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-sm transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <p className="text-sm font-sans text-[#2D2926] leading-relaxed">
            {message}
          </p>
          <p className="text-xs font-mono text-[#2D2926]/60 italic">
            Esta acción modificará tu stock de forma permanente.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#EFE9E2] border-t border-[#2D2926]/15 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-[#F7F3EF] hover:bg-[#EFE9E2] text-[#2D2926] border border-[#2D2926]/20 font-bold text-xs uppercase tracking-wider rounded-sm transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-sm transition flex items-center gap-2 shadow-sm ${
              danger
                ? 'bg-red-800 hover:bg-red-900 text-white'
                : 'bg-[#2D2926] hover:bg-[#403C39] text-white'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
