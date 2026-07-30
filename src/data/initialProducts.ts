import { Product } from '../types';

// Helper to get dates relative to today
const getRelativeDate = (daysFromNow: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    barcode: '7791234567890',
    name: 'Café Molido Premium 500g',
    category: 'Almacén',
    quantity: 3, // Low stock (min is 10)
    minStockThreshold: 10,
    expirationDate: getRelativeDate(120), // OK expiration
    expirationAlertDays: 15,
    costPrice: 4200,
    sellingPrice: 6500,
    unit: 'unidades',
    supplier: 'Cafes del Sur S.A.',
    location: 'Estante A1',
    notes: 'Empaque hermético tostado medio',
    imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-2',
    barcode: '7799876543210',
    name: 'Leche Entera Larga Vida 1L',
    category: 'Lácteos',
    quantity: 24,
    minStockThreshold: 12,
    expirationDate: getRelativeDate(4), // Expiring soon! (4 days remaining)
    expirationAlertDays: 7,
    costPrice: 1100,
    sellingPrice: 1650,
    unit: 'litros',
    supplier: 'Lácteos San Juan',
    location: 'Heladera 2',
    notes: 'Conservar refrigerado después de abrir',
    imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-3',
    barcode: '7790001122334',
    name: 'Yogur Natural Frutilla 200g',
    category: 'Lácteos',
    quantity: 5, // Low stock & expiring soon!
    minStockThreshold: 8,
    expirationDate: getRelativeDate(2), // Expiring in 2 days!
    expirationAlertDays: 5,
    costPrice: 650,
    sellingPrice: 980,
    unit: 'unidades',
    supplier: 'Lácteos San Juan',
    location: 'Heladera 1',
    notes: 'Lote Y2026-B',
    imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-4',
    barcode: '7795554433221',
    name: 'Aceite de Oliva Extra Virgen 500ml',
    category: 'Almacén',
    quantity: 18,
    minStockThreshold: 5,
    expirationDate: getRelativeDate(365),
    expirationAlertDays: 30,
    costPrice: 5800,
    sellingPrice: 8900,
    unit: 'unidades',
    supplier: 'Olivares Cuyanos',
    location: 'Estante B3',
    notes: 'Primera prensada en frío',
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-5',
    barcode: '7793332211009',
    name: 'Jabón Líquido Antibacterial 500ml',
    category: 'Limpieza',
    quantity: 2, // Low stock
    minStockThreshold: 6,
    expirationDate: null, // No expiration
    expirationAlertDays: 0,
    costPrice: 1900,
    sellingPrice: 2950,
    unit: 'unidades',
    supplier: 'Limpieza Total SRL',
    location: 'Depósito 1',
    notes: 'Aroma lavanda silvestre',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-6',
    barcode: '7798887766554',
    name: 'Queso Cremoso 1kg',
    category: 'Fiambres y Quesos',
    quantity: 0, // Out of stock!
    minStockThreshold: 4,
    expirationDate: getRelativeDate(-1), // Expired 1 day ago!
    expirationAlertDays: 7,
    costPrice: 4800,
    sellingPrice: 7200,
    unit: 'kg',
    supplier: 'Quesería Don Pedro',
    location: 'Cámara Fría 3',
    notes: 'Revisar descartes',
    imageUrl: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-7',
    barcode: '7791112223334',
    name: 'Agua Mineral Sin Gas 1.5L',
    category: 'Bebidas',
    quantity: 48,
    minStockThreshold: 15,
    expirationDate: getRelativeDate(200),
    expirationAlertDays: 15,
    costPrice: 700,
    sellingPrice: 1200,
    unit: 'unidades',
    supplier: 'Manantial Puro',
    location: 'Pallet 4',
    notes: 'Pack de 6 botellas',
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
