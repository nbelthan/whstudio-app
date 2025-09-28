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

  // During SSR, always render children to avoid hydration issues
  if (typeof window === 'undefined') {
    return <>{children}</>;
  }

  // In development mode, always show the app (consent is auto-accepted)
  if (process.env.NODE_ENV === 'development') {
    return <>{children}</>;
  }

  // If consent is explicitly declined, show limited functionality message
  if (consentGiven === false) {
    return (
      <div className="min-h-screen bg-[#0B0F12] flex items-center justify-center p-6">
        <div className="max-w-md mx-auto text-center space-y-4">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-white">
            Consent Required
          </h2>
          <p className="text-gray-400">
            To use WorldHuman Studio, you need to accept our privacy policy and terms of service.
            This helps us provide a secure and transparent platform for AI training tasks.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => {
                // Clear consent and reload to show dialog again
                localStorage.removeItem('worldhuman-consent');
                window.location.reload();
              }}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Review Privacy Policy Again
            </button>
            <p className="text-xs text-gray-500">
              Click above to review our policies again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // In all other cases (null or true), show the app
  // The dialog will overlay if needed (when consentGiven is null and showConsentDialog is true)
  return (
    <>
      {children}
      {showConsentDialog && consentGiven === null && (
        <ConsentDialog
          isOpen={true}
          onAccept={handleAcceptConsent}
          onDecline={handleDeclineConsent}
        />
      )}
    </>
  );
}