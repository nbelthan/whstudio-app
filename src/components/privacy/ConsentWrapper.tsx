'use client';

import { useEffect } from 'react';
import ConsentDialog, { useConsentManager } from './ConsentDialog';

interface ConsentWrapperProps {
  children: React.ReactNode;
}

export default function ConsentWrapper({ children }: ConsentWrapperProps) {
  const {
    consentGiven,
    showConsentDialog,
    handleAcceptConsent,
    handleDeclineConsent
  } = useConsentManager();

  // If consent is declined, show limited functionality message
  if (consentGiven === false) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center p-6">
        <div className="max-w-md mx-auto text-center space-y-4">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Consent Required
          </h2>
          <p className="text-[var(--color-text-secondary)]">
            To use WorldHuman Studio, you need to accept our privacy policy and terms of service.
            This helps us provide a secure and transparent platform for AI training tasks.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Review Privacy Policy
            </button>
            <p className="text-xs text-[var(--color-text-secondary)]">
              You can also clear your browser data and visit again to review our policies.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <ConsentDialog
        isOpen={showConsentDialog}
        onAccept={handleAcceptConsent}
        onDecline={handleDeclineConsent}
      />
    </>
  );
}