/**
 * Custom hook for submission review functionality
 * Handles approval/rejection workflow and batch operations
 */

'use client';

import { useState, useCallback } from 'react';
import {
  ReviewSubmissionRequest,
  BatchReviewRequest,
  UseSubmissionReviewReturn
} from '@/lib/types/submissions';

export function useSubmissionReview(): UseSubmissionReviewReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review individual submission
  const reviewSubmission = useCallback(async (
    submissionId: string,
    review: ReviewSubmissionRequest
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/submissions/${submissionId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(review),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Review failed');
      }

      return { success: true };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Batch review multiple submissions
  const batchReview = useCallback(async (
    request: BatchReviewRequest
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/submissions/batch-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(request),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Batch review failed');
      }

      return { success: true };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    reviewSubmission,
    batchReview,
    loading,
    error
  };
}

// Hook for review dashboard functionality
export function useReviewDashboard() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);

  const fetchPendingSubmissions = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        status: 'pending',
        sort: 'created_at',
        order: 'asc',
        limit: '50',
        ...filters
      } as Record<string, string>);

      const response = await fetch(`/api/admin/submissions?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setSubmissions(result.data.submissions || []);
      } else {
        throw new Error(result.error || 'Failed to fetch submissions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleSubmissionSelection = useCallback((submissionId: string) => {
    setSelectedSubmissions(prev =>
      prev.includes(submissionId)
        ? prev.filter(id => id !== submissionId)
        : [...prev, submissionId]
    );
  }, []);

  const selectAllSubmissions = useCallback((select: boolean) => {
    setSelectedSubmissions(select ? submissions.map(s => s.id) : []);
  }, [submissions]);

  const clearSelection = useCallback(() => {
    setSelectedSubmissions([]);
  }, []);

  return {
    submissions,
    loading,
    error,
    selectedSubmissions,
    fetchPendingSubmissions,
    toggleSubmissionSelection,
    selectAllSubmissions,
    clearSelection,
    refetch: fetchPendingSubmissions
  };
}

// Hook for quick review actions with optimistic updates
export function useQuickReview() {
  const { reviewSubmission } = useSubmissionReview();

  const approveSubmission = useCallback(async (
    submissionId: string,
    qualityScore?: number,
    notes?: string
  ) => {
    return await reviewSubmission(submissionId, {
      status: 'approved',
      quality_score: qualityScore,
      review_notes: notes
    });
  }, [reviewSubmission]);

  const rejectSubmission = useCallback(async (
    submissionId: string,
    reason: string
  ) => {
    return await reviewSubmission(submissionId, {
      status: 'rejected',
      review_notes: reason
    });
  }, [reviewSubmission]);

  return {
    approveSubmission,
    rejectSubmission
  };
}

// Hook for submission assignment to reviewers
export function useSubmissionAssignment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignReviewer = useCallback(async (
    submissionIds: string[],
    reviewerId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/submissions/assign-reviewer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          submission_ids: submissionIds,
          reviewer_id: reviewerId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Assignment failed');
      }

      return { success: true };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const unassignReviewer = useCallback(async (
    submissionIds: string[]
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/submissions/unassign-reviewer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          submission_ids: submissionIds
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Unassignment failed');
      }

      return { success: true };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    assignReviewer,
    unassignReviewer,
    loading,
    error
  };
}