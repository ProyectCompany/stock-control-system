import React, { useState, useEffect, useRef } from 'react';
import { X, Barcode, Camera, AlertTriangle, Calendar, Package, RefreshCw, Trash2, Upload, Link as LinkIcon, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { Product } from '../types';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { generateRandomBarcode } from '../utils/barcodeUtils';
import { ConfirmModal } from './ConfirmModal';
import { CameraPhotoCapture } from './CameraPhotoCapture';

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
  const [quantity, setQuantity] = useState<number | string>(10);
  const [minStockThreshold, setMinStockThreshold] = useState<number | string>(user.defaultMinStock || 5);
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [expirationAlertDays, setExpirationAlertDays] = useState<number | string>(user.defaultExpirationAlertDays || 7);
  const [costPrice, setCostPrice] = useState<number | string>('');
  const [sellingPrice, setSellingPrice] = useState<number | string>('');
  const [unit, setUnit] = useState('unidades');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // Camera & Photo UI states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      
      // Auto expand advanced details if product has supplier, location or expiration
      if (productToEdit.supplier || productToEdit.location || productToEdit.expirationDate || productToEdit.costPrice > 0 || productToEdit.notes) {
        setShowAdvancedDetails(true);
      }
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
      setCostPrice('');
      setSellingPrice('');
      setUnit('unidades');
      setSupplier('');
      setLocation('');
      setNotes('');
      setImageUrl('');
      setShowAdvancedDetails(false);
    }
    setIsCameraActive(false);
    setShowUrlInput(false);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
          setShowUrlInput(false);
        }
      };
      reader.readAsDataURL(file);
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#2D2926]/70 backdrop-blur-sm animate-fade-in font-sans">
      {/* Compact Modal Box (max-w-lg) */}
      <div className="relative w-full max-w-lg bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm shadow-2xl text-[#2D2926] flex flex-col max-h-[94vh]">
        
        {/* Header - Compact */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#EFE9E2] border-b border-[#2D2926]/15 rounded-t-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#2D2926] text-white rounded-sm">
              <Package className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#2D2926] text-base sm:text-lg leading-tight">
                {productToEdit ? 'Editar Producto' : 'Dar de Alta Producto'}
              </h3>
              <p className="text-[11px] text-[#2D2926]/60 font-sans">Gestión ágil de stock e inventario</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#2D2926]/60 hover:text-[#2D2926] hover:bg-[#F7F3EF] rounded-sm transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Compact scrollable */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          
          {/* SECTION: Foto del Producto & Cámara */}
          <div className="p-3 bg-[#EFE9E2] rounded-sm border border-[#2D2926]/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#2D2926] uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#2D2926]" />
                <span>Foto del Producto</span>
              </label>
              {imageUrl && !isCameraActive && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-[10px] text-red-700 hover:text-red-900 font-bold uppercase underline"
                >
                  Quitar foto
                </button>
              )}
            </div>

            {/* Camera View Mode */}
            {isCameraActive ? (
              <CameraPhotoCapture
                title="Sacar Foto al Producto"
                onCapture={(dataUrl) => {
                  setImageUrl(dataUrl);
                  setIsCameraActive(false);
                }}
                onCancel={() => setIsCameraActive(false)}
              />
            ) : (
              <div className="flex items-center gap-3">
                {/* Thumbnail Preview */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-sm border border-[#2D2926]/20 bg-[#F7F3EF] overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-center p-1 text-[#2D2926]/40">
                      <Camera className="w-6 h-6 mx-auto stroke-1" />
                      <span className="text-[9px] font-bold block mt-0.5">Sin Foto</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex-1 space-y-1.5">
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
                      className="px-3 py-1.5 bg-[#F7F3EF] hover:bg-[#EFE9E2] text-[#2D2926] border border-[#2D2926]/20 font-bold text-[11px] uppercase tracking-wider rounded-sm flex items-center gap-1 transition"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#2D2926]/70" />
                      <span>Subir Foto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="px-2.5 py-1.5 bg-[#F7F3EF] hover:bg-[#EFE9E2] text-[#2D2926]/70 border border-[#2D2926]/20 font-bold text-[11px] uppercase rounded-sm flex items-center gap-1"
                      title="Ingresar URL de imagen"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span className="hidden sm:inline">URL</span>
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
                      placeholder="https://ejemplo.com/foto.jpg"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs focus:outline-none focus:border-[#2D2926]"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION: Referencia & Código de Barras */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-[#2D2926] uppercase tracking-wider">
              Código de Barras / Ref.
            </label>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Barcode className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#2D2926]/50" />
                <input
                  type="text"
                  placeholder="Escanea o ingresa código"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs font-mono font-bold text-[#2D2926] focus:outline-none focus:border-[#2D2926]"
                />
              </div>

              {onOpenScanner && (
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="px-2.5 py-1.5 bg-[#2D2926] text-white rounded-sm text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-[#403C39]"
                  title="Escanear con lector"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Scanner</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleGenerateBarcode}
                className="px-2.5 py-1.5 bg-[#EFE9E2] hover:bg-[#E2DAD0] text-[#2D2926] border border-[#2D2926]/20 rounded-sm text-[11px] font-bold uppercase flex items-center gap-1"
                title="Generar código aleatorio"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Generar</span>
              </button>
            </div>
          </div>

          {/* SECTION: Datos Principales (Nombre, Categoría, Unidad) */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2D2926] mb-1">
                Nombre del Producto <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Alfajor Triple Chocolate"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs sm:text-sm text-[#2D2926] focus:outline-none focus:border-[#2D2926] font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2D2926] mb-1">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs text-[#2D2926] focus:outline-none font-medium"
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
                  <option value="NEW">+ Nueva categoría...</option>
                </select>

                {category === 'NEW' && (
                  <input
                    type="text"
                    placeholder="Nombre nueva categoría"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="mt-1.5 w-full px-2.5 py-1 bg-[#F7F3EF] border border-[#2D2926]/30 rounded-sm text-xs"
                  />
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2D2926] mb-1">Unidad</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs text-[#2D2926] focus:outline-none font-medium"
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

            {/* Cantidad & Precio Venta */}
            <div className="grid grid-cols-2 gap-2.5 p-3 bg-amber-500/10 border border-amber-600/20 rounded-sm">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2D2926] mb-1">
                  Cantidad Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-1.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-sm font-mono font-bold text-[#2D2926] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2D2926] mb-1">
                  Precio Venta ({user.currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-1.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-sm font-mono font-bold text-emerald-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* ACCORDION TOGGLE: Opciones Avanzadas y Alertas */}
          <div className="border-t border-[#2D2926]/10 pt-2">
            <button
              type="button"
              onClick={() => setShowAdvancedDetails(!showAdvancedDetails)}
              className="w-full px-3 py-2 bg-[#EFE9E2] hover:bg-[#E2DAD0] rounded-sm flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#2D2926] transition"
            >
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                <span>Alertas y Opciones Avanzadas</span>
              </span>
              {showAdvancedDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvancedDetails && (
              <div className="p-3 mt-2 bg-[#EFE9E2]/60 rounded-sm border border-[#2D2926]/10 space-y-3 animate-fade-in">
                
                {/* Umbral Stock Bajo & Precio Costo */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D2926] mb-1">
                      Umbral Stock Mínimo
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={minStockThreshold}
                      onChange={(e) => setMinStockThreshold(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-2.5 py-1.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs font-mono font-bold text-amber-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D2926] mb-1">
                      Precio Costo ({user.currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-2.5 py-1.5 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs font-mono text-[#2D2926]"
                    />
                  </div>
                </div>

                {/* Vencimiento */}
                <div className="p-2.5 bg-red-500/10 border border-red-600/20 rounded-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-900 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-red-700" />
                      <span>Alerta de Vencimiento</span>
                    </span>
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-[#2D2926] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasExpiration}
                        onChange={(e) => setHasExpiration(e.target.checked)}
                        className="w-3.5 h-3.5 accent-[#2D2926]"
                      />
                      <span>Habilitar</span>
                    </label>
                  </div>

                  {hasExpiration && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-[#2D2926]">Fecha Límite</label>
                        <input
                          type="date"
                          value={expirationDate}
                          onChange={(e) => setExpirationDate(e.target.value)}
                          className="w-full px-2 py-1 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs text-[#2D2926]"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-[#2D2926]">Aviso Días Antes</label>
                        <input
                          type="number"
                          min="1"
                          max="180"
                          value={expirationAlertDays}
                          onChange={(e) => setExpirationAlertDays(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-2 py-1 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs font-mono font-bold text-red-900"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Proveedor & Ubicación */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D2926] mb-0.5">Proveedor</label>
                    <input
                      type="text"
                      placeholder="Ej. San Juan S.A."
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      className="w-full px-2.5 py-1 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs text-[#2D2926]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D2926] mb-0.5">Ubicación Depósito</label>
                    <input
                      type="text"
                      placeholder="Ej. Estante B2"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-2.5 py-1 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs text-[#2D2926]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D2926] mb-0.5">Notas adicionales</label>
                  <input
                    type="text"
                    placeholder="Detalles o comentarios opcionales..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-2.5 py-1 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs text-[#2D2926]"
                  />
                </div>

              </div>
            )}
          </div>

          {/* Submit & Delete Buttons - Compact */}
          <div className="pt-2 border-t border-[#2D2926]/10 flex items-center justify-between gap-2 shrink-0">
            {productToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 bg-red-800 hover:bg-red-900 text-white font-bold text-[11px] uppercase tracking-wider rounded-sm transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Eliminar</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-[#EFE9E2] hover:bg-[#2D2926]/10 text-[#2D2926] font-bold text-[11px] uppercase tracking-wider rounded-sm transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold text-[11px] uppercase tracking-wider rounded-sm transition shadow"
              >
                {productToEdit ? 'Guardar Cambios' : 'Dar de Alta'}
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
