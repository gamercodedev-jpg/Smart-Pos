import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandActivationMonitor } from '@/hooks/useBrandActivationMonitor';
import BrandActivationModal from '@/components/common/BrandActivationModal';

/**
 * BrandActivationGuard Component
 * Shows a persistent activation modal if the user's brand is not active.
 * Monitors real-time brand status changes from the database.
 * Prevents access to app features until brand is activated.
 */
export function BrandActivationGuard() {
  const { brand, brandIsActive, user } = useAuth();
  const [showModal, setShowModal] = React.useState(false);
  
  // Monitor brand activation status changes in real-time
  useBrandActivationMonitor();

  React.useEffect(() => {
    // Show activation modal if:
    // 1. User is authenticated
    // 2. User has a brand
    // 3. Brand is not active
    if (user && brand && !brandIsActive) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [user, brand, brandIsActive]);

  if (!user || !brand || brandIsActive) {
    return null; // Don't show anything if brand is active or no user
  }

  return (
    <BrandActivationModal
      open={showModal}
      brandName={brand?.name || 'Your Brand'}
      phoneNumber={brand?.activation_phone || '0970105334'}
      emailAddress={brand?.activation_email || 'kulturesik30@gmail.com'}
      onDismissRequest={() => {
        // Don't allow dismissing - it will reappear on next page load or action
        // This ensures the user is constantly reminded to activate
      }}
    />
  );
}
