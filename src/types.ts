export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  quantity: number;
  minStockThreshold: number; // Low stock alert threshold
  expirationDate: string | null; // ISO YYYY-MM-DD
  expirationAlertDays: number; // Days prior to expiry to trigger alert
  costPrice: number;
  sellingPrice: number;
  unit: string; // 'unidades', 'kg', 'cajas', 'litros', 'packs'
  supplier: string;
  location: string;
  notes: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  businessName: string;
  whatsappNumber: string;
  defaultMinStock: number;
  defaultExpirationAlertDays: number;
  currency: string;
  totemAnimal: 'Jaguar' | 'Lobo' | 'Águila' | 'Pantera' | 'León' | 'Puma';
  isLoggedIn: boolean;
}

export type AlertType = 'LOW_STOCK' | 'EXPIRING_SOON' | 'EXPIRED' | 'OUT_OF_STOCK';

export interface AlertItem {
  id: string;
  type: AlertType;
  product: Product;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  daysToExpiration?: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'IN' | 'OUT' | 'SET';
  previousQuantity: number;
  newQuantity: number;
  changeAmount: number;
  timestamp: string;
  notes?: string;
}
