// src/components/pos/ZRAInvoice.tsx
import { ZRAInvoiceData } from "@/types/zra";
import { generateZRAQRCode } from "@/lib/zraUtils";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Button } from "../ui/button";
import { Download } from "lucide-react";

interface ZRAInvoiceProps {
  invoiceData: ZRAInvoiceData;
}

const ZRAInvoice = ({ invoiceData }: ZRAInvoiceProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  useEffect(() => {
    generateZRAQRCode(invoiceData).then(setQrCodeUrl);
  }, [invoiceData]);

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("TAX INVOICE", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`ZRA TPIN: ${invoiceData.zraTpin}`, 20, 30);
    if(invoiceData.customerTpin) {
        doc.text(`Customer TPIN: ${invoiceData.customerTpin}`, 20, 35);
    }
    doc.text(`Invoice #: ${invoiceData.invoiceId}`, pageWidth - 20, 30, { align: "right" });
    doc.text(`Date: ${new Date(invoiceData.date).toLocaleString()}`, pageWidth - 20, 35, { align: "right" });

    // Items Table
    doc.autoTable({
      startY: 45,
      head: [['Item', 'Qty', 'Unit Price', 'Total']],
      body: invoiceData.items.map(item => [
        item.name,
        item.quantity,
        item.unitPrice.toFixed(2),
        (item.quantity * item.unitPrice).toFixed(2)
      ]),
      theme: 'striped',
    });

    // Totals Section
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const rightAlignX = pageWidth - 20;
    doc.setFontSize(10);
    doc.text(`Subtotal:`, rightAlignX - 30, finalY);
    doc.text(`${invoiceData.subtotal.toFixed(2)}`, rightAlignX, finalY, { align: 'right' });
    
    doc.text(`VAT (16%):`, rightAlignX - 30, finalY + 5);
    doc.text(`${invoiceData.taxDetails.vatAmount.toFixed(2)}`, rightAlignX, finalY + 5, { align: 'right' });

    doc.text(`Tourism Levy (1.5%):`, rightAlignX - 30, finalY + 10);
    doc.text(`${invoiceData.taxDetails.tourismLevyAmount.toFixed(2)}`, rightAlignX, finalY + 10, { align: 'right' });

    doc.setFont("helvetica", "bold");
    doc.text(`Total:`, rightAlignX - 30, finalY + 15);
    doc.text(`ZMW ${invoiceData.total.toFixed(2)}`, rightAlignX, finalY + 15, { align: 'right' });
    doc.setFont("helvetica", "normal");

    // Footer with QR Code
    const qrCodeY = finalY + 25;
    if (qrCodeUrl) {
      doc.addImage(qrCodeUrl, 'PNG', (pageWidth / 2) - 25, qrCodeY, 50, 50);
    }
    doc.text(`Fiscal Verification Code: ${invoiceData.fiscalVerificationCode}`, pageWidth / 2, qrCodeY + 60, { align: 'center' });
    doc.text(`Cashier: ${invoiceData.cashierName}`, pageWidth / 2, qrCodeY + 65, { align: 'center' });
    doc.setFontSize(8);
    doc.text("Thank you for your business!", pageWidth / 2, qrCodeY + 75, { align: 'center' });


    doc.save(`Invoice_${invoiceData.invoiceId}.pdf`);
  };

  return (
    <div className="p-4 border rounded-lg max-w-md mx-auto bg-white shadow-sm">
        <div className="text-center mb-4">
            <h2 className="text-2xl font-bold">TAX INVOICE</h2>
            <p className="text-sm text-muted-foreground">ZRA Compliant</p>
        </div>
        <div className="flex justify-between text-xs mb-2">
            <div>
                <p><strong>ZRA TPIN:</strong> {invoiceData.zraTpin}</p>
                {invoiceData.customerTpin && <p><strong>Customer TPIN:</strong> {invoiceData.customerTpin}</p>}
            </div>
            <div className="text-right">
                <p><strong>Invoice #:</strong> {invoiceData.invoiceId}</p>
                <p><strong>Date:</strong> {new Date(invoiceData.date).toLocaleString()}</p>
            </div>
        </div>
        <table className="w-full text-sm mb-4">
            <thead>
                <tr className="border-b">
                    <th className="text-left py-1">Item</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                {invoiceData.items.map(item => (
                    <tr key={item.id}>
                        <td className="py-1">{item.name}</td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-right">{(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        <div className="flex justify-end text-sm">
            <div className="w-48">
                <div className="flex justify-between"><p>Subtotal:</p> <p>{invoiceData.subtotal.toFixed(2)}</p></div>
                <div className="flex justify-between"><p>VAT (16%):</p> <p>{invoiceData.taxDetails.vatAmount.toFixed(2)}</p></div>
                <div className="flex justify-between"><p>Tourism Levy (1.5%):</p> <p>{invoiceData.taxDetails.tourismLevyAmount.toFixed(2)}</p></div>
                <div className="flex justify-between font-bold text-base border-t mt-1 pt-1"><p>Total:</p> <p>ZMW {invoiceData.total.toFixed(2)}</p></div>
            </div>
        </div>
        <div className="flex flex-col items-center mt-6">
            {qrCodeUrl && <img src={qrCodeUrl} alt="ZRA QR Code" className="w-32 h-32" />}
            <p className="text-xs mt-2 font-mono">{invoiceData.fiscalVerificationCode}</p>
            <p className="text-xs mt-1">Cashier: {invoiceData.cashierName}</p>
        </div>
        <Button onClick={generatePDF} className="w-full mt-4">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
        </Button>
    </div>
  );
};

export default ZRAInvoice;
