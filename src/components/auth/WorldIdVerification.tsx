/**
 * World ID Verification Component for WorldHuman Studio
 * Integrates with MiniKit and provides sybil-resistant authentication
 * Uses World App UI Kit components for consistent design
 */

'use client';

import React, { useState, useCallback } from 'react';
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { Shield, CheckCircle, AlertCircle, Globe } from 'lucide-react';

import {
  Button,
  Typography,
  CircularState,
  ListItem,
  Spinner,
  useToast,
  Badge,
} from '@worldcoin/mini-apps-ui-kit-react';

import { useAuth } from '@/stores';
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
  const { toast } = useToast();

  const [verificationState, setVerificationState] = useState<{
    level: VerificationLevel | null;
    status: 'idle' | 'pending' | 'success' | 'failed';
    error?: string;
  }>({
    level: null,
    status: 'idle',
  });

  const handleVerification = useCallback(async (level: VerificationLevel) => {
    // Development mode bypass
    if (process.env.NODE_ENV === 'development' && !isInstalled) {
      console.log('Development mode: Simulating World ID verification');

      setVerificationState({
        level,
        status: 'pending',
      });

      // Simulate verification success
      const mockVerification: WorldIdVerification = {
        nullifier_hash: '0x' + Math.random().toString(16).substring(2, 66),
        merkle_root: '0x' + Math.random().toString(16).substring(2, 66),
        proof: '0x' + Math.random().toString(16).substring(2, 130),
        verification_level: level === VerificationLevel.Orb ? 'orb' : 'device',
      };

      // Simulate async delay
      setTimeout(() => {
        setVerificationState({
          level,
          status: 'success',
        });

        // TODO: Fix toast implementation
        console.log(`Verification Successful: You've been verified with ${level === VerificationLevel.Orb ? 'Orb' : 'Device'}!`);

        onSuccess?.(mockVerification);
      }, 1500);

      return;
    }

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

      // TODO: Fix toast implementation
      console.log(`Verification Successful: You have been verified with ${level === VerificationLevel.Orb ? 'Orb' : 'Device'} level.`);

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

      // TODO: Fix toast implementation
      console.log(`Verification Failed: ${errorMsg}`);

      // Reset state after 3 seconds
      setTimeout(() => {
        setVerificationState({ level: null, status: 'idle' });
      }, 3000);
    }
  }, [isInstalled, action, onSuccess, onError, setError]);

  const isVerified = user?.verification_level;
  const isLoading = verificationState.status === 'pending';

  return (
    <div className={`bg-white/5 border border-white/10 rounded-2xl p-6 ${className || ''}`}>
      <Typography variant="h3" className="text-white mb-2">
        World ID Verification
      </Typography>
      <Typography variant="body2" className="text-white/70 mb-4">
        Prove you're a unique human to access WorldHuman Studio
      </Typography>

      {isVerified ? (
        <div className="flex items-center space-x-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <div>
            <Typography variant="body2" className="text-white font-medium">
              Already Verified
            </Typography>
            <Typography variant="caption" className="text-white/60">
              Verification level: {user.verification_level === 'orb' ? 'Orb' : 'Device'}
            </Typography>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <ListItem
              icon={<Shield className="w-5 h-5 text-[rgb(25,137,251)]" />}
              title="Why verify?"
              subtitle="World ID prevents bots and ensures fair task distribution by proving you're a unique human without revealing your identity."
            />
          </div>

          {!isInstalled && process.env.NODE_ENV === 'development' ? (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <ListItem
                icon={<AlertCircle className="w-5 h-5 text-blue-400" />}
                title="Development Mode"
                subtitle="Click below to simulate World ID verification."
              />
            </div>
          ) : !isInstalled ? (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <ListItem
                icon={<AlertCircle className="w-5 h-5 text-yellow-400" />}
                title="World App Required"
                subtitle="Please open this in World App to complete verification."
              />
            </div>
          ) : null}

          <div className="space-y-3">
            {/* Device Verification */}
            <Button
              variant={verificationState.status === 'success' && verificationState.level === VerificationLevel.Device ? 'success' : 'secondary'}
              size="large"
              disabled={((!isInstalled && process.env.NODE_ENV !== 'development') || isLoading)}
              onClick={() => handleVerification(VerificationLevel.Device)}
              className="w-full"
            >
              {isLoading && verificationState.level === VerificationLevel.Device ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Verifying...
                </>
              ) : verificationState.status === 'success' && verificationState.level === VerificationLevel.Device ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                  Verified with Device
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Verify with Device
                </>
              )}
            </Button>

            {/* Orb Verification */}
            <Button
              variant={verificationState.status === 'success' && verificationState.level === VerificationLevel.Orb ? 'success' : 'primary'}
              size="large"
              disabled={((!isInstalled && process.env.NODE_ENV !== 'development') || isLoading)}
              onClick={() => handleVerification(VerificationLevel.Orb)}
              className="w-full"
            >
              {isLoading && verificationState.level === VerificationLevel.Orb ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Verifying...
                </>
              ) : verificationState.status === 'success' && verificationState.level === VerificationLevel.Orb ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                  Verified with Orb
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Verify with Orb
                </>
              )}
            </Button>

            <div className="text-center">
              <Typography variant="caption" className="text-white/50">
                Orb verification provides the highest trust level
              </Typography>
            </div>
          </div>
        </div>
      )}

      {verificationState.error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <Typography variant="caption" className="text-red-400">
            {verificationState.error}
          </Typography>
        </div>
      )}
    </div>
  );
};

export default WorldIdVerificationComponent;