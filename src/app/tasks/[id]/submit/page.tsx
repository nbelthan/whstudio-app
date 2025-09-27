/**
 * Task Submission Page using World App UI Kit
 * Routes to appropriate task interface based on task type
 */

'use client';

import React, { useState, useEffect } from 'react';
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
  AlertTriangle,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { useTask } from '@/hooks/useTasks';
import { useTaskSubmission } from '@/hooks/useTaskSubmission';
import {
  RLHFRatingInterface,
  VoiceRecordingInterface,
  DataAnnotationInterface
} from '@/components/task-interfaces';
import { Task, TaskType } from '@/types';

export default function TaskSubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const taskId = params.id as string;

  const { task, loading: taskLoading, error: taskError, refetch } = useTask(taskId);
  const {
    isSubmitting,
    submitTask,
    submissionError,
    clearError
  } = useTaskSubmission();

  const [startTime] = useState<Date>(new Date());
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [rewardAmount, setRewardAmount] = useState<number>(0);

  useEffect(() => {
    // Clear any previous submission errors when component mounts
    clearError();
  }, [clearError]);

  const handleGoBack = () => {
    router.back();
  };

  const handleSubmissionSuccess = (reward?: { amount: number; currency: string }) => {
    if (reward) {
      setRewardAmount(reward.amount);
      setShowSuccessMessage(true);

      // Show success message for 3 seconds then navigate
      setTimeout(() => {
        router.push(`/dashboard`);
      }, 3000);
    } else {
      // If no reward info, just navigate
      router.push(`/tasks/${taskId}`);
    }
  };

  const handleSubmit = async (submissionData: Record<string, any>) => {
    if (!task) return;

    // Calculate time spent
    const timeSpent = Math.round((new Date().getTime() - startTime.getTime()) / (1000 * 60));

    const submissionPayload = {
      submission_data: submissionData,
      time_spent_minutes: timeSpent,
      ...(task.requires_verification && {
        // World ID proof will be handled by the submission hook if needed
      })
    };

    const result = await submitTask(taskId, submissionPayload);
    if (result.success) {
      handleSubmissionSuccess(result.reward);
    }
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

  const renderTaskInterface = (task: Task) => {
    const commonProps = {
      task,
      onSubmit: handleSubmit,
      isSubmitting
    };

    switch (task.task_type as TaskType) {
      case 'rlhf_rating':
        return <RLHFRatingInterface {...commonProps} />;

      case 'voice_recording':
        return <VoiceRecordingInterface {...commonProps} />;

      case 'data_annotation':
        return <DataAnnotationInterface {...commonProps} />;

      case 'data_entry':
      case 'content_review':
      case 'transcription':
      case 'translation':
      case 'image_tagging':
      case 'quality_assurance':
      case 'research':
      case 'creative_tasks':
        // For now, show a generic form interface for other task types
        return (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <Typography variant="h3" className="text-white mb-4">
              {task.task_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Interface
            </Typography>
            <Typography variant="body2" className="text-white/70 mb-6">
              Specialized interface for this task type is coming soon. Please check back later.
            </Typography>
            <Button
              variant="secondary"
              size="medium"
              onClick={handleGoBack}
              className="w-full"
            >
              Go Back
            </Button>
          </div>
        );

      default:
        return (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <Typography variant="h3" className="text-white mb-4">
              Unknown Task Type
            </Typography>
            <Typography variant="body2" className="text-white/70 mb-6">
              This task type is not supported yet.
            </Typography>
            <Button
              variant="secondary"
              size="medium"
              onClick={handleGoBack}
              className="w-full"
            >
              Go Back
            </Button>
          </div>
        );
    }
  };

  if (taskLoading) {
    return (
      <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)]">
        <div className="px-6 py-8" style={{ paddingTop: insets.top + 32 }}>
          {/* Header Skeleton */}
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="w-10 h-10 rounded-full" />
            <SkeletonTypography variant="h1" className="flex-1" />
          </div>

          {/* Content Skeleton */}
          <div className="space-y-6">
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-full h-64" />
          </div>
        </div>
      </SafeAreaView>
    );
  }

  if (taskError) {
    return (
      <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)]">
        <div className="px-6 py-8" style={{ paddingTop: insets.top + 32 }}>
          <div className="flex items-center gap-4 mb-8">
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
              {taskError}
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
        <div className="px-6 py-8" style={{ paddingTop: insets.top + 32 }}>
          <div className="flex items-center gap-4 mb-8">
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
              The task you're trying to submit to doesn't exist or has been removed.
            </Typography>
            <Button variant="secondary" size="small" onClick={handleGoBack}>
              Go Back
            </Button>
          </div>
        </div>
      </SafeAreaView>
    );
  }

  // Check if user can submit to this task
  const canSubmit = task.status === 'active' &&
                   !task.user_has_submitted &&
                   (!task.expires_at || new Date(task.expires_at) > new Date());

  const canResubmit = task.user_has_submitted &&
                     task.user_submission?.status === 'rejected';

  if (!canSubmit && !canResubmit) {
    let message = 'You cannot submit to this task.';
    let reason = '';

    if (task.status !== 'active') {
      reason = 'Task is not currently active.';
    } else if (task.user_has_submitted && task.user_submission?.status !== 'rejected') {
      reason = 'You have already submitted to this task.';
    } else if (task.expires_at && new Date(task.expires_at) <= new Date()) {
      reason = 'This task has expired.';
    }

    return (
      <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)]">
        <div className="px-6 py-8" style={{ paddingTop: insets.top + 32 }}>
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="secondary"
              size="small"
              onClick={handleGoBack}
              className="!p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Typography variant="h1" className="text-white">
              Cannot Submit
            </Typography>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <Typography variant="h3" className="text-yellow-400">
                Submission Not Allowed
              </Typography>
            </div>
            <Typography variant="body2" className="text-yellow-300 mb-2">
              {message}
            </Typography>
            <Typography variant="body2" className="text-yellow-300/80 mb-4">
              {reason}
            </Typography>
            <Button variant="secondary" size="small" onClick={handleGoBack}>
              Go Back to Task
            </Button>
          </div>
        </div>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)]">
      <div className="px-6 py-8" style={{ paddingTop: insets.top + 32 }}>
        {/* Header with visible back button and user stats */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="primary"
              size="medium"
              onClick={handleGoBack}
              className="flex items-center gap-2"
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Tasks
            </Button>

            {/* Quick Stats */}
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                size="small"
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4 text-[var(--color-success)]" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="bg-green-500/20 border border-green-500/40 rounded-2xl p-6 mb-6 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-green-500/20 rounded-full">
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <Typography variant="h2" className="text-green-400 mb-1">
                  Success! You earned ${rewardAmount.toFixed(2)} USDC
                </Typography>
                <Typography variant="body2" className="text-green-300">
                  Your reward has been credited. Redirecting to dashboard...
                </Typography>
              </div>
            </div>
          </div>
        )}

        {/* Task Summary */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <Typography variant="h3" className="text-white mb-1">
                {task.title}
              </Typography>
              <Typography variant="body2" className="text-white/70">
                {task.description}
              </Typography>
            </div>
            <Chip
              variant={getDifficultyColor(task.difficulty_level)}
              size="small"
            >
              {getDifficultyLabel(task.difficulty_level)}
            </Chip>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/40" />
              <Typography variant="caption" className="text-white/60">
                {formatTimeEstimate(task.estimated_time_minutes)}
              </Typography>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <Typography variant="body2" className="text-green-400 font-medium">
                {task.reward_amount} {task.reward_currency}
              </Typography>
            </div>
          </div>
        </div>

        {/* Verification Notice */}
        {task.requires_verification && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <Typography variant="h3" className="text-yellow-400">
                Verification Required
              </Typography>
            </div>
            <Typography variant="body2" className="text-yellow-300">
              This task requires World ID verification. You'll be prompted to verify when you submit.
            </Typography>
          </div>
        )}

        {/* Submission Error */}
        {submissionError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mb-6">
            <Typography variant="h3" className="text-red-400 mb-2">
              Submission Failed
            </Typography>
            <Typography variant="body2" className="text-red-300">
              {submissionError}
            </Typography>
          </div>
        )}

        {/* Task Interface */}
        {renderTaskInterface(task)}
      </div>
    </SafeAreaView>
  );
}
