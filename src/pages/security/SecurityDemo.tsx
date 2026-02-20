// src/pages/security/SecurityDemo.tsx
import { useSecurityAuditor } from "@/hooks/useSecurityAuditor";
import { useManagerOverride } from "@/hooks/useManagerOverride";
import SecurityAuditLog from "@/components/security/SecurityAuditLog";
import ManagerOverrideDialog from "@/components/security/ManagerOverrideDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { logSensitiveAction } from "@/lib/systemAuditLog";

const SecurityDemo = () => {
  const { events, logVoid, createOrder, closeOrder, addEvent } = useSecurityAuditor();
  const { isAwaitingOverride, requestOverride, validateToken, timeLeft, token, cancelOverride } = useManagerOverride();
  const [discountStatus, setDiscountStatus] = useState<string>("");

  const handleApplyDiscount = async (discount: number) => {
    const userId = "Cashier01";
    if (discount > 10) {
      addEvent('Warning', 'High Discount Attempted', `Discount of ${discount}% requires manager override.`, userId, { discount });

      void logSensitiveAction({
        userId,
        userName: userId,
        actionType: 'discount',
        previousValue: '0%',
        newValue: `${discount}%`,
        notes: 'High discount attempted; manager override required.',
      }).catch(() => {});

      const isApproved = await requestOverride();
      if (isApproved) {
        setDiscountStatus(`Discount of ${discount}% approved!`);
        addEvent('Info', 'Discount Approved', `Manager approved ${discount}% discount.`, 'Manager', { discount });

        void logSensitiveAction({
          userId: 'Manager',
          userName: 'Manager',
          actionType: 'manager_override',
          reference: `discount:${discount}%`,
          notes: 'Approved high discount override.',
        }).catch(() => {});
      } else {
        setDiscountStatus(`Discount of ${discount}% was not approved.`);
        addEvent('Warning', 'Discount Denied', `Manager override failed for ${discount}% discount.`, userId, { discount });

        void logSensitiveAction({
          userId: 'Manager',
          userName: 'Manager',
          actionType: 'manager_override',
          reference: `discount:${discount}%`,
          notes: 'Denied/failed high discount override.',
        }).catch(() => {});
      }
    } else {
      setDiscountStatus(`Discount of ${discount}% applied successfully.`);
      addEvent('Info', 'Discount Applied', `Applied ${discount}% discount.`, userId, { discount });

      void logSensitiveAction({
        userId,
        userName: userId,
        actionType: 'discount',
        previousValue: '0%',
        newValue: `${discount}%`,
        notes: 'Discount applied.',
      }).catch(() => {});
    }
  };

  const handleDialogConfirm = (inputToken: string) => {
    const isValid = validateToken(inputToken);
    if ((window as any).resolveOverride) {
        (window as any).resolveOverride(isValid);
    }
  };
  
  const handleDialogCancel = () => {
    cancelOverride();
    if ((window as any).resolveOverride) {
        (window as any).resolveOverride(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">AI Security & Audit Trail</h1>
      
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Simulate Events</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => logVoid("Cashier01", "ITM-001")}>Void Item</Button>
            <Button
              onClick={() =>
                void logSensitiveAction({
                  userId: 'Cashier01',
                  userName: 'Cashier01',
                  actionType: 'cash_drawer_open',
                  notes: 'No-sale cash drawer open.',
                }).catch(() => {})
              }
              variant="outline"
            >
              Open Cash Drawer
            </Button>
            <Button onClick={() => createOrder("Waiter02", "T5")}>Create Order</Button>
            <Button onClick={() => events.length > 0 && closeOrder(events[0].meta?.orderId, "Cashier01")}>Close Last Order</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Discount Control</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => handleApplyDiscount(5)}>Apply 5% Discount</Button>
            <Button variant="destructive" onClick={() => handleApplyDiscount(15)}>Apply 15% Discount</Button>
            {isAwaitingOverride && <p className="text-sm text-blue-500">Manager Token: <strong>{token}</strong></p>}
            {discountStatus && <p className="text-sm font-medium">{discountStatus}</p>}
          </CardContent>
        </Card>
      </div>

      <SecurityAuditLog events={events} />

      <ManagerOverrideDialog
        isOpen={isAwaitingOverride}
        timeLeft={timeLeft}
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogCancel}
      />
    </div>
  );
};

export default SecurityDemo;
