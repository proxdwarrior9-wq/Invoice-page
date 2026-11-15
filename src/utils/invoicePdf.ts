import { jsPDF } from 'jspdf';
import type { Invoice, UserPublic } from '../types';
import { formatDateShort } from './format';

function formatPdfCurrency(amount: number): string {
  return `INR ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function downloadInvoicePdf(inv: Invoice, user: Pick<UserPublic, 'name' | 'email'>): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(11, 16, 33);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Brand Badge [SC]
  doc.setFillColor(99, 102, 241);
  doc.roundedRect(margin, 11, 11, 11, 2.2, 2.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SC', margin + 5.5, 18.2, { align: 'center' });

  // Brand Title & Subtitle
  doc.setFontSize(16);
  doc.text('SkyraCloud', margin + 15, 16.8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Minecraft, VPS & Bot Hosting · India', margin + 15, 22);

  // Right Header: Invoice Number & Status
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('INVOICE', pageWidth - margin, 15.5, { align: 'right' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(56, 189, 248);
  doc.text(inv.invoiceNumber, pageWidth - margin, 21.5, { align: 'right' });

  // Status Pill in Header
  const statusUpper = inv.status.toUpperCase();
  const badgeW = 28;
  const badgeX = pageWidth - margin - badgeW;
  const badgeY = 26;
  if (inv.status === 'Paid') {
    doc.setFillColor(16, 185, 129);
  } else if (inv.status === 'Suspended') {
    doc.setFillColor(239, 68, 68);
  } else {
    doc.setFillColor(245, 158, 11);
  }
  doc.roundedRect(badgeX, badgeY, badgeW, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(statusUpper, badgeX + badgeW / 2, badgeY + 4.8, { align: 'center' });

  // Billed To & Invoice Metadata Columns
  let y = 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED TO', margin, y);
  doc.text('BILLING DETAILS', pageWidth / 2 + 6, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(user.name, margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(user.email, margin, y + 5.5);

  const metaRows: [string, string][] = [
    ['Issued Date:', formatDateShort(inv.issuedAt)],
    ['Due Date:', formatDateShort(inv.dueDate)],
    ['Paid Date:', inv.paidAt ? formatDateShort(inv.paidAt) : 'Not Paid'],
    ['Service Expiry:', formatDateShort(inv.expiryDate)],
  ];
  metaRows.forEach(([label, val], idx) => {
    const rowY = y + idx * 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label, pageWidth / 2 + 6, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(val, pageWidth - margin, rowY, { align: 'right' });
  });

  // Service Summary Box
  y += 28;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

  const colW = contentWidth / 3;
  const serviceSummary: [string, string][] = [
    ['SERVICE INSTANCE', inv.serviceName],
    ['CATEGORY & PLAN', `${inv.serviceType} · ${inv.plan}`],
    ['VPS / MC EXPIRY', formatDateShort(inv.expiryDate)],
  ];
  serviceSummary.forEach(([label, val], idx) => {
    const colX = margin + 5 + idx * colW;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, colX, y + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(val, colX, y + 13.5, { maxWidth: colW - 8 });
  });

  // Itemized Table Header
  y += 30;
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, contentWidth, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPTION', margin + 4, y + 6);
  doc.text('QTY', margin + contentWidth - 62, y + 6, { align: 'right' });
  doc.text('UNIT PRICE', margin + contentWidth - 32, y + 6, { align: 'right' });
  doc.text('TOTAL', margin + contentWidth - 4, y + 6, { align: 'right' });

  y += 9;
  // Itemized Rows
  inv.items.forEach((item, index) => {
    const descLines = doc.splitTextToSize(item.description, contentWidth - 76) as string[];
    const rowHeight = Math.max(10, descLines.length * 5 + 5);

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(descLines, margin + 4, y + 6);

    doc.text(String(item.qty), margin + contentWidth - 62, y + 6, { align: 'right' });
    doc.text(formatPdfCurrency(item.unitPrice), margin + contentWidth - 32, y + 6, {
      align: 'right',
    });
    doc.setFont('helvetica', 'bold');
    doc.text(formatPdfCurrency(item.total), margin + contentWidth - 4, y + 6, {
      align: 'right',
    });

    y += rowHeight;
  });

  // Total Amount Row
  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin + contentWidth - 78, y, 78, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL AMOUNT', margin + contentWidth - 74, y + 7.6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(formatPdfCurrency(inv.amount), margin + contentWidth - 4, y + 7.8, {
    align: 'right',
  });

  // Notes Section
  if (inv.notes) {
    y += 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('BILLING NOTES', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const noteLines = doc.splitTextToSize(inv.notes, contentWidth) as string[];
    doc.text(noteLines, margin, y);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 18;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'SkyraCloud provides Minecraft, VPS and Bot hosting in India with advanced DDoS protection and 24/7 support.',
    margin,
    footerY
  );
  doc.text(
    `Generated on ${formatDateShort(new Date().toISOString())} · Official Electronic Invoice`,
    margin,
    footerY + 4.5
  );

  doc.save(`${inv.invoiceNumber}-SkyraCloud-Invoice.pdf`);
}
