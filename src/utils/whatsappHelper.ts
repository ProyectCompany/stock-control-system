import { Product, UserProfile } from '../types';

export const formatWhatsAppStockMessage = (products: Product[], user: UserProfile): string => {
  const dateStr = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const currencySymbol = user.currency || '$';

  const totalProducts = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + p.quantity, 0);
  const totalCostValuation = products.reduce((acc, p) => acc + p.costPrice * p.quantity, 0);
  const totalRetailValuation = products.reduce((acc, p) => acc + p.sellingPrice * p.quantity, 0);

  // Identify low stock and expiring products
  const lowStockProducts = products.filter(p => p.quantity <= p.minStockThreshold);
  const expiringProducts = products.filter(p => {
    if (!p.expirationDate) return false;
    const exp = new Date(p.expirationDate);
    const today = new Date();
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diffDays >= 0 && diffDays <= p.expirationAlertDays;
  });

  let msg = `📦 *REPORTE DE INVENTARIO Y STOCK*\n`;
  msg += `🏢 *${user.businessName.toUpperCase() || 'MI NEGOCIO'}*\n`;
  msg += `📅 Fecha: ${dateStr}\n\n`;

  msg += `📊 *RESUMEN GENERAL:*\n`;
  msg += `• Total de Ítems: ${totalProducts}\n`;
  msg += `• Total de Unidades: ${totalStockUnits}\n`;
  msg += `• Valuación Costo: ${currencySymbol} ${totalCostValuation.toLocaleString('es-AR')}\n`;
  msg += `• Valuación Venta: ${currencySymbol} ${totalRetailValuation.toLocaleString('es-AR')}\n\n`;

  if (lowStockProducts.length > 0) {
    msg += `⚠️ *ALERTAS DE STOCK BAJO (${lowStockProducts.length}):*\n`;
    lowStockProducts.forEach(p => {
      msg += ` 🔴 ${p.name}: *${p.quantity}* u. (Mín: ${p.minStockThreshold})\n`;
    });
    msg += `\n`;
  } else {
    msg += `✅ *STOCK BAJO:* No hay alertas pendientes.\n\n`;
  }

  if (expiringProducts.length > 0) {
    msg += `⏳ *PRÓXIMOS A VENCER (${expiringProducts.length}):*\n`;
    expiringProducts.forEach(p => {
      const expDate = new Date(p.expirationDate!).toLocaleDateString('es-AR');
      msg += ` ⌛ ${p.name}: Vence *${expDate}* (Cant: ${p.quantity} u.)\n`;
    });
    msg += `\n`;
  } else {
    msg += `✅ *VENCIMIENTOS:* No hay productos próximos a vencer.\n\n`;
  }

  msg += `📦 *Stock Control System*\n`;
  msg += `Desarrollado por: *dev ezequiel luis lucca*`;

  return msg;
};

export const sendWhatsAppMessage = (phone: string, text: string) => {
  // Clean phone string (remove non-digits, keep leading plus if present)
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  
  const encodedText = encodeURIComponent(text);
  const url = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  window.open(url, '_blank');
};
