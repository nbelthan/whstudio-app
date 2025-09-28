/**
 * Task Detail Page using World App UI Kit
 * Shows detailed task information and submission interface
 */

'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  SafeAreaView,
  Typography,
  Button,
  Chip,
  Skeleton,
  SkeletonTypography,
  useSafeAreaInsets
} from '@worldcoin/mini-apps-ui-kit-react';
import {
  ArrowLeft,
  Clock,
  DollarSign,
  Award,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Users,
  Play,
  RefreshCw
} from 'lucide-react';
import { useTask } from '@/hooks/useTasks';
import { Task } from '@/types';
import { ConsensusResults } from '@/components/tasks/ConsensusResults';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const taskId = params.id as string;

  const { task, loading, error, refetch } = useTask(taskId);

  const handleStartTask = () => {
    router.push(`/tasks/${taskId}/submit`);
  };

  const handleGoBack = () => {
    router.back();
  };

  const getDifficultyColor = (difficulty: number) => {
    switch(difficulty) {
      case 1:
      case 2: return 'success';
      case 3: return 'warning';
      case 4:
      case 5: return 'error';
      default: return 'secondary';
    }
  };

  const getDifficultyLabel = (difficulty: number) => {
    switch(difficulty) {
      case 1: return 'Very Easy';
      case 2: return 'Easy';
      case 3: return 'Medium';
      case 4: return 'Hard';
      case 5: return 'Very Hard';
      default: return 'Unknown';
    }
  };

  const formatTimeEstimate = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
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

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'secondary';
      case 'cancelled': return 'error';
      default: return 'secondary';
    }
  };

  const getSubmissionStatusInfo = (task: Task) => {
    if (!task.user_has_submitted) {
      return null;
    }

    const submission = task.user_submission;
    if (!submission) return null;

    const statusConfig = {
      pending: { color: 'warning', icon: Clock, text: 'Submission Pending Review' },
      under_review: { color: 'warning', icon: Clock, text: 'Under Review' },
      approved: { color: 'success', icon: CheckCircle, text: 'Submission Approved' },
      rejected: { color: 'error', icon: AlertTriangle, text: 'Submission Rejected' }
    };

    const config = statusConfig[submission.status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Icon className="w-5 h-5 text-white/60" />
          <Typography variant="h3" className="text-white">
            Your Submission
          </Typography>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Typography variant="body2" className="text-white/70">
              Status:
            </Typography>
            <Chip variant={config.color} size="small">
              {config.text}
            </Chip>
          </div>

          <div className="flex items-center justify-between">
            <Typography variant="body2" className="text-white/70">
              Submitted:
            </Typography>
            <Typography variant="body2" className="text-white">
              {formatDate(submission.created_at)}
            </Typography>
          </div>

          {submission.time_spent_minutes && (
            <div className="flex items-center justify-between">
              <Typography variant="body2" className="text-white/70">
                Time Spent:
              </Typography>
              <Typography variant="body2" className="text-white">
                {formatTimeEstimate(submission.time_spent_minutes)}
              </Typography>
            </div>
          )}

          {submission.quality_score && (
            <div className="flex items-center justify-between">
              <Typography variant="body2" className="text-white/70">
                Quality Score:
              </Typography>
              <Typography variant="body2" className="text-white">
                {submission.quality_score}/5
              </Typography>
            </div>
          )}

          {submission.review_notes && (
            <div>
              <Typography variant="body2" className="text-white/70 mb-2">
                Review Notes:
              </Typography>
              <Typography variant="body2" className="text-white/90">
                {submission.review_notes}
              </Typography>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)]">
        <div className="px-6 py-6" style={{ paddingTop: insets.top + 16 }}>
          {/* Header Skeleton */}
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <SkeletonTypography variant="h1" className="flex-1" />
          </div>

          {/* Content Skeleton */}
          <div className="space-y-6">
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-full h-24" />
            <Skeleton className="w-full h-48" />
          </div>
        </div>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)]">
        <div className="px-6 py-6" style={{ paddingTop: insets.top + 16 }}>
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="secondary"
              size="small"
              onClick={handleGoBack}
              className="!p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Typography variant="h1" className="text-white">
              Error
            </Typography>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
            <Typography variant="h3" className="text-red-400 mb-2">
              Failed to Load Task
            </Typography>
            <Typography variant="body2" className="text-red-300 mb-4">
              {error}
            </Typography>
            <Button variant="secondary" size="small" onClick={refetch}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)]">
        <div className="px-6 py-6" style={{ paddingTop: insets.top + 16 }}>
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="secondary"
              size="small"
              onClick={handleGoBack}
              className="!p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Typography variant="h1" className="text-white">
              Task Not Found
            </Typography>
          </div>

          <div className="text-center py-12">
            <Typography variant="h3" className="text-white mb-2">
              Task Not Found
            </Typography>
            <Typography variant="body2" className="text-white/60 mb-4">
              The task you're looking for doesn't exist or has been removed.
            </Typography>
            <Button variant="secondary" size="small" onClick={handleGoBack}>
              Go Back
            </Button>
          </div>
        </div>
      </SafeAreaView>
    );
  }

  const canStartTask = task.status === 'active' &&
                       !task.user_has_submitted &&
                       (!task.expires_at || new Date(task.expires_at) > new Date());

  const canResubmit = task.user_has_submitted &&
                      task.user_submission?.status === 'rejected';

  return (
    <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)]">
      <div className="px-6 py-6" style={{ paddingTop: insets.top + 16 }}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="secondary"
            size="small"
            onClick={handleGoBack}
            className="!p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <Typography variant="h1" className="text-white">
              Task Details
            </Typography>
          </div>
          <Chip variant={getStatusColor(task.status)} size="small">
            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
          </Chip>
        </div>

        {/* Task Info */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <Typography variant="h2" className="text-white mb-2">
                {task.title}
              </Typography>
              <Typography variant="body1" className="text-white/80 mb-3">
                {task.description}
              </Typography>
              {task.category_name && (
                <Typography variant="caption" className="text-white/50">
                  Category: {task.category_name}
                </Typography>
              )}
            </div>
            <Chip
              variant={getDifficultyColor(task.difficulty_level)}
              size="small"
            >
              {getDifficultyLabel(task.difficulty_level)}
            </Chip>
          </div>

          {/* Task Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/40" />
              <div>
                <Typography variant="caption" className="text-white/60 block">
                  Est. Time
                </Typography>
                <Typography variant="body2" className="text-white">
                  {formatTimeEstimate(task.estimated_time_minutes)}
                </Typography>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <div>
                <Typography variant="caption" className="text-white/60 block">
                  Reward
                </Typography>
                <Typography variant="body2" className="text-green-400 font-medium">
                  {task.reward_amount} {task.reward_currency}
                </Typography>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white/40" />
              <div>
                <Typography variant="caption" className="text-white/60 block">
                  Max Submissions
                </Typography>
                <Typography variant="body2" className="text-white">
                  {task.max_submissions}
                </Typography>
              </div>
            </div>

            {task.expires_at && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-white/40" />
                <div>
                  <Typography variant="caption" className="text-white/60 block">
                    Expires
                  </Typography>
                  <Typography variant="body2" className="text-white">
                    {formatDate(task.expires_at)}
                  </Typography>
                </div>
              </div>
            )}
          </div>

          {/* Creator Info */}
          <div className="border-t border-white/10 pt-4">
            <Typography variant="caption" className="text-white/60">
              Created by: <span className="text-white">{task.creator_username || 'Anonymous'}</span>
            </Typography>
          </div>
        </div>

        {/* Submission Status */}
        {getSubmissionStatusInfo(task)}

        {/* Consensus Results for RLHF tasks */}
        {task.task_type === 'rlhf_rating' && task.user_has_submitted && (
          <ConsensusResults
            taskId={taskId}
            className="mb-6"
            onRefresh={refetch}
          />
        )}

        {/* Instructions */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
          <Typography variant="h3" className="text-white mb-4">
            Instructions
          </Typography>
          <Typography variant="body1" className="text-white/80 whitespace-pre-wrap">
            {task.instructions}
          </Typography>
        </div>

        {/* Requirements */}
        {task.requires_verification && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <Typography variant="h3" className="text-yellow-400">
                Verification Required
              </Typography>
            </div>
            <Typography variant="body2" className="text-yellow-300">
              This task requires World ID verification to submit. You'll be prompted to verify during submission.
            </Typography>
          </div>
        )}

        {/* Verification Criteria */}
        {task.verification_criteria && Object.keys(task.verification_criteria).length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
            <Typography variant="h3" className="text-white mb-4">
              Quality Criteria
            </Typography>
            <div className="space-y-2">
              {Object.entries(task.verification_criteria).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <Typography variant="body2" className="text-white/80">
                    <span className="capitalize">{key.replace('_', ' ')}</span>: {String(value)}
                  </Typography>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        {task.attachment_urls && task.attachment_urls.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
            <Typography variant="h3" className="text-white mb-4">
              Attachments
            </Typography>
            <div className="space-y-2">
              {task.attachment_urls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <Typography variant="body2" className="text-blue-400">
                    Attachment {index + 1}
                  </Typography>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="sticky bottom-3">
          {canStartTask && (
            <Button
              variant="primary"
              size="large"
              className="w-full"
              onClick={handleStartTask}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Task
            </Button>
          )}

          {canResubmit && (
            <Button
              variant="primary"
              size="large"
              className="w-full"
              onClick={handleStartTask}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Resubmit Task
            </Button>
          )}

          {task.user_has_submitted && !canResubmit && (
            <Button
              variant="secondary"
              size="large"
              className="w-full"
              disabled
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Already Submitted
            </Button>
          )}

          {task.status !== 'active' && (
            <Button
              variant="secondary"
              size="large"
              className="w-full"
              disabled
            >
              Task Not Available
            </Button>
          )}

          {task.expires_at && new Date(task.expires_at) <= new Date() && (
            <Button
              variant="secondary"
              size="large"
              className="w-full"
              disabled
            >
              Task Expired
            </Button>
          )}
        </div>
      </div>
    </SafeAreaView>
  );
}
