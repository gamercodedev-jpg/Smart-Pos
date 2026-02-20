import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import type { PurchasePlan } from '@/lib/purchasePlanner';

export type WeeklyReportData = {
  title: string;
  subtitle: string;
  generatedAt: string;
  metrics: Array<{ label: string; value: string }>;
  insightsTop: Array<{ tone: string; title: string; summary: string }>;
  topItems: Array<{ name: string; value: string; note?: string }>;
  lossItems: Array<{ name: string; value: string; note?: string }>;
  categories: Array<{ name: string; value: string }>;
};

function safeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, '-');
}

export function downloadWeeklyReportPdf(report: WeeklyReportData) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(report.title, 40, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(report.subtitle, 40, 72);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, 40, 88);
  doc.setTextColor(0);

  // Metrics
  autoTable(doc, {
    startY: 104,
    head: [['Metric', 'Value']],
    body: report.metrics.map((m) => [m.label, m.value]),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [30, 16, 60] },
  });

  // Insights
  const afterMetricsY = (doc as any).lastAutoTable?.finalY ?? 200;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Top Insights', 40, afterMetricsY + 26);

  autoTable(doc, {
    startY: afterMetricsY + 36,
    head: [['Tone', 'Title', 'Summary']],
    body: report.insightsTop.map((i) => [i.tone, i.title, i.summary]),
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 6 },
    headStyles: { fillColor: [30, 16, 60] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 160 },
      2: { cellWidth: 330 },
    },
  });

  let y = (doc as any).lastAutoTable?.finalY ?? afterMetricsY + 140;

  // Top items
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Top Items', 40, y + 26);
  autoTable(doc, {
    startY: y + 36,
    head: [['Item', 'Value', 'Note']],
    body: report.topItems.map((x) => [x.name, x.value, x.note ?? '']),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 6 },
    headStyles: { fillColor: [30, 16, 60] },
  });

  y = (doc as any).lastAutoTable?.finalY ?? y + 140;

  // Loss items
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Loss Leaders', 40, y + 26);
  autoTable(doc, {
    startY: y + 36,
    head: [['Item', 'Value', 'Note']],
    body: report.lossItems.map((x) => [x.name, x.value, x.note ?? '']),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 6 },
    headStyles: { fillColor: [30, 16, 60] },
  });

  y = (doc as any).lastAutoTable?.finalY ?? y + 140;

  // Categories
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Sales by Category', 40, y + 26);
  autoTable(doc, {
    startY: y + 36,
    head: [['Category', 'Value']],
    body: report.categories.map((c) => [c.name, c.value]),
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 6 },
    headStyles: { fillColor: [30, 16, 60] },
  });

  const filename = safeFilename(`${report.title} - ${report.subtitle}.pdf`);
  doc.save(filename);
}

export function downloadPurchasePlanPdf(params: {
  title: string;
  subtitle: string;
  plan: PurchasePlan;
  formatMoney: (n: number) => string;
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(params.title, 40, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(params.subtitle, 40, 72);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Horizon: ${params.plan.horizonDays} days  •  Lines: ${params.plan.totals.lines}  •  Est: ${params.formatMoney(params.plan.totals.estCost)}`, 40, 88);
  doc.text(`Generated: ${new Date(params.plan.generatedAt).toLocaleString()}`, 40, 102);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 118,
    head: [[
      'Code',
      'Item',
      'Unit',
      'On hand',
      'Forecast',
      'Suggested',
      'Unit cost',
      'Est cost',
      'Reason',
    ]],
    body: params.plan.rows.map((r) => [
      r.code,
      r.name,
      r.unitType,
      String(r.onHand),
      String(r.forecastUsage),
      String(r.suggestedOrderQty),
      String(r.unitCost),
      String(r.estCost),
      r.reason,
    ]),
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 5 },
    headStyles: { fillColor: [30, 16, 60] },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 140 },
      2: { cellWidth: 32 },
      3: { cellWidth: 44 },
      4: { cellWidth: 52 },
      5: { cellWidth: 52 },
      6: { cellWidth: 45 },
      7: { cellWidth: 45 },
      8: { cellWidth: 100 },
    },
  });

  const filename = safeFilename(`${params.title} - ${params.subtitle}.pdf`);
  doc.save(filename);
}
