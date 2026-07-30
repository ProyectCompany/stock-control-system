import React, { useState, useEffect } from 'react';
import { X, Barcode, Camera, AlertTriangle, Calendar, Package, RefreshCw, Trash2 } from 'lucide-react';
import { Product } from '../types';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { generateRandomBarcode } from '../utils/barcodeUtils';
import { ConfirmModal } from './ConfirmModal';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  initialBarcode?: string;
  onOpenScanner?: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  initialBarcode,
  onOpenScanner
}) => {
  const { addProduct, updateProduct, deleteProduct, categories } = useInventory();
  const { user } = useAuth();

  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [quantity, setQuantity] = useState<number>(10);
  const [minStockThreshold, setMinStockThreshold] = useState<number>(user.defaultMinStock || 5);
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [expirationAlertDays, setExpirationAlertDays] = useState<number>(user.defaultExpirationAlertDays || 7);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [unit, setUnit] = useState('unidades');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setBarcode(productToEdit.barcode || '');
      setName(productToEdit.name || '');
      setCategory(productToEdit.category || 'Almacén');
      setCustomCategory('');
      setQuantity(productToEdit.quantity ?? 0);
      setMinStockThreshold(productToEdit.minStockThreshold ?? user.defaultMinStock);
      
      if (productToEdit.expirationDate) {
        setHasExpiration(true);
        setExpirationDate(productToEdit.expirationDate);
      } else {
        setHasExpiration(false);
        setExpirationDate('');
      }

      setExpirationAlertDays(productToEdit.expirationAlertDays ?? user.defaultExpirationAlertDays);
      setCostPrice(productToEdit.costPrice ?? 0);
      setSellingPrice(productToEdit.sellingPrice ?? 0);
      setUnit(productToEdit.unit || 'unidades');
      setSupplier(productToEdit.supplier || '');
      setLocation(productToEdit.location || '');
      setNotes(productToEdit.notes || '');
      setImageUrl(productToEdit.imageUrl || '');
    } else {
      // Reset form
      setBarcode(initialBarcode || '');
      setName('');
      setCategory(categories[0] || 'Almacén');
      setCustomCategory('');
      setQuantity(10);
      setMinStockThreshold(user.defaultMinStock || 5);
      setHasExpiration(false);
      setExpirationDate('');
      setExpirationAlertDays(user.defaultExpirationAlertDays || 7);
      setCostPrice(0);
      setSellingPrice(0);
      setUnit('unidades');
      setSupplier('');
      setLocation('');
      setNotes('');
      setImageUrl('');
    }
  }, [productToEdit, initialBarcode, isOpen, user.defaultMinStock, user.defaultExpirationAlertDays]);

  const handleDelete = () => {
    if (productToEdit) {
      setIsConfirmDeleteOpen(true);
    }
  };

  const confirmDeleteProduct = () => {
    if (productToEdit) {
      deleteProduct(productToEdit.id);
      setIsConfirmDeleteOpen(false);
      onClose();
    }
  };

  const handleGenerateBarcode = () => {
    setBarcode(generateRandomBarcode());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalCategory = category === 'NEW' ? (customCategory.trim() || 'General') : category;

    const productPayload = {
      barcode: barcode.trim() || generateRandomBarcode(),
      name: name.trim(),
      category: finalCategory,
      quantity: Number(quantity) || 0,
      minStockThreshold: Number(minStockThreshold) || 0,
      expirationDate: hasExpiration && expirationDate ? expirationDate : null,
      expirationAlertDays: Number(expirationAlertDays) || 7,
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      unit: unit || 'unidades',
      supplier: supplier.trim(),
      location: location.trim(),
      notes: notes.trim(),
      imageUrl: imageUrl.trim() || undefined
    };

    if (productToEdit) {
      updateProduct(productToEdit.id, productPayload);
    } else {
      addProduct(productPayload);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2926]/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm shadow-2xl text-[#2D2926] flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-[#EFE9E2] border-b border-[#2D2926]/15 rounded-t-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#2D2926] text-white rounded-sm">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#2D2926] text-xl">
                {productToEdit ? 'Editar Producto' : 'Dar de Alta Producto'}
              </h3>
              <p className="text-xs text-[#2D2926]/60 font-sans">Gestión de datos de inventario y umbrales de alerta</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#2D2926]/60 hover:text-[#2D2926] hover:bg-[#F7F3EF] rounded-sm transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 font-sans">
          
          {/* Section 1: Barcode & Identification */}
          <div className="p-5 bg-[#EFE9E2] rounded-sm border border-[#2D2926]/10 space-y-3">
            <label className="block text-xs font-bold text-[#2D2926] uppercase tracking-wider">
              Referencia / Código de Barras
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2D2926]/50" />
                <input
                  type="text"
                  placeholder="Escanea o escribe el código"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-sm font-mono font-bold text-[#2D2926] focus:outline-none focus:border-[#2D2926]"
                />
              </div>

              {onOpenScanner && (
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="px-4 py-2.5 bg-[#2D2926] text-white rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition hover:bg-[#403C39]"
                  title="Escanear con cámara"
                >
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Escanear</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleGenerateBarcode}
                className="px-4 py-2.5 bg-[#F7F3EF] hover:bg-[#EFE9E2] text-[#2D2926] border border-[#2D2926]/20 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
                title="Generar código aleatorio"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Generar</span>
              </button>
            </div>
          </div>

          {/* Section 2: Main Product Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2D2926] mb-1.5">
                Nombre del Producto <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Alimento Seco Premium 15kg"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-sm text-[#2D2926] focus:outline-none focus:border-[#2D2926] font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2D2926] mb-1.5">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-sm text-[#2D2926] focus:outline-none focus:border-[#2D2926] font-medium"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="Almacén">Almacén</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Lácteos">Lácteos</option>
                <option value="Fiambres y Quesos">Fiambres y Quesos</option>
                <option value="Limpieza">Limpieza</option>
                <option value="Panadería">Panadería</option>
                <option value="Golosinas">Golosinas</option>
                <option value="NEW">+ Agregar nueva categoría...</option>
              </select>

              {category === 'NEW' && (
                <input
                  type="text"
                  placeholder="Escribe el nombre de la nueva categoría"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-2 w-full px-4 py-2 bg-[#F7F3EF] border border-[#2D2926]/30 rounded-sm text-xs text-[#2D2926] focus:outline-none"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2D2926] mb-1.5">Unidad de Medida</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-4 py-3 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-sm text-[#2D2926] focus:outline-none focus:border-[#2D2926] font-medium"
              >
                <option value="unidades">Unidades (u.)</option>
                <option value="kg">Kilogramos (kg)</option>
                <option value="litros">Litros (L)</option>
                <option value="cajas">Cajas</option>
                <option value="packs">Packs</option>
                <option value="docenas">Docenas</option>
              </select>
            </div>

          </div>

          {/* Section 3: Stock Quantity & LOW STOCK ALERT Threshold */}
          <div className="p-5 bg-amber-500/10 border border-amber-600/20 rounded-sm space-y-4">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Control de Stock y Alerta Personalizada de Stock Bajo
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2D2926] mb-1">
                  Cantidad Actual
                </label>
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-4 py-3 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-sm font-mono font-bold text-[#2D2926] focus:outline-none focus:border-[#2D2926]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2D2926] mb-1">
                  Umbral de Stock Bajo
                </label>
                <input
                  type="number"
                  min="0"
                  value={minStockThreshold}
                  onChange={(e) => setMinStockThreshold(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-4 py-3 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-sm font-mono font-bold text-amber-900 focus:outline-none focus:border-amber-700"
                />
                <p className="text-[11px] text-[#2D2926]/60 mt-1">
                  Activa la alerta cuando el stock sea menor o igual a esta cantidad.
                </p>
              </div>
            </div>

            {quantity <= minStockThreshold && (
              <div className="p-3 bg-amber-100 border border-amber-300 rounded-sm text-xs text-amber-900 flex items-center gap-2 font-medium">
                <span>⚠️ El producto entrará inmediatamente en <strong>Alerta de Stock Bajo</strong>.</span>
              </div>
            )}
          </div>

          {/* Section 4: EXPIRATION DATE ALERT Threshold */}
          <div className="p-5 bg-red-500/10 border border-red-600/20 rounded-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-900">
                <Calendar className="w-4 h-4 text-red-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Alerta Personalizada de Vencimiento Próximo
                </h4>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2D2926] cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasExpiration}
                  onChange={(e) => setHasExpiration(e.target.checked)}
                  className="w-4 h-4 accent-[#2D2926]"
                />
                <span>Habilitar Vencimiento</span>
              </label>
            </div>

            {hasExpiration && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2D2926] mb-1">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-sm text-[#2D2926] focus:outline-none focus:border-[#2D2926]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2D2926] mb-1">
                    Días de Anticipación para Alerta
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={expirationAlertDays}
                    onChange={(e) => setExpirationAlertDays(Math.max(1, parseInt(e.target.value, 10) || 7))}
                    className="w-full px-4 py-3 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-sm font-mono font-bold text-red-900 focus:outline-none focus:border-red-700"
                  />
                  <p className="text-[11px] text-[#2D2926]/60 mt-1">
                    Notificar {expirationAlertDays} días antes de la fecha límite.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Pricing & Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2D2926] mb-1">Precio de Costo ({user.currency})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={costPrice}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-sm font-mono text-[#2D2926] focus:outline-none focus:border-[#2D2926]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2D2926] mb-1">Precio de Venta ({user.currency})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-sm font-mono font-bold text-emerald-900 focus:outline-none focus:border-emerald-800"
              />
            </div>
          </div>

          {/* Section 6: Additional Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2D2926] mb-1">Proveedor</label>
              <input
                type="text"
                placeholder="Ej. Distribuidora San Juan"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-4 py-3 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-sm text-[#2D2926] focus:outline-none focus:border-[#2D2926]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2D2926] mb-1">Ubicación en Depósito</label>
              <input
                type="text"
                placeholder="Ej. Estante A3, Heladera 2"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-sm text-[#2D2926] focus:outline-none focus:border-[#2D2926]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2D2926] mb-1">URL de Imagen del Producto</label>
            <input
              type="url"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-4 py-3 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs text-[#2D2926] focus:outline-none focus:border-[#2D2926]"
            />
          </div>

          {/* Submit & Delete Buttons */}
          <div className="pt-4 border-t border-[#2D2926]/10 flex flex-wrap items-center justify-between gap-3">
            {productToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-3 bg-red-800 hover:bg-red-900 text-white font-bold text-xs uppercase tracking-wider rounded-sm transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Producto</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
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
                {productToEdit ? 'Guardar Cambios' : 'Dar de Alta Producto'}
              </button>
            </div>
          </div>

        </form>
      </div>

      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        title="Eliminar Producto"
        message={`¿Estás seguro de que deseas eliminar "${productToEdit?.name}" del inventario?`}
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDeleteProduct}
        onCancel={() => setIsConfirmDeleteOpen(false)}
        danger
      />
    </div>
  );
};
