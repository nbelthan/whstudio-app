/**
 * Admin Submissions Review Interface
 * Comprehensive dashboard for reviewing and managing all submissions
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  Typography,
  ListItem,
  Chip,
  Button,
  Tabs,
  TabItem,
  Skeleton,
  SkeletonTypography,
  useSafeAreaInsets,
  Input,
  TextArea
} from '@worldcoin/mini-apps-ui-kit-react';
import { Modal } from '@/components/ui';
import {
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Calendar,
  Award,
  RefreshCw,
  Search,
  Filter,
  User,
  MessageSquare,
  Star,
  AlertTriangle,
  Eye,
  CheckSquare,
  Square,
  FileText
} from 'lucide-react';
import { useReviewDashboard, useSubmissionReview, useQuickReview } from '@/hooks/useSubmissionReview';
import { ReviewSubmissionRequest } from '@/lib/types/submissions';

interface ReviewModalProps {
  submission: any;
  isOpen: boolean;
  onClose: () => void;
  onReview: (review: ReviewSubmissionRequest) => Promise<void>;
  loading: boolean;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  submission,
  isOpen,
  onClose,
  onReview,
  loading
}) => {
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [qualityScore, setQualityScore] = useState<number>(4);
  const [reviewNotes, setReviewNotes] = useState('');

  const handleSubmit = async () => {
    await onReview({
      status: reviewStatus,
      quality_score: qualityScore,
      review_notes: reviewNotes.trim() || undefined
    });
    onClose();
  };

  if (!submission) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review Submission">
      <div className="space-y-6">
        {/* Submission Details */}
        <div className="space-y-4">
          <div>
            <Typography variant="h3" className="text-white mb-2">
              {submission.task.title}
            </Typography>
            <Typography variant="body2" className="text-white/70">
              {submission.task.description}
            </Typography>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-3">
              <Typography variant="caption" className="text-white/60">
                Submitter
              </Typography>
              <Typography variant="body2" className="text-white">
                {submission.submitter.username || 'Anonymous'}
              </Typography>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <Typography variant="caption" className="text-white/60">
                Reward
              </Typography>
              <Typography variant="body2" className="text-white">
                ${submission.task.reward_amount} {submission.task.reward_currency}
              </Typography>
            </div>
          </div>

          {/* Submission Data */}
          <div className="bg-white/5 rounded-lg p-4">
            <Typography variant="body1" className="text-white mb-2">
              Submission Content
            </Typography>
            <div className="bg-black/20 rounded p-3">
              <pre className="text-white/80 text-sm whitespace-pre-wrap">
                {typeof submission.submission_data === 'string'
                  ? submission.submission_data
                  : JSON.stringify(submission.submission_data, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Review Form */}
        <div className="space-y-4">
          <Typography variant="h4" className="text-white">
            Review Decision
          </Typography>

          {/* Status Selection */}
          <div className="space-y-2">
            <Typography variant="body2" className="text-white">
              Decision
            </Typography>
            <Tabs>
              <TabItem
                isActive={reviewStatus === 'approved'}
                onClick={() => setReviewStatus('approved')}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </TabItem>
              <TabItem
                isActive={reviewStatus === 'rejected'}
                onClick={() => setReviewStatus('rejected')}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </TabItem>
            </Tabs>
          </div>

          {/* Quality Score (only for approved) */}
          {reviewStatus === 'approved' && (
            <div className="space-y-2">
              <Typography variant="body2" className="text-white">
                Quality Score (1-5)
              </Typography>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <Button
                    key={score}
                    variant={qualityScore >= score ? "primary" : "secondary"}
                    size="small"
                    onClick={() => setQualityScore(score)}
                    className="w-10 h-10 p-0"
                  >
                    <Star className={`w-4 h-4 ${qualityScore >= score ? 'fill-current' : ''}`} />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Review Notes */}
          <div className="space-y-2">
            <Typography variant="body2" className="text-white">
              Review Notes {reviewStatus === 'rejected' ? '(Required)' : '(Optional)'}
            </Typography>
            <TextArea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={
                reviewStatus === 'approved'
                  ? 'Optional feedback for the submitter...'
                  : 'Please explain why this submission was rejected...'
              }
              rows={3}
              required={reviewStatus === 'rejected'}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || (reviewStatus === 'rejected' && !reviewNotes.trim())}
            className="flex-1"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {reviewStatus === 'approved' ? 'Approve & Pay' : 'Reject'} Submission
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default function AdminSubmissionsPage() {
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState('pending');
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const {
    submissions,
    loading,
    error,
    selectedSubmissions,
    fetchPendingSubmissions,
    toggleSubmissionSelection,
    selectAllSubmissions,
    clearSelection,
    refetch
  } = useReviewDashboard();

  const { reviewSubmission, loading: reviewLoading } = useSubmissionReview();
  const { approveSubmission, rejectSubmission } = useQuickReview();

  // Fetch submissions on mount and filter change
  useEffect(() => {
    fetchPendingSubmissions({ status: selectedFilter });
  }, [selectedFilter, fetchPendingSubmissions]);

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

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-white/60';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle individual review
  const handleReviewSubmission = async (submission: any) => {
    setSelectedSubmission(submission);
    setReviewModalOpen(true);
  };

  const handleModalReview = async (review: ReviewSubmissionRequest) => {
    if (!selectedSubmission) return;

    const result = await reviewSubmission(selectedSubmission.id, review);
    if (result.success) {
      refetch();
      clearSelection();
    }
  };

  // Handle quick actions
  const handleQuickApprove = async (submissionId: string) => {
    const result = await approveSubmission(submissionId, 4, 'Quick approval');
    if (result.success) {
      refetch();
    }
  };

  const handleQuickReject = async (submissionId: string) => {
    const result = await rejectSubmission(submissionId, 'Does not meet requirements');
    if (result.success) {
      refetch();
    }
  };

  // Batch operations
  const handleBatchApprove = async () => {
    for (const submissionId of selectedSubmissions) {
      await approveSubmission(submissionId, 4, 'Batch approval');
    }
    refetch();
    clearSelection();
  };

  const handleBatchReject = async () => {
    for (const submissionId of selectedSubmissions) {
      await rejectSubmission(submissionId, 'Batch rejection');
    }
    refetch();
    clearSelection();
  };

  // Loading skeleton
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

  return (
    <SafeAreaView className="min-h-screen bg-black">
      <div className="px-6 py-8" style={{ paddingTop: insets.top + 32 }}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Typography variant="h1" className="text-white mb-2">
                Review Submissions
              </Typography>
              <Typography variant="body2" className="text-white/70">
                Review and approve task submissions
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

          {/* Batch Actions */}
          {selectedSubmissions.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <Typography variant="body2" className="text-white">
                  {selectedSubmissions.length} submission{selectedSubmissions.length > 1 ? 's' : ''} selected
                </Typography>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={clearSelection}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={handleBatchApprove}
                    disabled={reviewLoading}
                    className="inline-flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve All
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={handleBatchReject}
                    disabled={reviewLoading}
                    className="inline-flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject All
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <Tabs className="mb-6">
          <TabItem
            isActive={selectedFilter === 'pending'}
            onClick={() => setSelectedFilter('pending')}
          >
            Pending
          </TabItem>
          <TabItem
            isActive={selectedFilter === 'under_review'}
            onClick={() => setSelectedFilter('under_review')}
          >
            Under Review
          </TabItem>
          <TabItem
            isActive={selectedFilter === 'all'}
            onClick={() => setSelectedFilter('all')}
          >
            All
          </TabItem>
        </Tabs>

        {/* Content */}
        {error ? (
          <div className="text-center py-12">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <Typography variant="h3" className="text-white mb-2">
              Failed to load submissions
            </Typography>
            <Typography variant="body2" className="text-white/60 mb-4">
              {error}
            </Typography>
            <Button variant="secondary" onClick={refetch}>
              Try Again
            </Button>
          </div>
        ) : loading ? (
          <LoadingSkeleton />
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <Typography variant="h3" className="text-white mb-2">
              No submissions to review
            </Typography>
            <Typography variant="body2" className="text-white/60">
              All caught up! Check back later for new submissions.
            </Typography>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission: any) => (
              <div key={submission.id} className="bg-white/5 border border-white/10 rounded-xl">
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Selection Checkbox */}
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => toggleSubmissionSelection(submission.id)}
                      className="p-1"
                    >
                      {selectedSubmissions.includes(submission.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Square className="w-5 h-5 text-white/40" />
                      )}
                    </Button>

                    {/* Submission Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <Typography variant="h4" className="text-white mb-1">
                            {submission.task?.title || 'Untitled Task'}
                          </Typography>
                          <div className="flex items-center gap-4 text-white/60 text-sm">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {submission.submitter?.username || 'Anonymous'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(submission.created_at)}
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              ${submission.task?.reward_amount} {submission.task?.reward_currency}
                            </div>
                            {submission.review_priority && (
                              <div className={`flex items-center gap-1 ${getPriorityColor(submission.review_priority)}`}>
                                <AlertTriangle className="w-4 h-4" />
                                {submission.review_priority} priority
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Chip
                            variant={getStatusColor(submission.status)}
                            size="small"
                          >
                            {submission.status.replace('_', ' ')}
                          </Chip>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => handleReviewSubmission(submission)}
                          className="inline-flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Review
                        </Button>
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => handleQuickApprove(submission.id)}
                          disabled={reviewLoading}
                          className="inline-flex items-center gap-2 text-green-400 hover:text-green-300"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Quick Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => handleQuickReject(submission.id)}
                          disabled={reviewLoading}
                          className="inline-flex items-center gap-2 text-red-400 hover:text-red-300"
                        >
                          <XCircle className="w-4 h-4" />
                          Quick Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Review Modal */}
        <ReviewModal
          submission={selectedSubmission}
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedSubmission(null);
          }}
          onReview={handleModalReview}
          loading={reviewLoading}
        />
      </div>
    </SafeAreaView>
  );
}