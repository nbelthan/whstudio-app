/**
 * Submission History Component
 * Displays user's task submissions with status tracking
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, Eye, Search, Filter, Calendar } from 'lucide-react';

import { Card, Button, Badge, Input, LoadingCard, Modal } from '@/components/ui';
import { useSubmissions, useAuth, useUI } from '@/stores';
import { Submission, SubmissionStatus, TaskType } from '@/types';
import {
  formatTimeAgo,
  formatCurrency,
  getStatusProps,
  getTaskTypeDisplayName,
  getTaskTypeIcon,
  cn,
} from '@/lib/utils';

interface SubmissionHistoryProps {
  limit?: number;
  showFilters?: boolean;
  taskId?: string;
  className?: string;
}

interface SubmissionFilters {
  status?: SubmissionStatus;
  taskType?: TaskType;
  dateRange?: string;
}

export const SubmissionHistory: React.FC<SubmissionHistoryProps> = ({
  limit,
  showFilters = true,
  taskId,
  className,
}) => {
  const { user } = useAuth();
  const { addNotification } = useUI();
  const {
    submissions,
    loading,
    setSubmissions,
    setSubmissionLoading,
    setSubmissionError,
  } = useSubmissions();

  const [filters, setFilters] = useState<SubmissionFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [taskId]);

  const fetchSubmissions = async () => {
    if (!user) return;

    setSubmissionLoading('fetch', true);

    try {
      const url = taskId
        ? `/api/tasks/${taskId}/submissions`
        : '/api/submissions';

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }

      const data = await response.json();

      // Mock data for now - in real app, this would come from API
      const mockSubmissions: Submission[] = [
        {
          id: '1',
          task_id: 'task-1',
          user_id: user.id,
          submitter_nullifier: 'null-1',
          submission_data: {
            chosen_response: 'a',
            rating_reasons: ['helpfulness', 'accuracy'],
            confidence_score: 4,
          },
          time_spent_minutes: 15,
          quality_score: 4.5,
          status: 'approved',
          reviewer_id: 'reviewer-1',
          review_notes: 'Excellent work! Very detailed and accurate assessment.',
          reviewed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          is_paid: true,
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          task_id: 'task-2',
          user_id: user.id,
          submitter_nullifier: 'null-2',
          submission_data: {
            annotations: [
              { id: 'ann-1', type: 'bounding_box', label: 'Person', coordinates: [100, 100, 50, 80] },
              { id: 'ann-2', type: 'bounding_box', label: 'Car', coordinates: [200, 150, 80, 40] },
            ],
          },
          time_spent_minutes: 25,
          quality_score: 3.8,
          status: 'under_review',
          is_paid: false,
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          task_id: 'task-3',
          user_id: user.id,
          submitter_nullifier: 'null-3',
          submission_data: {
            audio_url: '/recordings/sample.wav',
            duration_seconds: 180,
            transcript: 'This is a sample transcription...',
          },
          time_spent_minutes: 10,
          quality_score: 4.2,
          status: 'pending',
          is_paid: false,
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
        {
          id: '4',
          task_id: 'task-4',
          user_id: user.id,
          submitter_nullifier: 'null-4',
          submission_data: {
            transcription: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
            confidence: 0.95,
          },
          time_spent_minutes: 20,
          quality_score: 2.1,
          status: 'rejected',
          reviewer_id: 'reviewer-2',
          review_notes: 'Transcription quality needs improvement. Several inaccuracies noted.',
          reviewed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          is_paid: false,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      setSubmissions(mockSubmissions);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch submissions';
      setSubmissionError('fetch', errorMsg);
      addNotification({
        type: 'error',
        title: 'Failed to Load Submissions',
        message: errorMsg,
      });
    } finally {
      setSubmissionLoading('fetch', false);
    }
  };

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    let filtered = submissions;

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(submission => submission.status === filters.status);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(submission =>
        submission.id.toLowerCase().includes(query) ||
        submission.task_id.toLowerCase().includes(query) ||
        submission.status.toLowerCase().includes(query)
      );
    }

    // Apply date range filter
    if (filters.dateRange) {
      const now = new Date();
      let startDate = new Date();

      switch (filters.dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(submission =>
        new Date(submission.created_at) >= startDate
      );
    }

    // Apply limit
    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [submissions, filters, searchQuery, limit]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = submissions.length;
    const approved = submissions.filter(s => s.status === 'approved').length;
    const pending = submissions.filter(s => s.status === 'pending').length;
    const underReview = submissions.filter(s => s.status === 'under_review').length;
    const rejected = submissions.filter(s => s.status === 'rejected').length;

    const approvalRate = total > 0 ? (approved / total) * 100 : 0;
    const averageQuality = submissions.length > 0
      ? submissions.reduce((sum, s) => sum + (s.quality_score || 0), 0) / submissions.length
      : 0;

    return {
      total,
      approved,
      pending,
      underReview,
      rejected,
      approvalRate,
      averageQuality,
    };
  }, [submissions]);

  const getSubmissionStatusIcon = (status: SubmissionStatus) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'under_review':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'pending':
      default:
        return <Clock className="w-4 h-4 text-blue-400" />;
    }
  };

  const handleSubmissionClick = (submission: Submission) => {
    setSelectedSubmission(submission);
    setShowDetailsModal(true);
  };

  if (loading.submission_fetch && submissions.length === 0) {
    return (
      <Card className={className}>
        <Card.Header title="Submission History" />
        <Card.Content>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingCard key={i} showActions lines={2} />
            ))}
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <>
      <Card className={className} variant="elevated">
        <Card.Header
          title="Submission History"
          subtitle={`${filteredSubmissions.length} submissions`}
        />

        <Card.Content>
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-white/80">Approved</span>
              </div>
              <p className="text-lg font-semibold text-white">{stats.approved}</p>
              <p className="text-xs text-white/60">{stats.approvalRate.toFixed(1)}% rate</p>
            </div>

            <div className="bg-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-white/80">Pending</span>
              </div>
              <p className="text-lg font-semibold text-white">{stats.pending + stats.underReview}</p>
              <p className="text-xs text-white/60">In review</p>
            </div>

            <div className="bg-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-white/80">Rejected</span>
              </div>
              <p className="text-lg font-semibold text-white">{stats.rejected}</p>
              <p className="text-xs text-white/60">Need revision</p>
            </div>

            <div className="bg-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-white/80">Quality</span>
              </div>
              <p className="text-lg font-semibold text-white">{stats.averageQuality.toFixed(1)}</p>
              <p className="text-xs text-white/60">Avg score</p>
            </div>
          </div>

          {/* Search and Filters */}
          {showFilters && (
            <div className="flex flex-col md:flex-row gap-6 mb-8">
              <div className="flex-1">
                <Input
                  placeholder="Search submissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>

              <div className="flex gap-2">
                <select
                  className="h-10 px-3 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(25,137,251)]/20"
                  value={filters.status || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    status: e.target.value as SubmissionStatus || undefined
                  }))}
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  className="h-10 px-3 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(25,137,251)]/20"
                  value={filters.dateRange || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: e.target.value || undefined
                  }))}
                >
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>
          )}

          {/* Submissions List */}
          <div className="space-y-3">
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/60">No submissions found</p>
                <p className="text-white/40 text-sm mt-2">
                  {searchQuery || Object.values(filters).some(Boolean)
                    ? 'Try adjusting your search or filters'
                    : 'Complete your first task to see submissions here'
                  }
                </p>
              </div>
            ) : (
              filteredSubmissions.map((submission) => {
                const statusProps = getStatusProps(submission.status);

                return (
                  <div
                    key={submission.id}
                    onClick={() => handleSubmissionClick(submission)}
                    className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {getSubmissionStatusIcon(submission.status)}

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium">
                            Task #{submission.task_id.slice(-6)}
                          </span>
                          <Badge
                            size="sm"
                            className={cn(statusProps.bgColor, statusProps.color)}
                          >
                            {statusProps.label}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-white/60">
                          <span>{formatTimeAgo(submission.created_at)}</span>
                          {submission.time_spent_minutes && (
                            <>
                              <span>•</span>
                              <span>{submission.time_spent_minutes}m spent</span>
                            </>
                          )}
                          {submission.quality_score && (
                            <>
                              <span>•</span>
                              <span>Quality: {submission.quality_score.toFixed(1)}/5</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {submission.is_paid && (
                        <Badge variant="success" size="sm">
                          Paid
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Submission Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Submission Details"
        size="lg"
      >
        {selectedSubmission && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-2xl p-6">
                <span className="text-white/60 text-sm">Status</span>
                <div className="flex items-center gap-2 mt-1">
                  {getSubmissionStatusIcon(selectedSubmission.status)}
                  <Badge className={cn(
                    getStatusProps(selectedSubmission.status).bgColor,
                    getStatusProps(selectedSubmission.status).color
                  )}>
                    {getStatusProps(selectedSubmission.status).label}
                  </Badge>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-6">
                <span className="text-white/60 text-sm">Submitted</span>
                <p className="text-white mt-1">
                  {new Date(selectedSubmission.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Quality and Time */}
            <div className="grid grid-cols-2 gap-6">
              {selectedSubmission.quality_score && (
                <div className="bg-white/5 rounded-2xl p-6">
                  <span className="text-white/60 text-sm">Quality Score</span>
                  <p className="text-white text-lg font-semibold mt-1">
                    {selectedSubmission.quality_score.toFixed(1)}/5.0
                  </p>
                </div>
              )}

              {selectedSubmission.time_spent_minutes && (
                <div className="bg-white/5 rounded-2xl p-6">
                  <span className="text-white/60 text-sm">Time Spent</span>
                  <p className="text-white text-lg font-semibold mt-1">
                    {selectedSubmission.time_spent_minutes} minutes
                  </p>
                </div>
              )}
            </div>

            {/* Review */}
            {selectedSubmission.review_notes && (
              <div className="bg-white/5 rounded-2xl p-6">
                <span className="text-white/60 text-sm">Review Notes</span>
                <p className="text-white/80 mt-2 leading-relaxed">
                  {selectedSubmission.review_notes}
                </p>
                {selectedSubmission.reviewed_at && (
                  <p className="text-white/50 text-xs mt-3">
                    Reviewed {formatTimeAgo(selectedSubmission.reviewed_at)}
                  </p>
                )}
              </div>
            )}

            {/* Submission Data Preview */}
            <div className="bg-white/5 rounded-2xl p-6">
              <span className="text-white/60 text-sm">Submission Data</span>
              <pre className="text-white/80 text-xs mt-2 bg-black/20 rounded p-4 overflow-auto">
                {JSON.stringify(selectedSubmission.submission_data, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <Modal.Footer>
          <Button onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default SubmissionHistory;