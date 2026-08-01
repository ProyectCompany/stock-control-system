import React, { useState } from 'react';
import { Barcode, AlertTriangle, Edit3, Trash2, Plus, Minus, Clock, Eye, Sparkles } from 'lucide-react';
import { Product } from '../types';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from './ConfirmModal';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit }) => {
  const { adjustQuantity, deleteProduct } = useInventory();
  const { user } = useAuth();
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Status checks
  const isOut = product.quantity === 0;
  const isLowStock = product.quantity <= product.minStockThreshold;

  let isExpired = false;
  let isExpiringSoon = false;
  let daysToExp = 999;

  if (product.expirationDate) {
    const expDate = new Date(product.expirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    daysToExp = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (daysToExp < 0) {
      isExpired = true;
    } else if (daysToExp <= product.expirationAlertDays) {
      isExpiringSoon = true;
    }
  }

  const handleDelete = () => {
    setIsConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    deleteProduct(product.id);
    setIsConfirmDeleteOpen(false);
  };

  return (
    <div className={`p-4 sm:p-5 rounded-sm border transition-all duration-200 flex flex-col justify-between bg-[#EFE9E2] shadow-sm hover:shadow-md relative overflow-hidden group ${
      isExpired
        ? 'border-l-4 border-l-red-600 border-t border-r border-b border-[#2D2926]/15'
        : isLowStock || isOut
        ? 'border-l-4 border-l-amber-500 border-t border-r border-b border-[#2D2926]/15'
        : isExpiringSoon
        ? 'border-l-4 border-l-red-500 border-t border-r border-b border-[#2D2926]/15'
        : 'border border-[#2D2926]/15 hover:border-[#2D2926]/40'
    }`}>
      
      {/* Top Header Bar: Category Badge & Barcode Tag */}
      <div>
        <div className="flex items-center justify-between text-xs text-[#2D2926]/70 mb-3">
          <span className="px-2.5 py-0.5 rounded-sm bg-[#F7F3EF] text-[#2D2926] font-sans font-bold text-[10px] uppercase tracking-widest border border-[#2D2926]/15 shadow-2xs">
            {product.category}
          </span>

          <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-[#2D2926] bg-[#F7F3EF] px-2 py-0.5 rounded-sm border border-[#2D2926]/15">
            <Barcode className="w-3.5 h-3.5 text-[#2D2926]" />
            <span>#{product.barcode}</span>
          </div>
        </div>

        {/* Main Product Info & Image Preview */}
        <div className="flex gap-3.5 items-start">
          {product.imageUrl ? (
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-sm border border-[#2D2926]/20 shrink-0 bg-[#F7F3EF] overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-sm bg-[#F7F3EF] border border-[#2D2926]/20 shrink-0 flex flex-col items-center justify-center font-bold text-[#2D2926]/50 font-serif shadow-inner">
              <span className="text-xl leading-none">{product.name.substring(0, 2).toUpperCase()}</span>
              <span className="text-[8px] font-sans uppercase font-bold text-[#2D2926]/40 mt-1">Sin Foto</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[#2D2926] text-base sm:text-lg leading-tight truncate font-serif" title={product.name}>
              {product.name}
            </h3>

            {product.supplier && (
              <p className="text-[11px] text-[#2D2926]/60 font-medium truncate mt-0.5">
                Prov: <strong className="text-[#2D2926]">{product.supplier}</strong>
              </p>
            )}

            {/* Badges for Low Stock / Expired / Expiring Soon */}
            <div className="flex flex-wrap gap-1 mt-2">
              {isExpired && (
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-red-100 text-red-900 border border-red-300">
                  Vencido ({product.expirationDate})
                </span>
              )}

              {!isExpired && isExpiringSoon && (
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-red-700" />
                  <span>Vence en {daysToExp}d</span>
                </span>
              )}

              {isOut ? (
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-red-100 text-red-900 border border-red-300 font-mono">
                  Sin Stock
                </span>
              ) : isLowStock ? (
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                  <span>Stock Crítico (Mín: {product.minStockThreshold})</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Stock Counter & Price Panel */}
      <div className="my-3 py-2.5 px-3 bg-[#F7F3EF] rounded-sm border border-[#2D2926]/15 flex items-center justify-between text-xs shadow-2xs">
        <div>
          <span className="text-[#2D2926]/60 block text-[9px] uppercase font-bold tracking-widest">Stock Disponible</span>
          <span className="text-lg sm:text-xl font-extrabold font-mono text-[#2D2926]">
            {product.quantity.toString().padStart(2, '0')} <span className="text-xs font-medium text-[#2D2926]/60">{product.unit}</span>
          </span>
        </div>

        <div className="text-right">
          <span className="text-[#2D2926]/60 block text-[9px] uppercase font-bold tracking-widest">Precio Venta</span>
          <span className="text-base sm:text-lg font-extrabold text-emerald-900 font-mono">
            {user.currency} {product.sellingPrice.toLocaleString('es-AR')}
          </span>
        </div>
      </div>

      {/* Bottom Actions Toolbar */}
      <div className="flex items-center justify-between pt-2 border-t border-[#2D2926]/10">
        
        {/* Quick Increment/Decrement Buttons */}
        <div className="flex items-center gap-1.5 bg-[#F7F3EF] p-1 rounded-sm border border-[#2D2926]/20">
          <button
            onClick={() => adjustQuantity(product.id, -1, 'Ajuste directo tarjeta')}
            className="p-1.5 bg-[#2D2926] hover:bg-[#403C39] text-white rounded-sm transition shadow-2xs"
            title="Restar 1"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          
          <span className="px-2 font-mono text-xs font-extrabold text-[#2D2926] min-w-[24px] text-center">
            {product.quantity}
          </span>

          <button
            onClick={() => adjustQuantity(product.id, 1, 'Ajuste directo tarjeta')}
            className="p-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-sm transition shadow-2xs font-bold"
            title="Sumar 1"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card Edit & Delete Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(product)}
            className="px-3 py-1.5 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold text-xs uppercase tracking-wider rounded-sm transition flex items-center gap-1 shadow-2xs"
            title="Editar producto"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Editar</span>
          </button>

          <button
            onClick={handleDelete}
            className="p-1.5 text-red-700 hover:text-red-950 hover:bg-red-100 rounded-sm transition"
            title="Eliminar producto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

      </div>

      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        title="Eliminar Producto"
        message={`¿Estás seguro de eliminar "${product.name}" del inventario?`}
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmDeleteOpen(false)}
        danger
      />

    </div>
  );
};
