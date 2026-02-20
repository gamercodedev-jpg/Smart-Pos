// src/hooks/useReportSharer.ts
import { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { DailySalesReport } from '@/types'; // Assuming you have this type defined

// Extend the jsPDF type to include the autoTable method
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

/**
 * A hook to provide functionality for sharing daily sales reports.
 */
export const useReportSharer = () => {

  /**
   * Generates a professional PDF document from the daily sales report data.
   * @param report - The daily sales report data.
   * @returns A Blob representing the generated PDF file.
   */
  const generatePdf = (report: DailySalesReport): Blob => {
    const doc = new jsPDF();
    const reportDate = new Date(report.date).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    // Header
    doc.setFontSize(18);
    doc.text('Daily Sales Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`Date: ${reportDate}`, 14, 28);

    // Totals Section
    doc.autoTable({
      startY: 35,
      head: [['Metric', 'Value']],
      body: [
        ['Net Sales', `K ${report.totals.netSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Gross Sales', `K ${report.totals.grossSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Cost of Goods Sold', `K ${report.totals.cogs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Gross Profit', `K ${report.totals.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Labor Cost', `K ${report.totals.laborCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133] }, // Emerald green
    });

    // Top Selling Items
    doc.autoTable({
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Top Selling Items', 'Quantity', 'Total Sales']],
      body: report.topSellingItems.map(item => [
        item.name,
        item.quantity,
        `K ${item.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] }, // Belize hole blue
    });

    // Stock Variances
    if (report.stockVariances.length > 0) {
      doc.autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Stock Variances', 'Theoretical', 'Actual', 'UoM', 'Cost Impact']],
        body: report.stockVariances.map(v => [
          v.item,
          v.theoretical,
          v.actual,
          v.uom,
          `K ${v.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [192, 57, 43] }, // Pomegranate red
      });
    }
    
    // Voids
    if (report.voids.length > 0) {
      doc.autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Voids', 'Count', 'Value']],
        body: report.voids.map(v => [
          v.reason,
          v.count,
          `K ${v.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [243, 156, 18] }, // Orange
      });
    }

    return doc.output('blob');
  };

  /**
   * Formats the report data into a concise text summary for messaging apps like WhatsApp.
   * @param report - The daily sales report data.
   * @param approvalToken - A unique token for the remote approval link.
   * @returns A formatted string.
   */
  const formatWhatsAppSummary = (report: DailySalesReport, approvalToken: string): string => {
    const reportDate = new Date(report.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
    const totalVoids = report.voids.reduce((sum, v) => sum + v.value, 0);
    const totalVariance = report.stockVariances.reduce((sum, v) => sum + v.cost, 0);

    const header = `*Daily Report: ${reportDate}*`;
    const sales = `💰 *Sales*: K ${report.totals.grossSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const profit = `📈 *Profit*: K ${report.totals.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const voids = `🚩 *Voids*: K ${totalVoids.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const variance = `📉 *Variance*: K ${totalVariance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const topItem = report.topSellingItems[0];
    const bestSeller = `⭐ *Best Seller*: ${topItem.name} (K ${topItem.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;

    const quickActionLink = `https://profitmaker.example.com/approve-cashup?token=${approvalToken}`;
    const action = `\n\n*Quick Action:*\n[Click to approve cash-up](${quickActionLink})`;

    return `${header}\n\n${sales}\n${profit}\n${voids}\n${variance}\n\n${bestSeller}${action}`;
  };

  /**
   * Shares the daily report using the Web Share API.
   * It generates a PDF, creates a text summary, and prompts the user to share.
   * @param report - The daily sales report data.
   */
  const shareDailyReport = async (report: DailySalesReport) => {
    if (!navigator.share) {
      alert("Sharing is not supported on this browser.");
      return;
    }

    // Generate a unique token for the approval link
    const approvalToken = crypto.randomUUID();

    const pdfBlob = generatePdf(report);
    const reportDate = new Date(report.date).toISOString().split('T')[0];
    const fileName = `Daily_Report_${reportDate}.pdf`;
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    const summaryText = formatWhatsAppSummary(report, approvalToken);

    try {
      if (!navigator.canShare || !navigator.canShare({ files: [pdfFile] })) {
        throw new Error("Can't share files on this browser.");
      }

      await navigator.share({
        files: [pdfFile],
        title: `Daily Report ${reportDate}`,
        text: summaryText,
      });
    } catch (error) {
      console.error('Error sharing report with file:', error);
      // Fallback for when sharing files and text together is not supported or fails
      try {
        await navigator.share({
          title: `Daily Report ${reportDate}`,
          text: summaryText,
        });
      } catch (fallbackError) {
        console.error('Error sharing text only:', fallbackError);
        alert("Could not share the report. You may need to share the text manually.");
      }
    }
  };

  return { shareDailyReport, generatePdf, formatWhatsAppSummary };
};
