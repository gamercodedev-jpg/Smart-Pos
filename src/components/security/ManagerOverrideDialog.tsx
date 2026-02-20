// src/components/security/ManagerOverrideDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ManagerOverrideDialogProps {
  isOpen: boolean;
  timeLeft: number;
  onConfirm: (token: string) => void;
  onCancel: () => void;
}

const ManagerOverrideDialog = ({ isOpen, timeLeft, onConfirm, onCancel }: ManagerOverrideDialogProps) => {
  const [inputToken, setInputToken] = useState("");

  const handleConfirm = () => {
    onConfirm(inputToken);
    setInputToken("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manager Override Required</DialogTitle>
          <DialogDescription>
            A 4-digit token is required to approve this action. The token expires in {timeLeft} seconds.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            type="text"
            maxLength={4}
            placeholder="Enter 4-digit token"
            value={inputToken}
            onChange={(e) => setInputToken(e.target.value)}
            className="text-center text-2xl tracking-widest font-mono"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManagerOverrideDialog;
