import React, { useState } from 'react';
import { X, AlertTriangle, Calendar, Plus, Clock, CheckCircle2, ShieldAlert, ArrowRight, Trash2 } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { ConfirmModal } from './ConfirmModal';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onEditProduct: (product: any) => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  onEditProduct
}) => {
  const { alerts, adjustQuantity, updateProduct, deleteProduct, deleteExpiredProducts, deleteOutOfStockProducts } = useInventory();
  const [filterType, setFilterType] = useState<'ALL' | 'LOW_STOCK' | 'EXPIRING'>('ALL');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const lowStockAlerts = alerts.filter(a => a.type === 'LOW_STOCK' || a.type === 'OUT_OF_STOCK');
  const expirationAlerts = alerts.filter(a => a.type === 'EXPIRING_SOON' || a.type === 'EXPIRED');

  const showInfo = (msg: string) => {
    setInfoMessage(msg);
    setTimeout(() => setInfoMessage(null), 4000);
  };

  const handleDeleteItem = (product: any) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Producto',
      message: `¿Deseas eliminar "${product.name}" del inventario?`,
      onConfirm: () => {
        deleteProduct(product.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteAllExpired = () => {
    const expiredCount = alerts.filter(a => a.type === 'EXPIRED').length;
    if (expiredCount === 0) {
      showInfo('No hay productos vencidos en el inventario.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Borrar Todos los Vencidos',
      message: `¿Estás seguro de dar de baja los ${expiredCount} producto(s) cuya fecha ya venció?`,
      onConfirm: () => {
        deleteExpiredProducts();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        showInfo(`${expiredCount} producto(s) vencido(s) eliminado(s) del stock.`);
      }
    });
  };

  const handleDeleteAllOutOfStock = () => {
    const outCount = alerts.filter(a => a.type === 'OUT_OF_STOCK').length;
    if (outCount === 0) {
      showInfo('No hay productos agotados (0 stock) para eliminar.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Borrar Productos Sin Stock',
      message: `¿Estás seguro de eliminar los ${outCount} producto(s) con 0 unidades de stock?`,
      onConfirm: () => {
        deleteOutOfStockProducts();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        showInfo(`${outCount} producto(s) sin stock eliminado(s) del inventario.`);
      }
    });
  };

  const filteredAlerts = alerts.filter(a => {
    if (filterType === 'LOW_STOCK') return a.type === 'LOW_STOCK' || a.type === 'OUT_OF_STOCK';
    if (filterType === 'EXPIRING') return a.type === 'EXPIRING_SOON' || a.type === 'EXPIRED';
    return true;
  });

  const handleQuickRestock = (product: any, qty: number) => {
    adjustQuantity(product.id, qty, `Reposición rápida desde Centro de Alertas (+${qty})`);
  };

  const handleExtendExpiry = (product: any) => {
    const today = new Date();
    today.setDate(today.getDate() + 30);
    const newDate = today.toISOString().split('T')[0];
    updateProduct(product.id, { expirationDate: newDate });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#2D2926]/70 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-md bg-[#F7F3EF] border-l border-[#2D2926]/20 h-full flex flex-col text-[#2D2926] shadow-2xl">
        
        {/* Header */}
        <div className="p-6 bg-[#EFE9E2] border-b border-[#2D2926]/15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#2D2926] text-white rounded-sm">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#2D2926] text-xl">Alertas de Stock</h3>
              <p className="text-xs text-[#2D2926]/60">
                {alerts.length === 0 ? 'Sin avisos pendientes' : `${alerts.length} notificación(es) que requieren atención`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#2D2926]/60 hover:text-[#2D2926] hover:bg-[#F7F3EF] rounded-sm transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast / Notification Banner */}
        {infoMessage && (
          <div className="mx-6 mt-3 p-3 bg-emerald-800 text-white rounded-sm text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>{infoMessage}</span>
            <button onClick={() => setInfoMessage(null)} className="p-1 hover:bg-white/10 rounded-sm">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter Pills & Batch Delete Bar */}
        <div className="px-6 py-3 bg-[#EFE9E2]/50 border-b border-[#2D2926]/10 space-y-2">
          <div className="flex gap-2 overflow-x-auto text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-sm font-bold uppercase tracking-wider text-[11px] transition ${
                filterType === 'ALL'
                  ? 'bg-[#2D2926] text-white'
                  : 'bg-[#F7F3EF] text-[#2D2926] hover:bg-[#EFE9E2] border border-[#2D2926]/20'
              }`}
            >
              Todas ({alerts.length})
            </button>

            <button
              onClick={() => setFilterType('LOW_STOCK')}
              className={`px-3 py-1.5 rounded-sm font-bold uppercase tracking-wider text-[11px] transition flex items-center gap-1 ${
                filterType === 'LOW_STOCK'
                  ? 'bg-amber-800 text-white'
                  : 'bg-[#F7F3EF] text-amber-900 hover:bg-[#EFE9E2] border border-amber-600/30'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Stock Bajo ({lowStockAlerts.length})</span>
            </button>

            <button
              onClick={() => setFilterType('EXPIRING')}
              className={`px-3 py-1.5 rounded-sm font-bold uppercase tracking-wider text-[11px] transition flex items-center gap-1 ${
                filterType === 'EXPIRING'
                  ? 'bg-red-800 text-white'
                  : 'bg-[#F7F3EF] text-red-900 hover:bg-[#EFE9E2] border border-red-600/30'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Vencimientos ({expirationAlerts.length})</span>
            </button>
          </div>

          {/* Batch Quick Actions */}
          <div className="pt-2 border-t border-[#2D2926]/10 flex items-center gap-2 text-[10px]">
            <button
              onClick={handleDeleteAllExpired}
              className="px-2.5 py-1 bg-red-800 hover:bg-red-900 text-white font-bold uppercase tracking-wider rounded-sm transition flex items-center gap-1"
              title="Borrar del stock todos los productos cuya fecha expiró"
            >
              <Trash2 className="w-3 h-3" />
              <span>Borrar Vencidos</span>
            </button>

            <button
              onClick={handleDeleteAllOutOfStock}
              className="px-2.5 py-1 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold uppercase tracking-wider rounded-sm transition flex items-center gap-1"
              title="Borrar del stock todos los productos con 0 unidades"
            >
              <Trash2 className="w-3 h-3 text-amber-400" />
              <span>Borrar Sin Stock</span>
            </button>
          </div>
        </div>

        {/* Alert Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {filteredAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="p-4 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="font-serif font-bold text-[#2D2926] text-lg">Inventario al Día</h4>
              <p className="text-xs text-[#2D2926]/70 max-w-xs">
                No hay alertas activas de stock bajo ni vencimientos próximos en esta categoría.
              </p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const isLowStock = alert.type === 'LOW_STOCK' || alert.type === 'OUT_OF_STOCK';
              const isExpired = alert.type === 'EXPIRED';

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-sm border transition shadow-sm ${
                    isExpired
                      ? 'bg-red-500/10 border-red-600/30 text-red-950 border-l-4 border-l-red-600'
                      : isLowStock
                      ? 'bg-amber-500/10 border-amber-600/30 text-amber-950 border-l-4 border-l-amber-600'
                      : 'bg-[#EFE9E2] border-red-600/30 text-[#2D2926] border-l-4 border-l-red-500'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      {isLowStock ? (
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-red-700 shrink-0" />
                      )}
                      <span className="font-mono text-[10px] uppercase tracking-widest font-bold opacity-80">
                        {alert.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onEditProduct(alert.product);
                          onClose();
                        }}
                        className="text-xs text-[#2D2926] hover:underline flex items-center gap-1 font-bold uppercase tracking-wider text-[10px]"
                      >
                        <span>Editar</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => handleDeleteItem(alert.product)}
                        className="p-1 text-red-800 hover:text-red-950 hover:bg-red-200/50 rounded-sm transition"
                        title="Borrar producto del inventario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-[#2D2926] text-base">{alert.product.name}</h4>
                  <p className="text-xs text-[#2D2926]/80 my-1">{alert.message}</p>

                  <div className="mt-3 pt-3 border-t border-[#2D2926]/10 flex items-center justify-between text-xs">
                    <div className="font-mono text-[#2D2926]/70 text-[11px]">
                      Cód: <strong className="text-[#2D2926] font-bold">{alert.product.barcode}</strong>
                    </div>

                    {/* Quick Resolve Buttons */}
                    <div className="flex items-center gap-2">
                      {isLowStock ? (
                        <button
                          onClick={() => handleQuickRestock(alert.product, 10)}
                          className="px-3 py-1 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold text-xs uppercase tracking-wider rounded-sm transition flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+10 Reponer</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleExtendExpiry(alert.product)}
                          className="px-3 py-1 bg-red-800 hover:bg-red-900 text-white font-bold text-xs uppercase tracking-wider rounded-sm transition"
                          title="Actualizar fecha a 30 días"
                        >
                          Renovar (+30d)
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#EFE9E2] border-t border-[#2D2926]/15 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold text-xs uppercase tracking-wider rounded-sm transition"
          >
            Cerrar Alertas
          </button>
        </div>

      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Sí, Confirmar"
        cancelText="Cancelar"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        danger
      />
    </div>
  );
};
