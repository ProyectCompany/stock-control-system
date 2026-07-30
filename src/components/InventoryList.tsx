import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, Camera, FileText, MessageSquare, 
  Grid, List as ListIcon, AlertTriangle, Clock, RefreshCw, Trash2
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { ProductCard } from './ProductCard';
import { Product } from '../types';
import { generateStockPDF } from '../utils/pdfGenerator';
import { ConfirmModal } from './ConfirmModal';

interface InventoryListProps {
  onOpenNewProduct: () => void;
  onEditProduct: (product: Product) => void;
  onOpenScanner: () => void;
  onOpenWhatsAppModal: () => void;
}

export const InventoryList: React.FC<InventoryListProps> = ({
  onOpenNewProduct,
  onEditProduct,
  onOpenScanner,
  onOpenWhatsAppModal
}) => {
  const { products, categories, adjustQuantity, deleteProduct, deleteExpiredProducts, deleteOutOfStockProducts, resetToSampleData } = useInventory();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [alertFilter, setAlertFilter] = useState<'ALL' | 'LOW_STOCK' | 'EXPIRING' | 'EXPIRED' | 'OK'>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('TABLE');
  const [sortBy, setSortBy] = useState<'NAME' | 'QUANTITY' | 'EXPIRATION' | 'PRICE'>('NAME');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Search Query
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
        p.name.toLowerCase().includes(query) ||
        p.barcode.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.supplier.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // 2. Category Filter
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }

      // 3. Alert Status Filter
      const isLowStock = p.quantity <= p.minStockThreshold;
      let isExpired = false;
      let isExpiringSoon = false;

      if (p.expirationDate) {
        const exp = new Date(p.expirationDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (diffDays < 0) isExpired = true;
        else if (diffDays <= p.expirationAlertDays) isExpiringSoon = true;
      }

      if (alertFilter === 'LOW_STOCK') return isLowStock;
      if (alertFilter === 'EXPIRING') return isExpiringSoon;
      if (alertFilter === 'EXPIRED') return isExpired;
      if (alertFilter === 'OK') return !isLowStock && !isExpiringSoon && !isExpired;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'NAME') return a.name.localeCompare(b.name);
      if (sortBy === 'QUANTITY') return a.quantity - b.quantity;
      if (sortBy === 'PRICE') return b.sellingPrice - a.sellingPrice;
      if (sortBy === 'EXPIRATION') {
        if (!a.expirationDate) return 1;
        if (!b.expirationDate) return -1;
        return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      }
      return 0;
    });
  }, [products, searchTerm, selectedCategory, alertFilter, sortBy]);

  const handleDownloadPDF = () => {
    generateStockPDF(filteredProducts, user);
  };

  return (
    <div className="space-y-6">
      
      {/* Search & Main Actions Toolbar */}
      <div className="p-3 sm:p-6 bg-[#EFE9E2] border border-[#2D2926]/10 rounded-sm space-y-3 sm:space-y-4">
        
        <div className="flex flex-col md:flex-row gap-2.5 sm:gap-4 items-stretch md:items-center justify-between">
          
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2D2926]/50" />
            <input
              type="text"
              placeholder="Buscar por referencia, producto o proveedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 sm:py-3 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-xs sm:text-sm text-[#2D2926] placeholder-[#2D2926]/40 focus:outline-none focus:border-[#2D2926] font-sans"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
            
            {/* Camera Scanner Button */}
            <button
              onClick={onOpenScanner}
              className="px-2.5 py-2 sm:px-4 sm:py-3 bg-[#2D2926] text-white hover:bg-[#403C39] border border-[#2D2926] rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5"
              title="Abrir lector de código de barras con la cámara"
            >
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              <span>Escanear</span>
            </button>

            {/* Add New Product */}
            <button
              onClick={onOpenNewProduct}
              className="px-3 py-2 sm:px-4 sm:py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[10px] sm:text-xs uppercase tracking-wider rounded-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Nuevo Producto</span>
            </button>

            {/* Export PDF */}
            <button
              onClick={handleDownloadPDF}
              className="px-2.5 py-2 sm:px-3.5 sm:py-3 bg-[#F7F3EF] hover:bg-[#EFE9E2] text-[#2D2926] border border-[#2D2926]/20 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5"
              title="Descargar reporte en PDF"
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* WhatsApp Share */}
            <button
              onClick={onOpenWhatsAppModal}
              className="px-2.5 py-2 sm:px-3.5 sm:py-3 bg-[#F7F3EF] hover:bg-[#EFE9E2] text-[#2D2926] border border-[#2D2926]/20 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5"
              title="Enviar stock por WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

          </div>

        </div>

        {/* Filter Pills & View Toggles */}
        <div className="pt-2 sm:pt-3 border-t border-[#2D2926]/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setAlertFilter('ALL')}
              className={`px-2.5 py-1 rounded-sm transition font-sans text-[10px] sm:text-[11px] uppercase tracking-wider font-bold ${
                alertFilter === 'ALL'
                  ? 'bg-[#2D2926] text-white'
                  : 'bg-[#F7F3EF] text-[#2D2926]/70 hover:text-[#2D2926]'
              }`}
            >
              Todos ({products.length})
            </button>

            <button
              onClick={() => setAlertFilter('LOW_STOCK')}
              className={`px-2.5 py-1 rounded-sm transition font-sans text-[10px] sm:text-[11px] uppercase tracking-wider font-bold flex items-center gap-1 ${
                alertFilter === 'LOW_STOCK'
                  ? 'bg-amber-600 text-white'
                  : 'bg-[#F7F3EF] text-amber-800 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Stock Crítico</span>
            </button>

            <button
              onClick={() => setAlertFilter('EXPIRING')}
              className={`px-2.5 py-1 rounded-sm transition font-sans text-[10px] sm:text-[11px] uppercase tracking-wider font-bold flex items-center gap-1 ${
                alertFilter === 'EXPIRING'
                  ? 'bg-red-600 text-white'
                  : 'bg-[#F7F3EF] text-red-800 hover:bg-red-100'
              }`}
            >
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Por Vencer</span>
            </button>

            <button
              onClick={() => setAlertFilter('EXPIRED')}
              className={`px-2.5 py-1 rounded-sm transition font-sans text-[10px] sm:text-[11px] uppercase tracking-wider font-bold ${
                alertFilter === 'EXPIRED'
                  ? 'bg-red-700 text-white'
                  : 'bg-[#F7F3EF] text-red-900 hover:bg-red-100'
              }`}
            >
              Vencidos
            </button>
          </div>

          {/* Category Dropdown & View Switches */}
          <div className="flex items-center gap-1.5 flex-wrap">
            
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2 py-1 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-[#2D2926] font-sans text-[10px] sm:text-xs uppercase font-bold tracking-wider focus:outline-none"
            >
              <option value="ALL">Todas las Categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-1 bg-[#F7F3EF] border border-[#2D2926]/20 rounded-sm text-[#2D2926] font-sans text-[10px] sm:text-xs uppercase font-bold tracking-wider focus:outline-none"
            >
              <option value="NAME">Por Nombre</option>
              <option value="QUANTITY">Por Cantidad</option>
              <option value="EXPIRATION">Por Vencimiento</option>
              <option value="PRICE">Por Precio</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#F7F3EF] p-0.5 rounded-sm border border-[#2D2926]/20">
              <button
                onClick={() => setViewMode('TABLE')}
                className={`p-1 rounded-sm transition ${
                  viewMode === 'TABLE' ? 'bg-[#2D2926] text-white' : 'text-[#2D2926]/60 hover:text-[#2D2926]'
                }`}
                title="Vista en Tabla Editorial"
              >
                <ListIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('GRID')}
                className={`p-1 rounded-sm transition ${
                  viewMode === 'GRID' ? 'bg-[#2D2926] text-white' : 'text-[#2D2926]/60 hover:text-[#2D2926]'
                }`}
                title="Vista en Tarjetas"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Main Inventory Display */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-[#EFE9E2] border border-[#2D2926]/10 rounded-sm space-y-4">
          <div className="p-4 bg-[#F7F3EF] text-[#2D2926]/40 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="font-serif font-bold text-[#2D2926] text-xl">Sin resultados</h3>
          <p className="text-xs text-[#2D2926]/60 max-w-sm mx-auto font-sans">
            No se encontraron productos coincidentes. Intenta ajustar los filtros o el texto de búsqueda.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={onOpenNewProduct}
              className="px-5 py-2.5 bg-[#2D2926] text-white font-bold text-xs uppercase tracking-wider rounded-sm transition"
            >
              + Nuevo Producto
            </button>
            <button
              onClick={resetToSampleData}
              className="px-5 py-2.5 bg-[#F7F3EF] border border-[#2D2926]/20 text-[#2D2926] font-bold text-xs uppercase tracking-wider rounded-sm transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restaurar Ejemplo</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={onEditProduct}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto bg-[#F7F3EF] border border-[#2D2926]/15 rounded-sm">
          <table className="w-full text-left border-collapse">
            <thead className="border-b-2 border-[#2D2926] bg-[#EFE9E2]">
              <tr className="font-sans text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-[#2D2926]">
                <th className="py-2.5 px-3">Referencia</th>
                <th className="py-2.5 px-3">Producto</th>
                <th className="py-2.5 px-3">Categoría</th>
                <th className="py-2.5 px-3 text-center">Stock</th>
                <th className="py-2.5 px-3 text-right">Precio Venta</th>
                <th className="py-2.5 px-3 text-center">Vencimiento</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
                <th className="py-2.5 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D2926]/10 font-sans text-xs sm:text-sm">
              {filteredProducts.map(product => {
                const isLow = product.quantity <= product.minStockThreshold;
                const isOut = product.quantity === 0;

                let isExpired = false;
                let isExpiringSoon = false;
                let daysToExp = 999;

                if (product.expirationDate) {
                  const exp = new Date(product.expirationDate);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  daysToExp = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
                  if (daysToExp < 0) isExpired = true;
                  else if (daysToExp <= product.expirationAlertDays) isExpiringSoon = true;
                }

                const handleDeleteSingle = () => {
                  setProductToDelete(product);
                };

                return (
                  <tr key={product.id} className="hover:bg-[#EFE9E2]/80 transition">
                    <td className="py-2.5 px-3 text-[11px] sm:text-xs font-mono text-[#2D2926]/60 font-medium whitespace-nowrap">
                      #{product.barcode}
                    </td>

                    <td className="py-2.5 px-3 font-bold text-[#2D2926]">
                      <span className="block text-xs sm:text-sm leading-tight font-sans">{product.name}</span>
                      {product.supplier && (
                        <span className="block text-[10px] text-[#2D2926]/50 font-normal">Prov: {product.supplier}</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 bg-[#EFE9E2] text-[#2D2926] text-[9px] sm:text-[10px] uppercase font-bold tracking-wider rounded-sm border border-[#2D2926]/10">
                        {product.category}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-[#EFE9E2] px-1.5 py-0.5 rounded-sm border border-[#2D2926]/10">
                        <button
                          onClick={() => adjustQuantity(product.id, -1, 'Ajuste rápido tabla')}
                          className="w-4 h-4 sm:w-5 sm:h-5 bg-[#2D2926] hover:bg-[#403C39] text-white rounded-sm text-[10px] sm:text-xs font-bold flex items-center justify-center transition"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-xs sm:text-sm min-w-[28px] text-center text-[#2D2926]">
                          {product.quantity.toString().padStart(2, '0')}
                        </span>
                        <button
                          onClick={() => adjustQuantity(product.id, 1, 'Ajuste rápido tabla')}
                          className="w-4 h-4 sm:w-5 sm:h-5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-sm text-[10px] sm:text-xs font-bold flex items-center justify-center transition"
                        >
                          +
                        </button>
                        <span className="text-[9px] sm:text-[10px] text-[#2D2926]/60 font-medium">{product.unit.substring(0, 3)}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#2D2926] text-xs sm:text-sm whitespace-nowrap">
                      {user.currency} {product.sellingPrice.toLocaleString('es-AR')}
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-[11px] sm:text-xs">
                      {product.expirationDate ? (
                        <span className={isExpired ? 'text-red-700 font-bold' : isExpiringSoon ? 'text-amber-800 font-semibold' : 'text-[#2D2926]/70'}>
                          {new Date(product.expirationDate).toLocaleDateString('es-AR')}
                        </span>
                      ) : (
                        <span className="text-[#2D2926]/40">-</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {isExpired ? (
                        <span className="bg-red-100 text-red-800 px-2 py-0.5 text-[8px] sm:text-[9px] rounded-full uppercase font-bold tracking-wider">
                          Vencido
                        </span>
                      ) : isExpiringSoon ? (
                        <span className="bg-red-100 text-red-800 px-2 py-0.5 text-[8px] sm:text-[9px] rounded-full uppercase font-bold tracking-wider">
                          Vence en {daysToExp}d
                        </span>
                      ) : isOut ? (
                        <span className="bg-red-100 text-red-800 px-2 py-0.5 text-[8px] sm:text-[9px] rounded-full uppercase font-bold tracking-wider">
                          Sin Stock
                        </span>
                      ) : isLow ? (
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 text-[8px] sm:text-[9px] rounded-full uppercase font-bold tracking-wider">
                          Stock Bajo
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 text-[8px] sm:text-[9px] rounded-full uppercase font-bold tracking-wider">
                          Óptimo
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <button
                          onClick={() => onEditProduct(product)}
                          className="px-2.5 py-1 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-wider rounded-sm transition"
                          title="Editar producto"
                        >
                          Editar
                        </button>
                        <button
                          onClick={handleDeleteSingle}
                          className="p-1 text-red-700 hover:text-red-950 hover:bg-red-100 rounded-sm transition"
                          title="Eliminar producto del stock"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={!!productToDelete}
        title="Eliminar Producto"
        message={`¿Estás seguro de eliminar "${productToDelete?.name}" del inventario?`}
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        onConfirm={() => {
          if (productToDelete) {
            deleteProduct(productToDelete.id);
            setProductToDelete(null);
          }
        }}
        onCancel={() => setProductToDelete(null)}
        danger
      />

    </div>
  );
};
