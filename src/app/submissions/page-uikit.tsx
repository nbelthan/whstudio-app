/**
 * Submissions Page using World App UI Kit
 * View submission history and details with real API data
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  Typography,
  ListItem,
  Chip,
  Progress,
  Tabs,
  TabItem,
  Skeleton,
  SkeletonTypography,
  useSafeAreaInsets,
  Button
} from '@worldcoin/mini-apps-ui-kit-react';
import {
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Calendar,
  Award,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { useSubmissions } from '@/hooks/useSubmissions';
import { SubmissionStatus } from '@/lib/types/submissions';

export default function SubmissionsPageUIKit() {
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState<SubmissionStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Real API data using custom hook
  const {
    submissions,
    loading,
    error,
    stats,
    pagination,
    refetch,
    loadMore,
    updateFilters
  } = useSubmissions({
    status: selectedFilter,
    search: searchQuery,
    limit: 20
  });

  // Handle filter changes
  const handleFilterChange = (filter: SubmissionStatus | 'all') => {
    setSelectedFilter(filter);
    updateFilters({ status: filter });
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    updateFilters({ search: query });
  };

  // Helper functions
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'under_review': return 'info';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'under_review': return <Clock className="w-5 h-5 text-blue-400" />;
      default: return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <SkeletonTypography className="w-3/4 mb-2" />
              <SkeletonTypography className="w-1/2 mb-1" size="sm" />
              <SkeletonTypography className="w-1/3" size="sm" />
            </div>
            <div className="text-right">
              <Skeleton className="w-16 h-6 mb-2" />
              <SkeletonTypography className="w-12" size="sm" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Error state component
  const ErrorState = () => (
    <div className="text-center py-12">
      <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <Typography variant="h3" className="text-white mb-2">
        Failed to load submissions
      </Typography>
      <Typography variant="body2" className="text-white/60 mb-4">
        {error}
      </Typography>
      <Button
        variant="secondary"
        onClick={refetch}
        className="inline-flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </Button>
    </div>
  );

  // Empty state component
  const EmptyState = () => (
    <div className="text-center py-12">
      <Award className="w-12 h-12 text-white/40 mx-auto mb-4" />
      <Typography variant="h3" className="text-white mb-2">
        No submissions found
      </Typography>
      <Typography variant="body2" className="text-white/60">
        {selectedFilter === 'all'
          ? 'Complete tasks to see your submission history here'
          : `No ${selectedFilter} submissions found`
        }
      </Typography>
    </div>
  );

  return (
    <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
      <div className="px-6 py-6 space-y-8" style={{ paddingTop: insets.top + 16 }}>
        {/* Header */}
        <div className="space-y-2">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Typography variant="h1" className="text-[var(--color-text-primary)] mb-2">
                Submissions
              </Typography>
              <Typography variant="body2" className="text-[var(--color-text-secondary)]">
                Track your task submissions and earnings
              </Typography>
            </div>
            <Button
              variant="secondary"
              size="small"
              onClick={refetch}
              disabled={loading}
              className="inline-flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="rounded-2xl border border-[color-mix(in srgb,var(--color-divider-low) 70%,transparent)] bg-[color-mix(in srgb,var(--color-bg-surface) 85%,transparent)] p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-[var(--color-success)]" />
                <Typography variant="caption" className="text-[var(--color-text-secondary)]">
                  Total Earnings
                </Typography>
              </div>
              <Typography variant="h3" className="text-[var(--color-text-primary)]">
                ${stats.total_earnings.toFixed(2)}
              </Typography>
            </div>

            <div className="rounded-2xl border border-[color-mix(in srgb,var(--color-divider-low) 70%,transparent)] bg-[color-mix(in srgb,var(--color-bg-surface) 85%,transparent)] p-6">
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-5 h-5 text-[var(--color-accent-blue)]" />
                <Typography variant="caption" className="text-[var(--color-text-secondary)]">
                  Quality Score
                </Typography>
              </div>
              <Typography variant="h3" className="text-[var(--color-text-primary)] mb-2">
                {stats.average_quality_score ? Math.round(stats.average_quality_score * 20) : 0}%
              </Typography>
              <Progress value={stats.average_quality_score ? stats.average_quality_score * 20 : 0} className="h-2" />
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <Tabs className="mb-6">
          <TabItem
            isActive={selectedFilter === 'all'}
            onClick={() => handleFilterChange('all')}
          >
            All
            <Chip variant="secondary" size="small" className="ml-2">
              {stats?.total || 0}
            </Chip>
          </TabItem>
          <TabItem
            isActive={selectedFilter === 'approved'}
            onClick={() => handleFilterChange('approved')}
          >
            Approved
            <Chip variant="success" size="small" className="ml-2">
              {stats?.approved || 0}
            </Chip>
          </TabItem>
          <TabItem
            isActive={selectedFilter === 'pending'}
            onClick={() => handleFilterChange('pending')}
          >
            Pending
            <Chip variant="warning" size="small" className="ml-2">
              {stats?.pending || 0}
            </Chip>
          </TabItem>
          <TabItem
            isActive={selectedFilter === 'under_review'}
            onClick={() => handleFilterChange('under_review')}
          >
            Reviewing
            <Chip variant="info" size="small" className="ml-2">
              {stats?.under_review || 0}
            </Chip>
          </TabItem>
          <TabItem
            isActive={selectedFilter === 'rejected'}
            onClick={() => handleFilterChange('rejected')}
          >
            Rejected
            <Chip variant="error" size="small" className="ml-2">
              {stats?.rejected || 0}
            </Chip>
          </TabItem>
        </Tabs>

        {/* Content */}
        {error ? (
          <ErrorState />
        ) : loading && submissions.length === 0 ? (
          <LoadingSkeleton />
        ) : submissions.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Submissions List */}
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="rounded-2xl border border-[color-mix(in srgb,var(--color-divider-low) 70%,transparent)] bg-[color-mix(in srgb,var(--color-bg-surface) 88%,transparent)]"
                >
                  <ListItem
                    icon={getStatusIcon(submission.status)}
                    title={submission.task.title}
                    subtitle={
                      <div className="space-y-1 mt-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-[var(--color-text-secondary)]" />
                          <Typography variant="caption" className="text-[var(--color-text-secondary)]">
                            Submitted: {formatDate(submission.created_at)}
                          </Typography>
                        </div>
                        {submission.reviewed_at && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-[var(--color-success)]" />
                            <Typography variant="caption" className="text-[var(--color-text-secondary)]">
                              Reviewed: {formatDate(submission.reviewed_at)}
                            </Typography>
                          </div>
                        )}
                        {submission.task.category_name && (
                          <div className="flex items-center gap-2">
                            <Award className="w-3 h-3 text-[var(--color-accent-blue)]" />
                            <Typography variant="caption" className="text-[var(--color-text-secondary)]">
                              {submission.task.category_name}
                            </Typography>
                          </div>
                        )}
                      </div>
                    }
                    trailing={
                      <div className="text-right space-y-2">
                        <Chip
                          variant={getStatusColor(submission.status)}
                          size="small"
                        >
                          {submission.status.replace('_', ' ')}
                        </Chip>
                        {submission.status === 'approved' && (
                          <Typography variant="body2" className="text-[var(--color-success)] font-medium">
                            +{submission.task.reward_amount.toFixed(2)} {submission.task.reward_currency}
                          </Typography>
                        )}
                        {submission.quality_score && (
                          <Typography variant="caption" className="text-[var(--color-text-secondary)] block">
                            Quality: {Math.round(submission.quality_score * 20)}%
                          </Typography>
                        )}
                      </div>
                    }
                  />
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {pagination?.has_next && (
              <div className="text-center mt-8">
                <Button
                  variant="secondary"
                  onClick={loadMore}
                  disabled={loading}
                  className="inline-flex items-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : null}
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </SafeAreaView>
  );
}
