import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product, UserProfile } from '../types';

export const buildStockPDFDocument = (products: Product[], user: UserProfile): jsPDF => {
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const currencySymbol = user.currency || '$';

  // Calculate stats
  const totalProducts = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + p.quantity, 0);
  const totalCostValuation = products.reduce((acc, p) => acc + p.costPrice * p.quantity, 0);
  const totalRetailValuation = products.reduce((acc, p) => acc + p.sellingPrice * p.quantity, 0);
  
  const lowStockCount = products.filter(p => p.quantity <= p.minStockThreshold).length;
  const expiringCount = products.filter(p => {
    if (!p.expirationDate) return false;
    const exp = new Date(p.expirationDate);
    const today = new Date();
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diffDays >= 0 && diffDays <= p.expirationAlertDays;
  }).length;

  // Header Colors & Style (Dark Charcoal & Amber Accent)
  doc.setFillColor(45, 41, 38);
  doc.rect(0, 0, 210, 35, 'F');

  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(user.businessName || 'STOCK CONTROL SYSTEM', 14, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 220, 210);
  doc.text(`Stock Control System • Emisión: ${dateStr}`, 14, 25);

  // KPI Summary Card
  doc.setFillColor(245, 247, 246);
  doc.setDrawColor(220, 225, 222);
  doc.roundedRect(14, 40, 182, 26, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(60, 70, 65);
  doc.text(`Total Productos: ${totalProducts}`, 18, 48);
  doc.text(`Unidades en Stock: ${totalStockUnits}`, 18, 55);

  doc.text(`Valuación Costo: ${currencySymbol} ${totalCostValuation.toLocaleString('es-AR')}`, 80, 48);
  doc.text(`Valuación Venta: ${currencySymbol} ${totalRetailValuation.toLocaleString('es-AR')}`, 80, 55);

  doc.setTextColor(180, 80, 0);
  doc.text(`Alertas Stock Bajo: ${lowStockCount}`, 145, 48);
  doc.setTextColor(190, 40, 40);
  doc.text(`Alertas Vencimiento: ${expiringCount}`, 145, 55);

  // Prepare table data
  const tableData = products.map((p, idx) => {
    let alertText = 'OK';
    const isLow = p.quantity <= p.minStockThreshold;
    
    let isExpiring = false;
    let daysToExp = 999;
    if (p.expirationDate) {
      const exp = new Date(p.expirationDate);
      const today = new Date();
      daysToExp = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (daysToExp < 0) {
        alertText = 'VENCIDO';
      } else if (daysToExp <= p.expirationAlertDays) {
        isExpiring = true;
      }
    }

    if (alertText !== 'VENCIDO') {
      if (p.quantity === 0) alertText = 'SIN STOCK';
      else if (isLow && isExpiring) alertText = 'STOCK BAJO & VENCE';
      else if (isLow) alertText = 'STOCK BAJO';
      else if (isExpiring) alertText = `VENCE (${daysToExp}d)`;
    }

    const expDisplay = p.expirationDate 
      ? new Date(p.expirationDate).toLocaleDateString('es-AR') 
      : 'N/A';

    return [
      (idx + 1).toString(),
      p.barcode || '-',
      p.name,
      p.category,
      `${p.quantity} ${p.unit.substring(0, 3)}`,
      `${currencySymbol} ${p.sellingPrice.toLocaleString('es-AR')}`,
      expDisplay,
      alertText
    ];
  });

  autoTable(doc, {
    startY: 72,
    head: [['#', 'Cód. Barras', 'Producto', 'Categoría', 'Stock', 'P. Venta', 'Vencimiento', 'Estado']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [18, 26, 22],
      textColor: [245, 158, 11],
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 40, 35]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 249]
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 28 },
      2: { cellWidth: 42 },
      3: { cellWidth: 26 },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 24, halign: 'center' },
      7: { cellWidth: 22, halign: 'center', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const text = String(data.cell.raw);
        if (text.includes('STOCK BAJO') || text.includes('VENCE') || text.includes('SIN STOCK') || text.includes('VENCIDO')) {
          data.cell.styles.textColor = [190, 40, 40];
        } else {
          data.cell.styles.textColor = [16, 120, 70];
        }
      }
    }
  });

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 125);
    doc.text(
      `Página ${i} de ${pageCount} • Stock Control System • dev ezequiel luis lucca`,
      105,
      288,
      { align: 'center' }
    );
  }

  return doc;
};

// Generate and download PDF
export const generateStockPDF = (products: Product[], user: UserProfile) => {
  const doc = buildStockPDFDocument(products, user);
  const now = new Date();
  const filename = `Stock_${(user.businessName || 'Sistema').replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

// Share PDF file directly via WhatsApp & Web Share API
export const shareStockPDFViaWhatsApp = async (
  products: Product[],
  user: UserProfile,
  phoneNumber: string,
  textMessage: string
) => {
  const doc = buildStockPDFDocument(products, user);
  const now = new Date();
  const filename = `Stock_${(user.businessName || 'Sistema').replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.pdf`;
  
  const pdfBlob = doc.output('blob');
  const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

  // 1. Try Native Web Share API (Mobile Android & iOS Safari)
  if (navigator && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        title: `Reporte PDF de Inventario - ${user.businessName || 'Stock Control'}`,
        text: textMessage,
        files: [pdfFile]
      });
      return;
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('Web Share API error:', err);
      } else {
        return; // User cancelled share modal
      }
    }
  }

  // 2. Desktop Fallback: Download PDF file to user device AND open WhatsApp text link
  const link = document.createElement('a');
  const blobUrl = URL.createObjectURL(pdfBlob);
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  let cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const extendedText = `${textMessage}\n\n📄 *Se descargó el archivo PDF adjunto en tu dispositivo (${filename}).*`;
  const encodedText = encodeURIComponent(extendedText);
  const whatsappUrl = cleanPhone 
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;

  window.open(whatsappUrl, '_blank');
};
