import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PhoneIcon, Mail, Copy, Check, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface BrandActivationModalProps {
  open: boolean;
  brandName: string;
  phoneNumber?: string;
  emailAddress?: string;
  onDismissRequest?: () => void;
  canDismiss?: boolean; // If false, dismiss button shows warning instead
}

export default function BrandActivationModal({
  open,
  brandName,
  phoneNumber = '0970105334',
  emailAddress = 'kulturesik30@gmail.com',
  onDismissRequest,
  canDismiss = false,
}: BrandActivationModalProps) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [dismissWarning, setDismissWarning] = useState(false);

  const copyToClipboard = (text: string, type: 'phone' | 'email') => {
    navigator.clipboard.writeText(text);
    if (type === 'phone') {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDismissRequest?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Activate Your Brand
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Brand Name */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Brand Name</p>
            <p className="text-lg font-semibold text-gray-900">{brandName}</p>
          </div>

          {/* Warning Message */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-900">
              ⚠️ Your brand is currently <span className="font-bold">inactive</span>. You must activate it before you can use any features.
            </p>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">To activate your brand, contact us:</h3>
            
            <div className="space-y-2">
              {/* Phone Option */}
              <div className="flex items-center gap-3 p-3 bg-blue-900 border border-blue-800 rounded-lg hover:bg-blue-800 transition">
                <PhoneIcon className="h-5 w-5 text-blue-200 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-blue-300">Call us</p>
                  <p className="text-sm font-medium text-white">{phoneNumber}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(phoneNumber, 'phone')}
                  className="text-xs text-white hover:text-blue-200"
                >
                  {copiedPhone ? (
                    <Check className="h-4 w-4 text-green-300" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Email Option */}
              <div className="flex items-center gap-3 p-3 bg-green-900 border border-green-800 rounded-lg hover:bg-green-800 transition">
                <Mail className="h-5 w-5 text-green-200 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-green-300">Email us</p>
                  <p className="text-sm font-medium text-white">{emailAddress}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(emailAddress, 'email')}
                  className="text-xs text-white hover:text-green-200"
                >
                  {copiedEmail ? (
                    <Check className="h-4 w-4 text-green-300" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 space-y-2">
            <p>• Please provide your brand name and contact information</p>
            <p>• We will verify and activate your account within 24-48 hours</p>
            <p>• Once activated, all features will be available</p>
          </div>
        </div>

        {/* Action Button - only dismiss, no close option */}
        <div className="flex gap-2">
          {dismissWarning && (
            <div className="w-full bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2 text-sm text-red-900">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Cannot proceed without activation</p>
                <p className="text-xs mt-1">Contact us to activate your brand before using the app.</p>
              </div>
            </div>
          )}
          {!dismissWarning && (
            <>
              <Button
                onClick={() => setDismissWarning(true)}
                variant="outline"
                className="flex-1"
              >
                Not Yet
              </Button>
              <Button
                disabled
                className="flex-1 cursor-not-allowed opacity-50"
                title="This will be enabled once your brand is activated"
              >
                Waiting for Activation...
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
