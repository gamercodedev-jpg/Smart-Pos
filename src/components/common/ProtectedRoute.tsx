import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import BrandActivationModal from '@/components/common/BrandActivationModal';

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, user, brand, brandIsActive } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Hard-block all protected routes immediately when the brand is inactive.
  // This prevents any route content from rendering before the lock appears.
  if (user && brand && !brandIsActive) {
    return (
      <div className="min-h-screen">
        <BrandActivationModal
          open={true}
          brandName={brand?.name || 'Your Brand'}
          phoneNumber={brand?.activation_phone || '0970105334'}
          emailAddress={brand?.activation_email || 'kulturesik30@gmail.com'}
          onDismissRequest={() => {}}
        />
      </div>
    );
  }

  return children;
}
