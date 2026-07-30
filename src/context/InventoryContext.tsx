import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Product, AlertItem, StockMovement } from '../types';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { useAuth } from './AuthContext';

interface InventoryContextType {
  products: Product[];
  alerts: AlertItem[];
  movements: StockMovement[];
  categories: string[];
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (id: string, productData: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  deleteProductsByIds: (ids: string[]) => void;
  deleteExpiredProducts: () => void;
  deleteOutOfStockProducts: () => void;
  adjustQuantity: (id: string, delta: number, notes?: string) => void;
  setQuantity: (id: string, newQty: number, notes?: string) => void;
  getProductByBarcode: (barcode: string) => Product | undefined;
  resetToSampleData: () => void;
}

const PRODUCTS_STORAGE_KEY = 'stock_animalista_products';
const MOVEMENTS_STORAGE_KEY = 'stock_animalista_movements';

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load products from storage', e);
    }
    return INITIAL_PRODUCTS;
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    try {
      const saved = localStorage.getItem(MOVEMENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load movements from storage', e);
    }
    return [];
  });

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
    } catch (e) {
      console.error('Failed to save products', e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(movements));
    } catch (e) {
      console.error('Failed to save movements', e);
    }
  }, [movements]);

  // Compute Categories dynamically
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Calculate ALERTS dynamically based on product settings and user defaults
  const alerts = useMemo(() => {
    const list: AlertItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    products.forEach(p => {
      // 1. Check LOW STOCK Alert
      const minThreshold = p.minStockThreshold !== undefined && p.minStockThreshold !== null 
        ? p.minStockThreshold 
        : user.defaultMinStock;

      if (p.quantity === 0) {
        list.push({
          id: `alert-out-${p.id}`,
          type: 'OUT_OF_STOCK',
          product: p,
          message: `Producto agotado: 0 unidades disponibles (Mínimo: ${minThreshold})`,
          severity: 'critical'
        });
      } else if (p.quantity <= minThreshold) {
        list.push({
          id: `alert-low-${p.id}`,
          type: 'LOW_STOCK',
          product: p,
          message: `Stock bajo: Quedan sólo ${p.quantity} ${p.unit} (Mínimo configurado: ${minThreshold})`,
          severity: 'warning'
        });
      }

      // 2. Check EXPIRATION Alert
      if (p.expirationDate) {
        const expDate = new Date(p.expirationDate);
        expDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

        const alertWindow = p.expirationAlertDays ?? user.defaultExpirationAlertDays;

        if (diffDays < 0) {
          list.push({
            id: `alert-expired-${p.id}`,
            type: 'EXPIRED',
            product: p,
            message: `¡PRODUCTO VENCIDO! Venció hace ${Math.abs(diffDays)} día(s) (${p.expirationDate})`,
            severity: 'critical',
            daysToExpiration: diffDays
          });
        } else if (diffDays <= alertWindow) {
          list.push({
            id: `alert-expiring-${p.id}`,
            type: 'EXPIRING_SOON',
            product: p,
            message: `Próximo a vencer en ${diffDays} día(s) (Vence: ${p.expirationDate})`,
            severity: diffDays <= 2 ? 'critical' : 'warning',
            daysToExpiration: diffDays
          });
        }
      }
    });

    return list;
  }, [products, user.defaultMinStock, user.defaultExpirationAlertDays]);

  // Helper function to log stock movement
  const recordMovement = (
    productId: string, 
    productName: string, 
    type: 'IN' | 'OUT' | 'SET', 
    prevQty: number, 
    newQty: number, 
    notes?: string
  ) => {
    const movement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId,
      productName,
      type,
      previousQuantity: prevQty,
      newQuantity: newQty,
      changeAmount: newQty - prevQty,
      timestamp: new Date().toISOString(),
      notes
    };

    setMovements(prev => [movement, ...prev.slice(0, 99)]); // Keep last 100
  };

  const addProduct = (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product => {
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...data,
      id: `prod-${Date.now()}`,
      createdAt: now,
      updatedAt: now
    };

    setProducts(prev => [newProduct, ...prev]);
    recordMovement(newProduct.id, newProduct.name, 'IN', 0, newProduct.quantity, 'Alta de producto inicial');
    return newProduct;
  };

  const updateProduct = (id: string, data: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id === id) {
          const updated = { ...p, ...data, updatedAt: new Date().toISOString() };
          if (data.quantity !== undefined && data.quantity !== p.quantity) {
            recordMovement(
              id, 
              p.name, 
              data.quantity > p.quantity ? 'IN' : 'OUT', 
              p.quantity, 
              data.quantity, 
              'Edición manual de datos'
            );
          }
          return updated;
        }
        return p;
      })
    );
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const deleteProductsByIds = (ids: string[]) => {
    const idSet = new Set(ids);
    setProducts(prev => prev.filter(p => !idSet.has(p.id)));
  };

  const deleteExpiredProducts = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setProducts(prev => prev.filter(p => {
      if (!p.expirationDate) return true;
      const [year, month, day] = p.expirationDate.split('-').map(Number);
      if (!year || !month || !day) return true;
      const expDate = new Date(year, month - 1, day);
      expDate.setHours(0, 0, 0, 0);
      return expDate.getTime() >= today.getTime();
    }));
  };

  const deleteOutOfStockProducts = () => {
    setProducts(prev => prev.filter(p => p.quantity > 0));
  };

  const adjustQuantity = (id: string, delta: number, notes?: string) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id === id) {
          const newQty = Math.max(0, p.quantity + delta);
          recordMovement(
            id,
            p.name,
            delta >= 0 ? 'IN' : 'OUT',
            p.quantity,
            newQty,
            notes || (delta >= 0 ? `Entrada +${delta}` : `Salida ${delta}`)
          );
          return { ...p, quantity: newQty, updatedAt: new Date().toISOString() };
        }
        return p;
      })
    );
  };

  const setQuantity = (id: string, newQty: number, notes?: string) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id === id) {
          const sanitizedQty = Math.max(0, newQty);
          recordMovement(
            id,
            p.name,
            'SET',
            p.quantity,
            sanitizedQty,
            notes || `Ajuste de stock a ${sanitizedQty}`
          );
          return { ...p, quantity: sanitizedQty, updatedAt: new Date().toISOString() };
        }
        return p;
      })
    );
  };

  const getProductByBarcode = (barcode: string): Product | undefined => {
    const clean = barcode.trim();
    if (!clean) return undefined;
    return products.find(p => p.barcode.trim() === clean);
  };

  const resetToSampleData = () => {
    setProducts(INITIAL_PRODUCTS);
    setMovements([]);
    localStorage.removeItem(PRODUCTS_STORAGE_KEY);
    localStorage.removeItem(MOVEMENTS_STORAGE_KEY);
  };

  return (
    <InventoryContext.Provider
      value={{
        products,
        alerts,
        movements,
        categories,
        addProduct,
        updateProduct,
        deleteProduct,
        deleteProductsByIds,
        deleteExpiredProducts,
        deleteOutOfStockProducts,
        adjustQuantity,
        setQuantity,
        getProductByBarcode,
        resetToSampleData
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within InventoryProvider');
  return context;
};
