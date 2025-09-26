/**
 * Authentication flow component using World App UI Kit
 * Handles wallet authentication and World ID verification
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { walletAuth } from '@/auth/wallet';

import {
  Button,
  Typography,
  CircularState,
  ListItem,
  Spinner,
  useToast,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@worldcoin/mini-apps-ui-kit-react';

import { useAuth } from '@/stores';
import WorldIdVerificationComponent from './WorldIdVerification';
import { User, WorldIdVerification } from '@/types';
import { Wallet, Shield, CheckCircle } from 'lucide-react';

interface AuthFlowProps {
  onComplete?: (user: User) => void;
}

type AuthStep = 'wallet' | 'verification' | 'complete';

export const AuthFlowUIKit: React.FC<AuthFlowProps> = ({ onComplete }) => {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { isInstalled } = useMiniKit();
  const { user, isAuthenticated, isLoading, login, setLoading, setError } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<AuthStep>('wallet');
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [manualStepOverride, setManualStepOverride] = useState(false);

  // Determine current step based on session and user state
  useEffect(() => {
    // Don't auto-update step if we've manually set it (e.g., after wallet connection)
    if (sessionStatus === 'loading' || manualStepOverride) return;

    if (!session) {
      setCurrentStep('wallet');
    } else if (session.user && (!user?.verification_level)) {
      setCurrentStep('verification');
    } else if (isAuthenticated && user?.verification_level) {
      setCurrentStep('complete');
      if (onComplete) {
        onComplete(user);
      } else {
        router.push('/dashboard');
      }
    }
  }, [session, sessionStatus, user, isAuthenticated, onComplete, router, manualStepOverride]);

  const handleWalletAuth = useCallback(async () => {
    // Allow in development mode or when installed in World App
    const isDev = process.env.NODE_ENV === 'development';
    if ((!isInstalled && !isDev) || walletConnecting) return;

    setWalletConnecting(true);
    setLoading(true);

    try {
      const result = await walletAuth();

      if (result.ok) {
        // TODO: Fix toast implementation
        console.log('Wallet connected successfully');

        // In dev mode, skip to verification or complete
        if (isDev) {
          // Mock a user session
          const mockUser = {
            id: '123',
            username: 'dev_user',
            wallet_address: result.payload.address,
            verification_level: null,
          };
          login(mockUser);
        }

        // Set manual override to prevent useEffect from resetting the step
        setManualStepOverride(true);
        setCurrentStep('verification');
        console.log('Setting step to verification');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to connect wallet';
      setErrorMessage(errorMsg);
      setShowError(true);
      setError(errorMsg);
    } finally {
      setWalletConnecting(false);
      setLoading(false);
    }
  }, [isInstalled, walletConnecting, setLoading, setError, login]);

  const handleVerificationSuccess = useCallback(async (verification: WorldIdVerification) => {
    try {
      setLoading(true);

      // In development mode, skip the API call and use mock data
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Skipping API verification');

        // Update the mock user with verification data
        const updatedUser = {
          ...user,
          id: user?.id || '123',
          username: user?.username || 'dev_user',
          wallet_address: user?.wallet_address || '0x' + Math.random().toString(16).substring(2, 42),
          verification_level: verification.verification_level,
        };

        login(updatedUser);
        console.log('Verification complete!');
        setCurrentStep('complete');
        onComplete?.(updatedUser);

      } else {
        // Production mode - make actual API call
        const response = await fetch('/api/verify-proof', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            payload: verification,
            action: 'worldhuman-studio-verify',
            signal: undefined,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Verification failed');
        }

        const updatedUser = await response.json();
        login(updatedUser.user);
        console.log('Verification complete!');
        setCurrentStep('complete');
        onComplete?.(updatedUser.user);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to complete verification';
      setErrorMessage(errorMsg);
      setShowError(true);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, login, user, onComplete]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'wallet':
        return (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <Typography variant="h3" className="text-white mb-2">
              Connect Your Wallet
            </Typography>
            <Typography variant="body2" className="text-white/70 mb-6">
              Connect your World App wallet to get started with WorldHuman Studio
            </Typography>

            <ListItem
              icon={<Wallet className="w-5 h-5 text-[rgb(25,137,251)]" />}
              title="Secure & Private"
              subtitle="Your wallet stays in your control"
              className="mb-6"
            />

            {!isInstalled && process.env.NODE_ENV === 'production' && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                <Typography variant="body2" className="text-yellow-400 font-medium">
                  World App Required
                </Typography>
                <Typography variant="caption" className="text-white/70">
                  Please open this in World App to connect your wallet.
                </Typography>
              </div>
            )}

            {!isInstalled && process.env.NODE_ENV === 'development' && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                <Typography variant="body2" className="text-blue-400 font-medium">
                  Development Mode
                </Typography>
                <Typography variant="caption" className="text-white/70">
                  Testing without World App. Mock authentication will be used.
                </Typography>
              </div>
            )}

            <Button
              variant="primary"
              size="large"
              disabled={((!isInstalled && process.env.NODE_ENV === 'production') || walletConnecting || sessionStatus === 'loading')}
              onClick={handleWalletAuth}
              className="w-full"
            >
              {(walletConnecting || sessionStatus === 'loading') ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect World App Wallet
                </>
              )}
            </Button>
          </div>
        );

      case 'verification':
        return (
          <WorldIdVerificationComponent
            action="worldhuman-studio-verify"
            onSuccess={handleVerificationSuccess}
            onError={(error) => {
              setErrorMessage(error);
              setShowError(true);
            }}
          />
        );

      case 'complete':
        return (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="text-center">
              <CircularState
                variant="success"
                className="mx-auto mb-6"
              />

              <Typography variant="h3" className="text-white mb-2">
                Welcome to WorldHuman Studio!
              </Typography>
              <Typography variant="body2" className="text-white/70 mb-6">
                You're all set up and ready to start earning by completing human intelligence tasks.
              </Typography>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <ListItem
                  icon={<Shield className="w-5 h-5 text-green-400" />}
                  title={user?.username || 'User'}
                  subtitle={user?.verification_level === 'orb' ? 'Orb Verified' : 'Device Verified'}
                />
              </div>

              <Button
                variant="primary"
                size="large"
                onClick={() => router.push('/dashboard')}
                className="w-full mt-6"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <div className="w-full max-w-md mx-auto">
        {renderStepContent()}
      </div>

      <AlertDialog open={showError} onOpenChange={setShowError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Authentication Error</AlertDialogTitle>
            <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="primary" onClick={() => setShowError(false)}>
              Try Again
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AuthFlowUIKit;