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

  // Update filters when search or category changes
  useEffect(() => {
    const newFilters = {
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      search: searchQuery || undefined,
      difficulty: selectedDifficulty === 'all' ? undefined : parseInt(selectedDifficulty),
      sort: selectedSort
    };
    setFilters(newFilters);
  }, [selectedCategory, searchQuery, selectedDifficulty, selectedSort, setFilters]);

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
    <SafeAreaView className="min-h-screen bg-black">
      <div className="px-6 py-8" style={{ paddingTop: insets.top + 32 }}>
        {/* Header */}
        <div className="mb-8">
          <Typography variant="h1" className="text-white mb-2">
            Available Tasks
          </Typography>
          <Typography variant="body2" className="text-white/70">
            Complete tasks to earn rewards with your verified World ID
          </Typography>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search tasks..."
            className="w-full"
          />

          <div className="flex gap-2">
            <Select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="flex-1"
            >
              <option value="all">All Difficulties</option>
              <option value="1">Very Easy</option>
              <option value="2">Easy</option>
              <option value="3">Medium</option>
              <option value="4">Hard</option>
              <option value="5">Very Hard</option>
            </Select>

            <Button variant="secondary" size="small">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        {categoriesLoading ? (
          <div className="mb-6">
            <Skeleton className="w-full h-12" />
          </div>
        ) : (
          <Tabs className="mb-6">
            {categories.map((category) => (
              <TabItem
                key={category.id}
                isActive={selectedCategory === category.id}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
                {typeof category.task_count === 'number' && category.task_count > 0 && (
                  <Chip variant="secondary" size="small" className="ml-2">
                    {category.task_count}
                  </Chip>
                )}
              </TabItem>
            ))}
          </Tabs>
        )}

        {/* Sort Options */}
        <div className="mb-4">
          <Select
            value={selectedSort}
            onChange={(e) => setSelectedSort(e.target.value)}
            className="w-48"
          >
            <option value="priority">Sort by Priority</option>
            <option value="reward">Sort by Reward</option>
            <option value="difficulty">Sort by Difficulty</option>
            <option value="time">Sort by Time</option>
            <option value="created">Sort by Newest</option>
          </Select>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mb-6">
            <Typography variant="h3" className="text-red-400 mb-2">
              Error Loading Tasks
            </Typography>
            <Typography variant="body2" className="text-red-300 mb-4">
              {error}
            </Typography>
            <Button variant="secondary" size="small" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {/* Tasks List */}
        {loading && tasks.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
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
                className="bg-white/5 border border-white/10 rounded-2xl p-6 cursor-pointer hover:bg-white/10 transition-colors"
                onClick={() => handleTaskClick(task.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Typography variant="h3" className="text-white mb-1">
                      {task.title}
                    </Typography>
                    <Typography variant="body2" className="text-white/70">
                      {task.description}
                    </Typography>
                    {task.category_name && (
                      <Typography variant="caption" className="text-white/50 mt-1">
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
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-white/40" />
                    <Typography variant="caption" className="text-white/60">
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
                  variant={task.user_has_submitted ? "secondary" : "primary"}
                  size="medium"
                  className="w-full"
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
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More Tasks'}
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!loading && tasks.length === 0 && !error && (
              <div className="text-center py-12">
                <Typography variant="h3" className="text-white mb-2">
                  No tasks found
                </Typography>
                <Typography variant="body2" className="text-white/60 mb-4">
                  {searchQuery || selectedCategory !== 'all' || selectedDifficulty !== 'all'
                    ? 'Try adjusting your filters or search terms'
                    : 'No tasks are currently available. Check back later!'}
                </Typography>
                <Button variant="secondary" size="small" onClick={handleRefresh}>
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