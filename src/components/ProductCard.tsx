import React, { useState } from 'react';
import { Barcode, AlertTriangle, Edit3, Trash2, Plus, Minus, Clock } from 'lucide-react';
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
    <div className={`p-3 sm:p-5 rounded-sm border transition flex flex-col justify-between bg-[#EFE9E2] ${
      isExpired
        ? 'border-l-4 border-l-red-600 border-t border-r border-b border-[#2D2926]/10'
        : isLowStock || isOut
        ? 'border-l-4 border-l-amber-500 border-t border-r border-b border-[#2D2926]/10'
        : isExpiringSoon
        ? 'border-l-4 border-l-red-500 border-t border-r border-b border-[#2D2926]/10'
        : 'border border-[#2D2926]/10 hover:border-[#2D2926]/30'
    }`}>
      
      {/* Top Bar: Category & Barcode */}
      <div>
        <div className="flex items-center justify-between text-xs text-[#2D2926]/60 mb-2 sm:mb-3">
          <span className="px-2 py-0.5 rounded-sm bg-[#F7F3EF] text-[#2D2926] font-sans font-bold text-[9px] sm:text-[10px] uppercase tracking-wider border border-[#2D2926]/10">
            {product.category}
          </span>

          <div className="flex items-center gap-1 font-mono text-[10px] sm:text-[11px] text-[#2D2926]/70 bg-[#F7F3EF] px-1.5 py-0.5 rounded-sm border border-[#2D2926]/10">
            <Barcode className="w-3 h-3 text-[#2D2926]" />
            <span>#{product.barcode}</span>
          </div>
        </div>

        {/* Product Image & Name */}
        <div className="flex gap-2.5 sm:gap-3.5 items-start">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-sm border border-[#2D2926]/15 shrink-0 bg-[#F7F3EF]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-sm bg-[#F7F3EF] border border-[#2D2926]/15 shrink-0 flex items-center justify-center font-bold text-[#2D2926]/40 text-base sm:text-lg font-serif">
              {product.name.substring(0, 2).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[#2D2926] text-sm sm:text-base leading-snug truncate font-sans" title={product.name}>
              {product.name}
            </h3>

            {/* Badges for Low Stock / Expired / Expiring Soon */}
            <div className="flex flex-wrap gap-1 mt-1 sm:mt-2">
              {isExpired && (
                <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider rounded-full bg-red-100 text-red-800 border border-red-200">
                  Vencido ({product.expirationDate})
                </span>
              )}

              {!isExpired && isExpiringSoon && (
                <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider rounded-full bg-red-100 text-red-800 border border-red-200 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  <span>Vence en {daysToExp}d</span>
                </span>
              )}

              {isOut ? (
                <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider rounded-full bg-red-100 text-red-800 border border-red-200">
                  Sin Stock
                </span>
              ) : isLowStock ? (
                <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  <span>Stock Crítico (Mín: {product.minStockThreshold})</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Info: Stock & Pricing */}
      <div className="my-2 py-2 px-2.5 sm:my-4 sm:py-3 sm:px-3.5 bg-[#F7F3EF] rounded-sm border border-[#2D2926]/10 flex items-center justify-between text-xs">
        <div>
          <span className="text-[#2D2926]/50 block text-[8px] sm:text-[9px] uppercase font-bold tracking-widest">Stock Actual</span>
          <span className="text-base sm:text-lg font-bold font-mono text-[#2D2926]">
            {product.quantity.toString().padStart(2, '0')} <span className="text-[10px] sm:text-xs font-normal text-[#2D2926]/60">{product.unit}</span>
          </span>
        </div>

        <div className="text-right">
          <span className="text-[#2D2926]/50 block text-[8px] sm:text-[9px] uppercase font-bold tracking-widest">Precio Venta</span>
          <span className="text-sm sm:text-base font-bold text-[#2D2926] font-mono">
            {user.currency} {product.sellingPrice.toLocaleString('es-AR')}
          </span>
        </div>
      </div>

      {/* Bottom Actions: Quick Quantity Buttons & Edit */}
      <div className="flex items-center justify-between pt-3 border-t border-[#2D2926]/10">
        
        {/* Quick Increment/Decrement */}
        <div className="flex items-center gap-1.5 bg-[#F7F3EF] p-1 rounded-sm border border-[#2D2926]/15">
          <button
            onClick={() => adjustQuantity(product.id, -1, 'Ajuste directo tarjeta')}
            className="p-1 bg-[#2D2926] hover:bg-[#403C39] text-white rounded-sm transition"
            title="Restar 1"
          >
            <Minus className="w-3 h-3" />
          </button>
          
          <span className="px-2 font-mono text-xs font-bold text-[#2D2926] min-w-[24px] text-center">
            {product.quantity}
          </span>

          <button
            onClick={() => adjustQuantity(product.id, 1, 'Ajuste directo tarjeta')}
            className="p-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-sm transition"
            title="Sumar 1"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Card Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(product)}
            className="p-2 text-[#2D2926]/60 hover:text-[#2D2926] hover:bg-[#F7F3EF] rounded-sm transition"
            title="Editar producto"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            onClick={handleDelete}
            className="p-2 text-[#2D2926]/60 hover:text-red-700 hover:bg-[#F7F3EF] rounded-sm transition"
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
