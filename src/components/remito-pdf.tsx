"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface RemitoData {
  id: string;
  number: number;
  issuedAt: string;
  notes?: string | null;
  facturaInfo?: string | null;
  sale: {
    number: number;
    total: number | string;
    subtotal: number | string;
    discount: number | string;
    tax: number | string;
    requiresFactura?: boolean;
    contact: {
      firstName: string;
      lastName: string;
      company?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
    };
    items: Array<{
      quantity: number;
      unitPrice: number | string;
      total: number | string;
      product: { name: string; category?: string };
    }>;
  };
}

function fmt(n: number | string) {
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function downloadRemitoPDF(remito: RemitoData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("DR Polarizados", margin, 13);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Sistema de Gestión", margin, 20);

  // Remito number
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`REMITO #${remito.number}`, W - margin, 13, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Venta #${remito.sale.number}`, W - margin, 20, { align: "right" });
  doc.text(new Date(remito.issuedAt).toLocaleDateString("es-AR"), W - margin, 26, { align: "right" });

  doc.setTextColor(0, 0, 0);

  // Client info
  let y = 42;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 6;
  const contact = remito.sale.contact;
  const clientName = `${contact.firstName} ${contact.lastName}`;
  doc.text(clientName, margin, y);
  if (contact.company) { y += 5; doc.text(contact.company, margin, y); }
  if (contact.email) { y += 5; doc.text(contact.email, margin, y); }
  if (contact.phone) { y += 5; doc.text(contact.phone, margin, y); }
  if (contact.address) { y += 5; doc.text(contact.address, margin, y); }

  // Billing info (if factura)
  if (remito.facturaInfo) {
    try {
      const billing = JSON.parse(remito.facturaInfo);
      const bX = W / 2;
      let bY = 42;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Datos de Facturación", bX, bY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      if (billing.razonSocial) { bY += 6; doc.text(billing.razonSocial, bX, bY); }
      if (billing.rut) { bY += 5; doc.text(`RUT/CUIT: ${billing.rut}`, bX, bY); }
      if (billing.direccion) { bY += 5; doc.text(billing.direccion, bX, bY); }
      if (billing.condicionIva) { bY += 5; doc.text(`IVA: ${billing.condicionIva}`, bX, bY); }
    } catch { /* skip if invalid JSON */ }
  }

  // Items table
  y = Math.max(y, 75) + 10;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Producto", "Categoría", "Cant.", "P. Unitario", "Total"]],
    body: remito.sale.items.map((item) => [
      item.product.name,
      item.product.category || "",
      item.quantity.toString(),
      fmt(item.unitPrice),
      fmt(item.total),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 250] },
  });

  // Totals
  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const tX = W - margin - 60;
  doc.setFontSize(9);
  if (Number(remito.sale.discount) > 0) {
    doc.text(`Subtotal:`, tX, finalY); doc.text(fmt(remito.sale.subtotal), W - margin, finalY, { align: "right" });
    doc.text(`Descuento:`, tX, finalY + 5); doc.text(`-${fmt(remito.sale.discount)}`, W - margin, finalY + 5, { align: "right" });
  }
  if (Number(remito.sale.tax) > 0) {
    doc.text(`IVA:`, tX, finalY + 10); doc.text(fmt(remito.sale.tax), W - margin, finalY + 10, { align: "right" });
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const totalY = finalY + (Number(remito.sale.discount) > 0 || Number(remito.sale.tax) > 0 ? 16 : 0);
  doc.text("TOTAL:", tX, totalY); doc.text(fmt(remito.sale.total), W - margin, totalY, { align: "right" });

  // Notes
  if (remito.notes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Notas: ${remito.notes}`, margin, totalY + 12);
  }

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, pageH - 18, W - margin, pageH - 18);
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text("Documento generado por DR Polarizados", W / 2, pageH - 12, { align: "center" });

  doc.save(`remito-${remito.number}.pdf`);
}
