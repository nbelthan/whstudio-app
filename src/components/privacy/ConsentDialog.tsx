'use client';

import { useState, useEffect } from 'react';
import { Button, Typography } from '@worldcoin/mini-apps-ui-kit-react';
import { Card, Modal } from '@/components/ui';
import { Shield, FileText, ExternalLink, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ConsentDialogProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function ConsentDialog({ isOpen, onAccept, onDecline }: ConsentDialogProps) {
  const router = useRouter();
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    // Check if user has scrolled to within 50px of the bottom
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      setHasScrolledToBottom(true);
    }
  };

  const handleViewPrivacyPolicy = () => {
    router.push('/privacy');
  };

  const handleViewTerms = () => {
    router.push('/terms');
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} className="max-w-md mx-auto">
      <Card className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <Shield className="w-12 h-12 mx-auto text-blue-600" />
          <Typography variant="h3" className="text-center">
            Welcome to WorldHuman Studio
          </Typography>
          <Typography variant="body2" className="text-gray-600">
            We respect your privacy and want to be transparent about how we handle your data.
          </Typography>
        </div>

        {/* Scrollable Content */}
        <div
          className="max-h-64 overflow-y-auto border rounded-lg p-4 space-y-4"
          onScroll={handleScroll}
        >
          <div className="space-y-4">
            <div>
              <Typography variant="h4" className="mb-2 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Data We Collect
              </Typography>
              <Typography variant="body2" className="text-gray-600 ml-6">
                • World ID verification data (anonymized)
                • Username and wallet address
                • Task submissions and annotations
                • Basic usage analytics
              </Typography>
            </div>

            <div>
              <Typography variant="h4" className="mb-2 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                How We Use It
              </Typography>
              <Typography variant="body2" className="text-gray-600 ml-6">
                • Provide task assignments and process payments
                • Ensure data quality and prevent abuse
                • Improve our AI training platform
                • Communicate important updates
              </Typography>
            </div>

            <div>
              <Typography variant="h4" className="mb-2 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Your Rights
              </Typography>
              <Typography variant="body2" className="text-gray-600 ml-6">
                • Access, correct, or delete your data
                • Download your data (data portability)
                • Withdraw consent at any time
                • Contact us with privacy concerns
              </Typography>
            </div>

            <div>
              <Typography variant="h4" className="mb-2 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Data Minimization
              </Typography>
              <Typography variant="body2" className="text-gray-600 ml-6">
                We only collect data necessary for platform functionality and follow strict data minimization principles.
              </Typography>
            </div>

            <div>
              <Typography variant="h4" className="mb-2 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Third-Party Services
              </Typography>
              <Typography variant="body2" className="text-gray-600 ml-6">
                • World App (identity verification)
                • Vercel (secure hosting)
                • Blockchain networks (payment processing)
              </Typography>
            </div>

            <div className="pt-4 border-t">
              <Typography variant="body2" className="text-gray-500 text-center">
                By continuing, you agree to our data practices as described above.
              </Typography>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Policy Links */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewPrivacyPolicy}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Privacy Policy
              <ExternalLink className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewTerms}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Terms of Service
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>

          {/* Scroll indicator */}
          {!hasScrolledToBottom && (
            <Typography variant="body2" className="text-center text-gray-500">
              Please scroll to review all information above
            </Typography>
          )}

          {/* Main action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onDecline}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Decline
            </Button>
            <Button
              onClick={onAccept}
              disabled={!hasScrolledToBottom}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Accept & Continue
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 border-t">
          <Typography variant="body2" className="text-gray-500">
            Questions? Contact us at{' '}
            <a
              href="mailto:support@worldhuman.studio"
              className="text-blue-600 underline"
            >
              support@worldhuman.studio
            </a>
          </Typography>
        </div>
      </Card>
    </Modal>
  );
}

// Hook for managing consent state
export function useConsentManager() {
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);
  const [showConsentDialog, setShowConsentDialog] = useState(false);

  useEffect(() => {
    // In development mode, auto-accept consent for better DX
    if (process.env.NODE_ENV === 'development') {
      setConsentGiven(true);
      setShowConsentDialog(false);

      // Store auto-consent for development
      const consentData = {
        accepted: true,
        timestamp: new Date().toISOString(),
        version: '1.0',
        auto: true // Mark as auto-accepted in dev
      };
      localStorage.setItem('worldhuman-consent', JSON.stringify(consentData));
      return;
    }

    // Check if consent has been given before
    const storedConsent = localStorage.getItem('worldhuman-consent');
    const consentData = storedConsent ? JSON.parse(storedConsent) : null;

    if (consentData) {
      if (consentData.accepted) {
        // Check if consent is still valid (not older than 1 year)
        const consentDate = new Date(consentData.timestamp);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        if (consentDate > oneYearAgo) {
          setConsentGiven(true);
          setShowConsentDialog(false);
        } else {
          // Consent expired, ask again
          setConsentGiven(null);
          setShowConsentDialog(true);
        }
      } else {
        // Consent was explicitly declined
        setConsentGiven(false);
        setShowConsentDialog(false);
      }
    } else {
      // No consent found, keep null state and show dialog
      setConsentGiven(null);
      setShowConsentDialog(true);
    }
  }, []);

  const handleAcceptConsent = () => {
    const consentData = {
      accepted: true,
      timestamp: new Date().toISOString(),
      version: '1.0' // Track consent version for future policy changes
    };

    localStorage.setItem('worldhuman-consent', JSON.stringify(consentData));
    setConsentGiven(true);
    setShowConsentDialog(false);

    // Track consent acceptance (anonymized)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'consent_given', {
        event_category: 'privacy',
        event_label: 'privacy_consent_accepted'
      });
    }
  };

  const handleDeclineConsent = () => {
    // Store decline decision
    const consentData = {
      accepted: false,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    localStorage.setItem('worldhuman-consent', JSON.stringify(consentData));
    setConsentGiven(false);
    setShowConsentDialog(false);

    // Track consent decline (anonymized)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'consent_declined', {
        event_category: 'privacy',
        event_label: 'privacy_consent_declined'
      });
    }

    // Show message about limited functionality
    alert('Without consent, you cannot use WorldHuman Studio. You can change your mind anytime by clearing your browser data and visiting again.');
  };

  const revokeConsent = () => {
    localStorage.removeItem('worldhuman-consent');
    setConsentGiven(null);
    setShowConsentDialog(true);
  };

  return {
    consentGiven,
    showConsentDialog,
    handleAcceptConsent,
    handleDeclineConsent,
    revokeConsent
  };
}