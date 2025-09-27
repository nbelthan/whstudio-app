/**
 * Tasks Page using World App UI Kit
 * Browse and filter available tasks
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  SafeAreaView,
  Typography,
  ListItem,
  Chip,
  Button,
  Select,
  SearchField,
  Skeleton,
  SkeletonTypography,
  Tabs,
  TabItem,
  useSafeAreaInsets
} from '@worldcoin/mini-apps-ui-kit-react';
import {
  Search,
  Filter,
  Clock,
  DollarSign,
  Award,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { Task, TaskCategory } from '@/types';
import { BUTTON_INTENTS } from '@/lib/utils';

export default function TasksPageUIKit() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedSort, setSelectedSort] = useState('priority');

  // Initialize the tasks hook
  const {
    tasks,
    categories,
    loading,
    error,
    pagination,
    filters,
    setFilters,
    refreshTasks,
    loadMore,
    categoriesLoading,
    categoriesError
  } = useTasks({
    initialFilters: {
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      search: searchQuery || undefined,
      sort: selectedSort
    },
    limit: 20,
    autoFetch: true
  });

  // Debug logging
  console.log('🚀 TasksPage: Render state:', {
    tasksLength: tasks.length,
    loading,
    error,
    categoriesLength: categories.length,
    categoriesLoading,
    categoriesError,
    filters,
    pagination
  });

  // Update filters when search or category changes (debounced to avoid loops)
  useEffect(() => {
    const timer = setTimeout(() => {
      const newFilters = {
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        search: searchQuery || undefined,
        difficulty: selectedDifficulty === 'all' ? undefined : parseInt(selectedDifficulty),
        sort: selectedSort
      };
      console.log('🚀 TasksPage: Setting new filters:', newFilters);
      setFilters(newFilters);
    }, 100); // Small debounce to prevent infinite loops

    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery, selectedDifficulty, selectedSort]);

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

  const handleLoadMore = () => {
    if (pagination.has_more && !loading) {
      loadMore();
    }
  };

  const handleRefresh = () => {
    refreshTasks();
  };

  const handleTaskClick = (taskId: string) => {
    router.push(`/tasks/${taskId}`);
  };

  const handleStartTask = (taskId: string, userHasSubmitted: boolean, submissionStatus?: string) => {
    if (userHasSubmitted && submissionStatus !== 'rejected') {
      // Navigate to task details to show submission status
      router.push(`/tasks/${taskId}`);
    } else {
      // Navigate to submission page
      router.push(`/tasks/${taskId}/submit`);
    }
  };

  return (
    <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
      <div className="px-6 py-8" style={{ paddingTop: insets.top + 32 }}>
        {/* Header */}
        <div className="mb-8">
          <Typography variant="h1" className="text-[var(--color-text-primary)] mb-2">
            Available Tasks
          </Typography>
          <Typography variant="body2" className="text-[var(--color-text-secondary)]">
            Complete tasks to earn rewards with your verified World ID
          </Typography>
        </div>

        {/* Removed search and filters - just showing task list */}

        {/* Error State */}
        {error && (
          <div className="bg-[color-mix(in srgb,var(--color-error) 18%,transparent)] border border-[color-mix(in srgb,var(--color-error) 35%,transparent)] rounded-2xl p-6 mb-6">
            <Typography variant="h3" className="text-[var(--color-error)] mb-2">
              Error Loading Tasks
            </Typography>
            <Typography variant="body2" className="text-[var(--color-text-secondary)] mb-4">
              {error}
            </Typography>
            <Button
              variant="secondary"
              size="small"
              className={`${BUTTON_INTENTS.secondary} !rounded-full !h-11 !px-5 !text-xs !tracking-[0.28em]`}
              onClick={handleRefresh}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {/* Tasks List */}
        {loading && tasks.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-[color-mix(in srgb,var(--color-divider-low) 70%,transparent)] bg-[color-mix(in srgb,var(--color-bg-surface) 85%,transparent)] p-4">
                <Skeleton className="w-full h-24" />
                <SkeletonTypography variant="h3" className="mt-3" />
                <SkeletonTypography variant="body2" className="mt-2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task: Task) => (
              <div
                key={task.id}
                className="rounded-2xl border border-[color-mix(in srgb,var(--color-divider-low) 70%,transparent)] bg-[color-mix(in srgb,var(--color-bg-surface) 92%,transparent)] p-6 cursor-pointer hover:bg-[color-mix(in srgb,var(--color-bg-surface) 70%,var(--color-accent-blue) 8%)] transition-colors"
                onClick={() => handleTaskClick(task.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Typography variant="h3" className="text-[var(--color-text-primary)] mb-1">
                      {task.title}
                    </Typography>
                    <Typography variant="body2" className="text-[var(--color-text-secondary)]">
                      {task.description}
                    </Typography>
                    {task.category_name && (
                      <Typography
                        variant="caption"
                        className="text-[color-mix(in srgb,var(--color-text-secondary) 80%,transparent)] mt-1"
                      >
                        {task.category_name}
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

                {/* Task Details */}
                <div className="flex items-center gap-6 mb-4">
                  <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                    <Clock className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    <Typography variant="caption" className="text-[var(--color-text-secondary)]">
                      {formatTimeEstimate(task.estimated_time_minutes)}
                    </Typography>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[var(--color-success)]" />
                    <Typography variant="body2" className="text-[var(--color-success)] font-medium">
                      {task.reward_amount} {task.reward_currency}
                    </Typography>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    <Typography variant="caption" className="text-[var(--color-text-secondary)]">
                      Max {task.max_submissions} submissions
                    </Typography>
                  </div>
                </div>

                {/* User Submission Status */}
                {task.user_has_submitted && (
                  <div className="mb-4">
                    <Chip
                      variant={task.user_submission_status === 'approved' ? 'success' :
                              task.user_submission_status === 'rejected' ? 'error' : 'warning'}
                      size="small"
                    >
                      {task.user_submission_status === 'pending' && 'Submission Pending'}
                      {task.user_submission_status === 'approved' && 'Submission Approved'}
                      {task.user_submission_status === 'rejected' && 'Submission Rejected'}
                      {task.user_submission_status === 'under_review' && 'Under Review'}
                    </Chip>
                  </div>
                )}

                {/* Action Button */}
                <Button
                  variant={task.user_has_submitted ? 'secondary' : 'primary'}
                  size="medium"
                  className={`w-full ${task.user_has_submitted ? BUTTON_INTENTS.secondary : BUTTON_INTENTS.primary} !h-12 !rounded-2xl`}
                  disabled={task.user_has_submitted && task.user_submission_status !== 'rejected'}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartTask(task.id, task.user_has_submitted || false, task.user_submission_status);
                  }}
                >
                  {task.user_has_submitted
                    ? (task.user_submission_status === 'rejected' ? 'Resubmit Task' : 'View Submission')
                    : 'Start Task'
                  }
                  {!task.user_has_submitted && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            ))}

            {/* Load More Button */}
            {pagination.has_more && (
              <div className="text-center py-6">
                <Button
                  variant="secondary"
                  size="medium"
                  className={`${BUTTON_INTENTS.secondary} !rounded-2xl !h-12 !px-6`}
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More Tasks'}
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!loading && tasks.length === 0 && !error && (
              <div className="text-center py-12 text-[var(--color-text-secondary)]">
                <Typography variant="h3" className="text-[var(--color-text-primary)] mb-2">
                  No tasks found
                </Typography>
                <Typography variant="body2" className="text-[var(--color-text-secondary)] mb-4">
                  {searchQuery || selectedCategory !== 'all' || selectedDifficulty !== 'all'
                    ? 'Try adjusting your filters or search terms'
                    : 'No tasks are currently available. Check back later!'}
                </Typography>
                <Button
                  variant="secondary"
                  size="small"
                  className={`${BUTTON_INTENTS.secondary} !rounded-full !h-11 !px-5 !text-xs !tracking-[0.28em]`}
                  onClick={handleRefresh}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </SafeAreaView>
  );
}
