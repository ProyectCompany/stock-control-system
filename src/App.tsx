import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { StatsOverview } from './components/StatsOverview';
import { InventoryList } from './components/InventoryList';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { ProductFormModal } from './components/ProductFormModal';
import { AlertsDrawer } from './components/AlertsDrawer';
import { ProfileModal } from './components/ProfileModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import Antigravity from './components/Antigravity';
import { Product } from './types';

const MainAppContent: React.FC = () => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [scannedInitialBarcode, setScannedInitialBarcode] = useState<string>('');

  const handleOpenNewProduct = (initialBarcode?: string) => {
    setProductToEdit(null);
    setScannedInitialBarcode(initialBarcode || '');
    setIsProductFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    setScannedInitialBarcode('');
    setIsProductFormOpen(true);
  };

  const handleSelectNewCodeFromScanner = (barcode: string) => {
    handleOpenNewProduct(barcode);
  };

  return (
    <div className="relative min-h-screen bg-[#F7F3EF] text-[#2D2926] flex flex-col font-sans selection:bg-[#2D2926] selection:text-white">
      {/* Full-screen Antigravity 3D Particle Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-80">
        <Antigravity
          count={300}
          magnetRadius={6}
          ringRadius={7}
          waveSpeed={0.4}
          waveAmplitude={1}
          particleSize={1.5}
          lerpSpeed={0.05}
          color="#2D2926"
          autoAnimate={true}
          particleVariance={1}
        />
      </div>

      {/* Main Content Layer */}
      <div className="relative z-10 flex flex-col min-h-screen flex-1">
        {/* Top Fixed Header */}
        <Header
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenAlerts={() => setIsAlertsOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenWhatsAppModal={() => setIsWhatsAppOpen(true)}
        />

        {/* Main Dashboard Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-4 py-3 sm:py-6 space-y-3 sm:space-y-6">
          
          {/* KPI Statistics & Totem Banner */}
          <StatsOverview
            onOpenAlerts={() => setIsAlertsOpen(true)}
          />

          {/* Main Inventory Search & Table / Grid View */}
          <InventoryList
            onOpenNewProduct={() => handleOpenNewProduct()}
            onEditProduct={handleEditProduct}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenWhatsAppModal={() => setIsWhatsAppOpen(true)}
          />

        </main>

        {/* Footer with Mandatory Credits "dev ezequiel luis lucca" */}
        <Footer />
      </div>

      {/* Modals & Drawers */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSelectNewCode={handleSelectNewCodeFromScanner}
      />

      <ProductFormModal
        isOpen={isProductFormOpen}
        onClose={() => setIsProductFormOpen(false)}
        productToEdit={productToEdit}
        initialBarcode={scannedInitialBarcode}
        onOpenScanner={() => {
          setIsProductFormOpen(false);
          setIsScannerOpen(true);
        }}
      />

      <AlertsDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        onEditProduct={handleEditProduct}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <WhatsAppModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
      />

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <InventoryProvider>
        <MainAppContent />
      </InventoryProvider>
    </AuthProvider>
  );
}
