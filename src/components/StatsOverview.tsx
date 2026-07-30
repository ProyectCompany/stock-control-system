import React from 'react';
import { Package, AlertTriangle, Clock, TrendingUp, Building2 } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';

interface StatsOverviewProps {
  onOpenAlerts: () => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ onOpenAlerts }) => {
  const { products, alerts } = useInventory();
  const { user } = useAuth();

  const totalProducts = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + p.quantity, 0);
  const totalCostValuation = products.reduce((acc, p) => acc + p.costPrice * p.quantity, 0);
  const totalRetailValuation = products.reduce((acc, p) => acc + p.sellingPrice * p.quantity, 0);
  const estimatedProfit = totalRetailValuation - totalCostValuation;

  const lowStockCount = alerts.filter(a => a.type === 'LOW_STOCK' || a.type === 'OUT_OF_STOCK').length;
  const expiringCount = alerts.filter(a => a.type === 'EXPIRING_SOON' || a.type === 'EXPIRED').length;

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Top Welcome Bar */}
      <div className="p-3 sm:p-6 bg-[#EFE9E2] border border-[#2D2926]/10 rounded-sm flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-sm bg-[#2D2926] text-amber-400 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-serif font-bold text-[#2D2926] flex items-center gap-2">
              <span>{user.businessName}</span>
              <span className="text-[9px] sm:text-[10px] uppercase font-sans font-bold tracking-widest bg-[#2D2926] text-white px-1.5 py-0.5 rounded-sm">
                Panel Principal
              </span>
            </h2>
            <p className="text-[10px] sm:text-xs text-[#2D2926]/60 font-sans mt-0.5 hidden xs:block">
              Control de inventario profesional con alertas en tiempo real y código de barras
            </p>
          </div>
        </div>

        {/* Action Button for Alerts */}
        <button
          onClick={onOpenAlerts}
          className={`px-3 py-2 sm:px-5 sm:py-3 border text-[10px] sm:text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 rounded-sm shadow-sm ${
            alerts.length > 0
              ? 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700'
              : 'bg-[#2D2926] text-white hover:bg-[#403C39] border-[#2D2926]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
          <span>Alertas: <strong className="font-mono text-xs sm:text-sm underline ml-0.5">{alerts.length}</strong></span>
        </button>
      </div>

      {/* KPI Cards Grid with Editorial Left-Border Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
        
        {/* KPI 1: Expiring Items */}
        <div 
          onClick={onOpenAlerts}
          className="bg-[#EFE9E2] border-l-4 border-red-500 border-t border-r border-b border-[#2D2926]/10 p-3 sm:p-6 hover:bg-[#E7E0D7] cursor-pointer transition flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-[#2D2926]/60 mb-1 sm:mb-2">
              <span className="font-sans text-[9px] sm:text-[11px] uppercase font-bold tracking-widest truncate">Por Vencer</span>
              <Clock className="w-3.5 h-3.5 text-red-600 shrink-0" />
            </div>
            <h3 className="text-2xl sm:text-4xl font-serif font-bold text-[#2D2926]">{expiringCount.toString().padStart(2, '0')}</h3>
          </div>
          <p className="text-[10px] sm:text-xs italic text-[#2D2926]/70 mt-1 sm:mt-3 font-serif truncate">
            {expiringCount > 0 ? 'Revisar perecederos' : 'Lotes en regla'}
          </p>
        </div>

        {/* KPI 2: Critical Stock */}
        <div 
          onClick={onOpenAlerts}
          className="bg-[#EFE9E2] border-l-4 border-amber-500 border-t border-r border-b border-[#2D2926]/10 p-3 sm:p-6 hover:bg-[#E7E0D7] cursor-pointer transition flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-[#2D2926]/60 mb-1 sm:mb-2">
              <span className="font-sans text-[9px] sm:text-[11px] uppercase font-bold tracking-widest truncate">Stock Crítico</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            </div>
            <h3 className="text-2xl sm:text-4xl font-serif font-bold text-[#2D2926]">{lowStockCount.toString().padStart(2, '0')}</h3>
          </div>
          <p className="text-[10px] sm:text-xs italic text-[#2D2926]/70 mt-1 sm:mt-3 font-serif truncate">
            {lowStockCount > 0 ? 'Reposición requerida' : 'Stock óptimo'}
          </p>
        </div>

        {/* KPI 3: Total Catalog Products */}
        <div className="bg-[#EFE9E2] border-l-4 border-[#2D2926] border-t border-r border-b border-[#2D2926]/10 p-3 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#2D2926]/60 mb-1 sm:mb-2">
              <span className="font-sans text-[9px] sm:text-[11px] uppercase font-bold tracking-widest truncate">Catálogo</span>
              <Package className="w-3.5 h-3.5 text-[#2D2926] shrink-0" />
            </div>
            <h3 className="text-2xl sm:text-4xl font-serif font-bold text-[#2D2926]">{totalProducts.toString().padStart(2, '0')}</h3>
          </div>
          <p className="text-[10px] sm:text-xs font-sans text-[#2D2926]/70 mt-1 sm:mt-3 truncate">
            <strong className="text-[#2D2926] font-bold">{totalStockUnits.toLocaleString('es-AR')}</strong> un.
          </p>
        </div>

        {/* KPI 4: Retail Valuation */}
        <div className="bg-[#EFE9E2] border-l-4 border-emerald-600 border-t border-r border-b border-[#2D2926]/10 p-3 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#2D2926]/60 mb-1 sm:mb-2">
              <span className="font-sans text-[9px] sm:text-[11px] uppercase font-bold tracking-widest truncate">Valuación</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            </div>
            <h3 className="text-lg sm:text-3xl font-serif font-bold text-[#2D2926] font-mono truncate">
              {user.currency} {totalRetailValuation.toLocaleString('es-AR')}
            </h3>
          </div>
          <p className="text-[10px] sm:text-xs font-sans text-[#2D2926]/70 mt-1 sm:mt-3 truncate">
            Ganancia: <strong className="text-emerald-800 font-semibold">{user.currency} {estimatedProfit.toLocaleString('es-AR')}</strong>
          </p>
        </div>

      </div>
    </div>
  );
};
