import { useState } from 'react';
import { CreditCard, Banknote, Building2, FileText, Smartphone, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaymentMethod } from '@/types/pos';
import { cn } from '@/lib/utils';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onComplete: (method: PaymentMethod) => void;
}

const PAYMENT_METHODS = [
  { id: 'cash' as PaymentMethod, label: 'Cash', icon: Banknote, color: 'bg-green-500 hover:bg-green-600' },
  { id: 'card' as PaymentMethod, label: 'Card', icon: CreditCard, color: 'bg-blue-500 hover:bg-blue-600' },
  { id: 'account' as PaymentMethod, label: 'Account', icon: Building2, color: 'bg-purple-500 hover:bg-purple-600' },
  { id: 'cheque' as PaymentMethod, label: 'Cheque', icon: FileText, color: 'bg-orange-500 hover:bg-orange-600' },
  { id: 'non_bank' as PaymentMethod, label: 'Mobile Money', icon: Smartphone, color: 'bg-teal-500 hover:bg-teal-600' },
];

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

export default function PaymentDialog({ open, onOpenChange, total, onComplete }: PaymentDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [cashReceived, setCashReceived] = useState<string>('');
  const [reference, setReference] = useState('');
  
  const cashAmount = parseFloat(cashReceived) || 0;
  const change = cashAmount - total;
  
  const handleComplete = () => {
    if (!selectedMethod) return;
    if (selectedMethod === 'cash' && cashAmount < total) return;
    onComplete(selectedMethod);
    // Reset state
    setSelectedMethod(null);
    setCashReceived('');
    setReference('');
  };
  
  const handleQuickAmount = (amount: number) => {
    setCashReceived((prev) => {
      const current = parseFloat(prev) || 0;
      return (current + amount).toString();
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Payment - <span className="text-primary">K {total.toFixed(2)}</span>
          </DialogTitle>
        </DialogHeader>
        
        {/* Payment Method Selection */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {PAYMENT_METHODS.map(method => (
            <Button
              key={method.id}
              variant="outline"
              className={cn(
                'h-20 flex flex-col gap-1',
                selectedMethod === method.id && method.color + ' text-white border-transparent'
              )}
              onClick={() => setSelectedMethod(method.id)}
            >
              <method.icon className="h-6 w-6" />
              <span className="text-xs">{method.label}</span>
            </Button>
          ))}
        </div>
        
        {/* Cash Payment */}
        {selectedMethod === 'cash' && (
          <div className="space-y-4">
            <div>
              <Label>Amount Received</Label>
              <Input
                type="number"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder="Enter amount..."
                className="h-14 text-2xl font-bold text-center"
                autoFocus
              />
            </div>
            
            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-6 gap-2">
              {QUICK_AMOUNTS.map(amount => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(amount)}
                >
                  +{amount}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setCashReceived(total.toFixed(0))}
            >
              Exact Amount (K {total.toFixed(0)})
            </Button>
            
            {cashAmount >= total && (
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Change Due</p>
                <p className="text-3xl font-bold text-green-600">K {change.toFixed(2)}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Card / Account / Cheque / Mobile */}
        {selectedMethod && selectedMethod !== 'cash' && (
          <div className="space-y-4">
            <div>
              <Label>Reference / Authorization</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={
                  selectedMethod === 'card' ? 'Card auth code...' :
                  selectedMethod === 'account' ? 'Account name...' :
                  selectedMethod === 'cheque' ? 'Cheque number...' :
                  'Transaction ID...'
                }
                className="h-12"
              />
            </div>
            
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-3xl font-bold">K {total.toFixed(2)}</p>
            </div>
          </div>
        )}
        
        {/* Complete Button */}
        <Button
          className="w-full h-14 text-lg"
          disabled={!selectedMethod || (selectedMethod === 'cash' && cashAmount < total)}
          onClick={handleComplete}
        >
          <Check className="h-5 w-5 mr-2" />
          Complete Payment
        </Button>
      </DialogContent>
    </Dialog>
  );
}
