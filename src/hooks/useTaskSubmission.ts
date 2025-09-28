/**
 * Custom hook for task submission operations
 * Handles submission creation, World ID verification, and state management
 */

'use client';

import { useState, useCallback } from 'react';
import { SubmissionData } from '@/types';
import { useUI } from '@/stores';

interface SubmissionPayload extends SubmissionData {
  world_id_proof?: any; // World ID proof data
}

interface SubmissionResponse {
  success: boolean;
  submission?: {
    id: string;
    task_id: string;
    status: string;
    time_spent_minutes?: number;
    created_at: string;
    quality_score?: number;
    reward_amount?: number;
    reward_currency?: string;
  };
  reward?: {
    amount: number;
    currency: string;
    status: string;
  };
  message?: string;
  error?: string;
}

interface UseTaskSubmissionReturn {
  isSubmitting: boolean;
  submissionError: string | null;
  submitTask: (taskId: string, submissionData: SubmissionPayload) => Promise<SubmissionResponse>;
  clearError: () => void;
}

export function useTaskSubmission(): UseTaskSubmissionReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const { addNotification } = useUI();

  /**
   * Clear submission error
   */
  const clearError = useCallback(() => {
    setSubmissionError(null);
  }, []);

  /**
   * Get World ID proof if needed (placeholder for MiniKit integration)
   */
  const getWorldIdProof = useCallback(async (action: string, signal: string) => {
    // TODO: Implement World ID proof generation using MiniKit
    // This would integrate with @worldcoin/minikit-js for verification

    try {
      // Placeholder for MiniKit World ID verification
      // In a real implementation, this would call:
      // const proof = await verifyAction({ action, signal });

      console.log('World ID verification would be triggered here', { action, signal });

      // For now, return null - verification will be handled by the API
      return null;
    } catch (error) {
      console.error('World ID verification failed:', error);
      throw new Error('World ID verification failed');
    }
  }, []);

  /**
   * Submit task with data and optional verification
   */
  const submitTask = useCallback(async (
    taskId: string,
    submissionData: SubmissionPayload
  ): Promise<SubmissionResponse> => {
    try {
      setIsSubmitting(true);
      setSubmissionError(null);

      // Validate required fields
      if (!taskId) {
        throw new Error('Task ID is required');
      }

      if (!submissionData.submission_data) {
        throw new Error('Submission data is required');
      }

      // Prepare submission payload
      const payload: SubmissionPayload = {
        submission_data: submissionData.submission_data,
        time_spent_minutes: submissionData.time_spent_minutes,
        attachments_urls: submissionData.attachments_urls || []
      };

      // If World ID proof is provided, include it
      if (submissionData.world_id_proof) {
        payload.world_id_proof = submissionData.world_id_proof;
      }

      // Submit to API
      const response = await fetch(`/api/tasks/${taskId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!responseData.success) {
        throw new Error(responseData.error || 'Submission failed');
      }

      // If reward is credited in demo mode, update localStorage
      if (responseData.reward && responseData.reward.status === 'credited') {
        const currentEarnings = parseFloat(localStorage.getItem('demo_total_earned') || '0');
        const newEarnings = currentEarnings + responseData.reward.amount;
        localStorage.setItem('demo_total_earned', newEarnings.toString());

        const currentCount = parseInt(localStorage.getItem('demo_submission_count') || '0');
        localStorage.setItem('demo_submission_count', (currentCount + 1).toString());

        console.log(`💰 Reward credited: ${responseData.reward.amount} ${responseData.reward.currency}`);
        console.log(`💰 Total earnings: ${newEarnings}`);

        // Show success notification with reward details
        addNotification({
          id: `submission-success-${Date.now()}`,
          type: 'success',
          title: 'Task Completed! 🎉',
          message: `Great work! You earned ${responseData.reward.amount.toFixed(2)} ${responseData.reward.currency}. Your reward has been credited.`,
          timestamp: new Date(),
          duration: 5000
        });
      }

      return {
        success: true,
        submission: responseData.submission,
        reward: responseData.reward,
        message: responseData.message
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setSubmissionError(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  /**
   * Submit task with automatic World ID verification if required
   */
  const submitTaskWithVerification = useCallback(async (
    taskId: string,
    submissionData: SubmissionData,
    requiresVerification: boolean = false
  ): Promise<SubmissionResponse> => {
    try {
      let payload: SubmissionPayload = { ...submissionData };

      // If verification is required, get World ID proof
      if (requiresVerification) {
        try {
          const proof = await getWorldIdProof('submit_task', `task_${taskId}`);
          if (proof) {
            payload.world_id_proof = proof;
          }
        } catch (verificationError) {
          return {
            success: false,
            error: verificationError instanceof Error ? verificationError.message : 'Verification failed'
          };
        }
      }

      return await submitTask(taskId, payload);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Submission failed'
      };
    }
  }, [submitTask, getWorldIdProof]);

  return {
    isSubmitting,
    submissionError,
    submitTask,
    clearError
  };
}

/**
 * Hook for getting submission history for a specific task
 */
export function useTaskSubmissionHistory(taskId: string | null) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    if (!taskId) {
      setSubmissions([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tasks/${taskId}/submit`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch submissions');
      }

      // Handle both single submission and multiple submissions responses
      if (data.submission) {
        setSubmissions([data.submission]);
      } else if (data.submissions) {
        setSubmissions(data.submissions);
      } else {
        setSubmissions([]);
      }

    } catch (err) {
      console.error('Failed to fetch submissions:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  return {
    submissions,
    loading,
    error,
    refetch: fetchSubmissions
  };
}