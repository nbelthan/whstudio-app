/**
 * Complete authentication flow component for WorldHuman Studio
 * Handles wallet authentication and World ID verification
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { walletAuth } from '@/auth/wallet';

import { useAuth, useUI } from '@/stores';
import { Button, Card, LoadingSpinner, Modal } from '@/components/ui';
import WorldIdVerificationComponent from './WorldIdVerification';
import { User, WorldIdVerification } from '@/types';
import { cn } from '@/lib/utils';
import { Wallet, Shield, CheckCircle, ArrowRight } from 'lucide-react';

interface AuthFlowProps {
  onComplete?: (user: User) => void;
  className?: string;
  showModal?: boolean;
  onCloseModal?: () => void;
}

type AuthStep = 'wallet' | 'verification' | 'complete';

export const AuthFlow: React.FC<AuthFlowProps> = ({
  onComplete,
  className,
  showModal = false,
  onCloseModal,
}) => {
  const { data: session, status: sessionStatus } = useSession();
  const { isInstalled } = useMiniKit();
  const { user, isAuthenticated, isLoading, login, setLoading, setError } = useAuth();
  const { addNotification } = useUI();

  const [currentStep, setCurrentStep] = useState<AuthStep>('wallet');
  const [walletConnecting, setWalletConnecting] = useState(false);

  // Determine current step based on session and user state
  useEffect(() => {
    if (sessionStatus === 'loading') return;

    if (!session) {
      setCurrentStep('wallet');
    } else if (session.user && (!user?.verification_level)) {
      setCurrentStep('verification');
    } else if (isAuthenticated && user?.verification_level) {
      setCurrentStep('complete');
      onComplete?.(user);
    }
  }, [session, sessionStatus, user, isAuthenticated, onComplete]);

  const handleWalletAuth = useCallback(async () => {
    if (!isInstalled || walletConnecting) return;

    setWalletConnecting(true);
    setLoading(true);

    try {
      await walletAuth();

      addNotification({
        type: 'success',
        title: 'Wallet Connected',
        message: 'Successfully connected your World App wallet',
      });

      // The session will be updated automatically, triggering the step change
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to connect wallet';
      setError(errorMsg);

      addNotification({
        type: 'error',
        title: 'Connection Failed',
        message: errorMsg,
      });
    } finally {
      setWalletConnecting(false);
      setLoading(false);
    }
  }, [isInstalled, walletConnecting, setLoading, setError, addNotification]);

  const handleVerificationSuccess = useCallback(async (verification: WorldIdVerification) => {
    try {
      setLoading(true);

      // Update user with verification data
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nullifier_hash: verification.nullifier_hash,
          verification_level: verification.verification_level,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update verification status');
      }

      const updatedUser = await response.json();
      login(updatedUser.user);

      addNotification({
        type: 'success',
        title: 'Verification Complete',
        message: 'You can now access all WorldHuman Studio features',
      });

      setCurrentStep('complete');
      onComplete?.(updatedUser.user);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to complete verification';
      setError(errorMsg);

      addNotification({
        type: 'error',
        title: 'Verification Error',
        message: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, login, addNotification, onComplete]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'wallet':
        return (
          <Card variant="elevated" className="max-w-md">
            <Card.Header
              title="Connect Your Wallet"
              subtitle="Connect your World App wallet to get started with WorldHuman Studio"
            />
            <Card.Content>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-white/5 border border-white/10 rounded-lg">
                  <Wallet className="w-5 h-5 text-[rgb(25,137,251)]" />
                  <div>
                    <h4 className="text-white font-medium">Secure & Private</h4>
                    <p className="text-white/70 text-sm">
                      Your wallet stays in your control. We only access public information.
                    </p>
                  </div>
                </div>

                {!isInstalled && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <p className="text-yellow-400 font-medium">World App Required</p>
                    <p className="text-white/70 text-sm mt-1">
                      Please open this in World App to connect your wallet.
                    </p>
                  </div>
                )}

                <Button
                  fullWidth
                  size="lg"
                  disabled={!isInstalled || walletConnecting || sessionStatus === 'loading'}
                  loading={walletConnecting || sessionStatus === 'loading'}
                  leftIcon={<Wallet className="w-4 h-4" />}
                  onClick={handleWalletAuth}
                >
                  Connect World App Wallet
                </Button>
              </div>
            </Card.Content>
          </Card>
        );

      case 'verification':
        return (
          <WorldIdVerificationComponent
            action="worldhuman-studio-verify"
            onSuccess={handleVerificationSuccess}
            onError={(error) => setError(error)}
          />
        );

      case 'complete':
        return (
          <Card variant="elevated" className="max-w-md">
            <Card.Content>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">
                    Welcome to WorldHuman Studio!
                  </h2>
                  <p className="text-white/70">
                    You're all set up and ready to start earning by completing human intelligence tasks.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-white font-medium">{user?.username || 'User'}</p>
                      <p className="text-white/60 text-sm">
                        {user?.verification_level === 'orb' ? 'Orb Verified' : 'Device Verified'}
                      </p>
                    </div>
                    <Shield className="w-5 h-5 text-[rgb(25,137,251)]" />
                  </div>
                </div>

                <Button
                  fullWidth
                  size="lg"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => {
                    onCloseModal?.();
                    window.location.href = '/dashboard';
                  }}
                >
                  Go to Dashboard
                </Button>
              </div>
            </Card.Content>
          </Card>
        );

      default:
        return null;
    }
  };

  const content = (
    <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
      {sessionStatus === 'loading' ? (
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" color="primary" />
          <p className="text-white/80">Checking authentication status...</p>
        </div>
      ) : (
        renderStepContent()
      )}
    </div>
  );

  if (showModal) {
    return (
      <Modal
        isOpen={showModal}
        onClose={onCloseModal || (() => {})}
        size="md"
        closeOnBackdrop={currentStep === 'complete'}
        preventClose={currentStep !== 'complete'}
      >
        {content}
      </Modal>
    );
  }

  return content;
};

export default AuthFlow;