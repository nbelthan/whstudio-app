/**
 * Custom hook for fetching and managing user submissions
 * Provides comprehensive submission management with filtering, pagination, and real-time updates
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SubmissionFilters,
  SubmissionWithTask,
  SubmissionStats,
  PaginatedSubmissions,
  UseSubmissionsReturn
} from '@/lib/types/submissions';

const DEFAULT_FILTERS: SubmissionFilters = {
  status: 'all',
  sort: 'created_at',
  order: 'desc',
  limit: 20,
  offset: 0
};

export function useSubmissions(initialFilters: Partial<SubmissionFilters> = {}): UseSubmissionsReturn {
  const [submissions, setSubmissions] = useState<SubmissionWithTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SubmissionStats | null>(null);
  const [pagination, setPagination] = useState<PaginatedSubmissions['pagination'] | null>(null);
  const [filters, setFilters] = useState<SubmissionFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters
  });

  // Memoized query parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    return params.toString();
  }, [filters]);

  // Fetch submissions
  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get demo data from localStorage if available
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add demo data headers if in demo mode
      if (typeof window !== 'undefined') {
        const submissionCount = localStorage.getItem('demo_submission_count');
        const totalEarned = localStorage.getItem('demo_total_earned');
        const storedSubmissions = localStorage.getItem('demo_submissions');

        if (submissionCount) {
          headers['x-demo-submission-count'] = submissionCount;
        }
        if (totalEarned) {
          headers['x-demo-total-earned'] = totalEarned;
        }
        if (storedSubmissions) {
          headers['x-demo-submissions'] = encodeURIComponent(storedSubmissions);
        }
      }

      const response = await fetch(`/api/submissions?${queryParams}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch submissions');
      }

      const data: PaginatedSubmissions = result.data;

      // If this is a new page (offset > 0), append to existing submissions
      if (filters.offset && filters.offset > 0) {
        setSubmissions(prev => [...prev, ...data.submissions]);
      } else {
        setSubmissions(data.submissions);
      }

      setPagination(data.pagination);
      setStats(data.stats || null);

    } catch (err) {
      console.error('Error fetching submissions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');

      // Only reset submissions if this is a fresh fetch (not pagination)
      if (!filters.offset || filters.offset === 0) {
        setSubmissions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [queryParams, filters.offset]);

  // Refetch submissions
  const refetch = useCallback(async () => {
    // Reset offset for fresh fetch
    setFilters(prev => ({ ...prev, offset: 0 }));
    await fetchSubmissions();
  }, [fetchSubmissions]);

  // Load more submissions (pagination)
  const loadMore = useCallback(async () => {
    if (!pagination?.has_next || loading) return;

    setFilters(prev => ({
      ...prev,
      offset: (prev.offset || 0) + (prev.limit || 20)
    }));
  }, [pagination?.has_next, loading]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<SubmissionFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      offset: 0 // Reset pagination when filters change
    }));
  }, []);

  // Optimistic updates for submission status changes
  const updateSubmissionOptimistic = useCallback((submissionId: string, updates: Partial<SubmissionWithTask>) => {
    setSubmissions(prev =>
      prev.map(submission =>
        submission.id === submissionId
          ? { ...submission, ...updates }
          : submission
      )
    );
  }, []);

  // Effect to fetch submissions when filters change
  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Auto-refresh for pending submissions every 30 seconds
  useEffect(() => {
    if (filters.status === 'pending' || filters.status === 'all') {
      const interval = setInterval(() => {
        // Only refresh if there are pending submissions and we're not currently loading
        const hasPendingSubmissions = submissions.some(s => s.status === 'pending');
        if (hasPendingSubmissions && !loading) {
          fetchSubmissions();
        }
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [filters.status, submissions, loading, fetchSubmissions]);

  // Calculate derived stats
  const derivedStats = useMemo(() => {
    if (!stats) return null;

    return {
      ...stats,
      approval_rate: stats.total > 0 ? (stats.approved / stats.total) * 100 : 0,
      pending_rate: stats.total > 0 ? (stats.pending / stats.total) * 100 : 0,
      average_earnings: stats.approved > 0 ? stats.total_earnings / stats.approved : 0
    };
  }, [stats]);

  return {
    submissions,
    loading,
    error,
    stats: derivedStats,
    pagination,
    refetch,
    loadMore,
    updateFilters,
    // Internal utilities for other hooks
    updateSubmissionOptimistic,
    currentFilters: filters
  } as UseSubmissionsReturn & {
    updateSubmissionOptimistic: (submissionId: string, updates: Partial<SubmissionWithTask>) => void;
    currentFilters: SubmissionFilters;
  };
}

// Hook for submission statistics only (lighter weight)
export function useSubmissionStats(dateRange?: { from?: string; to?: string }) {
  const [stats, setStats] = useState<SubmissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateRange?.from) params.append('date_from', dateRange.from);
      if (dateRange?.to) params.append('date_to', dateRange.to);
      params.append('limit', '0'); // Only fetch stats, no submissions

      const response = await fetch(`/api/submissions?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data?.stats) {
        setStats(result.data.stats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, [dateRange?.from, dateRange?.to]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

// Hook for individual submission details
export function useSubmissionDetail(submissionId: string | null) {
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmission = useCallback(async () => {
    if (!submissionId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/submissions/${submissionId}/review`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setSubmission(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch submission');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch submission');
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  return { submission, loading, error, refetch: fetchSubmission };
}