import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { locations, stockItems } from '@/data/gaapMockData';
import { buildTransferQrPayload, createTransfer, getBalance, receiveTransfer, type TransferQrPayloadV1 } from '@/lib/gaapStore';
import { generateQrDataUrl, safeJsonParse } from '@/lib/qr';
import { QrScanner } from '@/components/qr/QrScanner';

type ReceiveTransferResult = ReturnType<typeof receiveTransfer>;
function isReceiveTransferError(res: ReceiveTransferResult): res is Extract<ReceiveTransferResult, { ok: false }> {
  return res.ok === false;
}

export default function TransferQR() {
  const [fromLocationId, setFromLocationId] = useState('ndola-main-store');
  const [toLocationId, setToLocationId] = useState('ndola-bar-store');
  const [stockItemId, setStockItemId] = useState('sugar');
  const [qty, setQty] = useState(10);

  const [issuedTransferId, setIssuedTransferId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [scannedText, setScannedText] = useState<string | null>(null);
  const [receiveMsg, setReceiveMsg] = useState<string | null>(null);

  const fromLocation = locations.find(l => l.id === fromLocationId);
  const toLocation = locations.find(l => l.id === toLocationId);

  const onHandFrom = getBalance(fromLocationId, stockItemId);
  const onHandTo = getBalance(toLocationId, stockItemId);

  const canIssue = fromLocationId !== toLocationId && qty > 0;

  const issue = async () => {
    setStatusMsg(null);
    setQrDataUrl(null);
    setIssuedTransferId(null);

    if (onHandFrom < qty) {
      setStatusMsg(`Insufficient stock to issue. On hand: ${onHandFrom}`);
      return;
    }

    const transfer = createTransfer({
      fromLocationId,
      toLocationId,
      lines: [{ stockItemId, qty }],
    });

    const payload = buildTransferQrPayload(transfer);
    const qr = await generateQrDataUrl(JSON.stringify(payload));

    setIssuedTransferId(transfer.id);
    setQrDataUrl(qr);
    setStatusMsg(`ISSUED. Storeman scanned OUT; now scan IN at destination.`);
  };

  const parsedScan = useMemo(() => {
    if (!scannedText) return null;
    const parsed = safeJsonParse<TransferQrPayloadV1>(scannedText);
    return parsed.ok ? parsed.value : null;
  }, [scannedText]);

  const receive = () => {
    setReceiveMsg(null);
    if (!parsedScan || parsedScan.type !== 'stock-transfer') {
      setReceiveMsg('Invalid QR payload.');
      return;
    }

    const res = receiveTransfer(parsedScan.transferId);
    if (isReceiveTransferError(res)) {
      setReceiveMsg(res.error);
      return;
    }

    setReceiveMsg('RECEIVED. Barman scanned IN; stock updated.');
  };

  const wasIssuedNow = () => {
    const was = onHandFrom;
    const issued = qty;
    const now = onHandFrom - qty;
    return { was, issued, now };
  };

  const w = wasIssuedNow();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inter-Store Transfers (QR)</h1>
        <p className="text-sm text-muted-foreground">Was / Issued / Now with scan-out + scan-in (no manual typing)</p>
      </div>

      <Tabs defaultValue="issue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="issue">Scan Out (Issue)</TabsTrigger>
          <TabsTrigger value="receive">Scan In (Receive)</TabsTrigger>
        </TabsList>

        <TabsContent value="issue" className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label>From</Label>
                <Select value={fromLocationId} onValueChange={setFromLocationId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {locations.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name} ({l.branchId})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>To</Label>
                <Select value={toLocationId} onValueChange={setToLocationId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {locations.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name} ({l.branchId})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Item</Label>
                <Select value={stockItemId} onValueChange={setStockItemId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stockItems.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Quantity</Label>
                <Input type="number" min={0.01} value={qty} onChange={e => setQty(Number(e.target.value || 0))} />
              </div>
            </div>

            <Card className="p-4">
              <div className="font-semibold mb-2">Was / Issued / Now (From Location)</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Was</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Now</TableHead>
                    <TableHead>To Location On Hand</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono">{w.was}</TableCell>
                    <TableCell className="font-mono">{w.issued}</TableCell>
                    <TableCell className="font-mono">{w.now}</TableCell>
                    <TableCell className="font-mono">{onHandTo}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="text-xs text-muted-foreground mt-2">
                Issuing applies immediately (scan-out). Receiving applies when scan-in is confirmed.
              </div>
            </Card>

            <div className="flex gap-2">
              <Button onClick={issue} disabled={!canIssue}>Issue & Generate QR</Button>
              <Button variant="secondary" onClick={() => { setStatusMsg(null); setQrDataUrl(null); setIssuedTransferId(null); }}>Clear</Button>
            </div>

            {statusMsg && <div className="text-sm">{statusMsg}</div>}

            {issuedTransferId && (
              <div className="text-sm text-muted-foreground">Transfer ID: <span className="font-mono">{issuedTransferId}</span></div>
            )}

            {qrDataUrl && (
              <Card className="p-4">
                <div className="font-semibold mb-2">Scan this QR at destination</div>
                <img src={qrDataUrl} alt="Transfer QR" className="w-56 h-56" />
              </Card>
            )}

            <Card className="p-4">
              <div className="text-sm text-muted-foreground">
                From: {fromLocation?.name} · To: {toLocation?.name} · Item: {stockItems.find(i => i.id === stockItemId)?.name}
              </div>
            </Card>
          </Card>
        </TabsContent>

        <TabsContent value="receive" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <QrScanner
              title="Scan Transfer QR"
              onResult={(t) => {
                setScannedText(t);
                setReceiveMsg(null);
              }}
            />

            <Card className="p-4 space-y-3">
              <div className="font-semibold">Scanned Payload</div>
              <div className="text-xs text-muted-foreground break-all">{scannedText ?? '—'}</div>

              <div className="flex gap-2">
                <Button onClick={receive} disabled={!parsedScan}>Confirm Receive</Button>
                <Button variant="secondary" onClick={() => { setScannedText(null); setReceiveMsg(null); }}>Clear</Button>
              </div>

              {receiveMsg && <div className="text-sm">{receiveMsg}</div>}

              <div className="text-xs text-muted-foreground">
                Receiving will increase stock at the transfer's destination location.
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
