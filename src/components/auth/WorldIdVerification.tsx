/**
 * World ID Verification Component for WorldHuman Studio
 * Integrates with MiniKit and provides sybil-resistant authentication
 */

'use client';

import React, { useState, useCallback } from 'react';
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { Shield, CheckCircle, AlertCircle, Globe } from 'lucide-react';

import { useAuth, useUI } from '@/stores';
import { Button, Card, Badge, LoadingSpinner } from '@/components/ui';
import { cn } from '@/lib/utils';
import { WorldIdVerification } from '@/types';

interface WorldIdVerificationProps {
  action?: string;
  onSuccess?: (verification: WorldIdVerification) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const WorldIdVerificationComponent: React.FC<WorldIdVerificationProps> = ({
  action = 'verify-human',
  onSuccess,
  onError,
  className,
}) => {
  const { isInstalled } = useMiniKit();
  const { user, setError } = useAuth();
  const { addNotification } = useUI();

  const [verificationState, setVerificationState] = useState<{
    level: VerificationLevel | null;
    status: 'idle' | 'pending' | 'success' | 'failed';
    error?: string;
  }>({
    level: null,
    status: 'idle',
  });

  const handleVerification = useCallback(async (level: VerificationLevel) => {
    if (!isInstalled) {
      const errorMsg = 'World App is required for verification';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setVerificationState({
      level,
      status: 'pending',
    });

    try {
      // Request verification from World ID
      const result = await MiniKit.commandsAsync.verify({
        action,
        verification_level: level,
      });

      if (!result.finalPayload) {
        throw new Error('Verification was cancelled or failed');
      }

      // Verify the proof on the server
      const response = await fetch('/api/verify-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: result.finalPayload,
          action,
          verification_level: level,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Verification failed');
      }

      // Successful verification
      const verification: WorldIdVerification = {
        nullifier_hash: result.finalPayload.nullifier_hash,
        merkle_root: result.finalPayload.merkle_root,
        proof: result.finalPayload.proof,
        verification_level: level === VerificationLevel.Orb ? 'orb' : 'device',
      };

      setVerificationState({
        level,
        status: 'success',
      });

      addNotification({
        type: 'success',
        title: 'Verification Successful',
        message: `You have been verified with ${level === VerificationLevel.Orb ? 'Orb' : 'Device'} level.`,
      });

      onSuccess?.(verification);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Verification failed';

      setVerificationState({
        level,
        status: 'failed',
        error: errorMsg,
      });

      setError(errorMsg);
      onError?.(errorMsg);

      addNotification({
        type: 'error',
        title: 'Verification Failed',
        message: errorMsg,
      });

      // Reset state after 3 seconds
      setTimeout(() => {
        setVerificationState({ level: null, status: 'idle' });
      }, 3000);
    }
  }, [isInstalled, action, onSuccess, onError, setError, addNotification]);

  const getVerificationIcon = (level: VerificationLevel, status: string) => {
    if (status === 'pending' && verificationState.level === level) {
      return <LoadingSpinner size="sm" color="white" />;
    }
    if (status === 'success' && verificationState.level === level) {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
    if (status === 'failed' && verificationState.level === level) {
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
    return level === VerificationLevel.Orb ?
      <Shield className="w-4 h-4" /> :
      <Globe className="w-4 h-4" />;
  };

  const getButtonVariant = (level: VerificationLevel) => {
    const { status } = verificationState;
    if (status === 'success' && verificationState.level === level) return 'success';
    if (status === 'failed' && verificationState.level === level) return 'destructive';
    return level === VerificationLevel.Orb ? 'primary' : 'secondary';
  };

  const isVerified = user?.verification_level;
  const isLoading = verificationState.status === 'pending';

  return (
    <Card className={cn('max-w-md', className)} variant="elevated">
      <Card.Header
        title="World ID Verification"
        subtitle="Prove you're a unique human to access WorldHuman Studio"
      />

      <Card.Content>
        {isVerified ? (
          <div className="flex items-center space-x-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-white font-medium">Already Verified</p>
              <p className="text-white/60 text-sm">
                Verification level: {' '}
                <Badge
                  variant={user.verification_level === 'orb' ? 'primary' : 'info'}
                  size="sm"
                >
                  {user.verification_level === 'orb' ? 'Orb' : 'Device'}
                </Badge>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-[rgb(25,137,251)] mt-0.5" />
                <div>
                  <h4 className="text-white font-medium mb-1">Why verify?</h4>
                  <p className="text-white/70 text-sm">
                    World ID prevents bots and ensures fair task distribution by proving you're a unique human without revealing your identity.
                  </p>
                </div>
              </div>
            </div>

            {!isInstalled && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 font-medium">World App Required</p>
                    <p className="text-white/70 text-sm mt-1">
                      Please open this in World App to complete verification.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {/* Device Verification */}
              <Button
                fullWidth
                size="lg"
                variant={getButtonVariant(VerificationLevel.Device)}
                disabled={!isInstalled || isLoading}
                loading={isLoading && verificationState.level === VerificationLevel.Device}
                leftIcon={getVerificationIcon(VerificationLevel.Device, verificationState.status)}
                onClick={() => handleVerification(VerificationLevel.Device)}
              >
                {verificationState.status === 'success' && verificationState.level === VerificationLevel.Device
                  ? 'Verified with Device'
                  : 'Verify with Device'
                }
              </Button>

              {/* Orb Verification */}
              <Button
                fullWidth
                size="lg"
                variant={getButtonVariant(VerificationLevel.Orb)}
                disabled={!isInstalled || isLoading}
                loading={isLoading && verificationState.level === VerificationLevel.Orb}
                leftIcon={getVerificationIcon(VerificationLevel.Orb, verificationState.status)}
                onClick={() => handleVerification(VerificationLevel.Orb)}
              >
                {verificationState.status === 'success' && verificationState.level === VerificationLevel.Orb
                  ? 'Verified with Orb'
                  : 'Verify with Orb'
                }
              </Button>

              <div className="text-center">
                <p className="text-white/50 text-xs">
                  Orb verification provides the highest trust level
                </p>
              </div>
            </div>
          </div>
        )}

        {verificationState.error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{verificationState.error}</p>
          </div>
        )}
      </Card.Content>
    </Card>
  );
};

export default WorldIdVerificationComponent;