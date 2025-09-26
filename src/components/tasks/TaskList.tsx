/**
 * Task list component with pagination and infinite scrolling
 * Displays tasks in various layouts with loading states
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Grid, List, RefreshCw, AlertCircle } from 'lucide-react';

import { Button, LoadingCard, LoadingSkeleton } from '@/components/ui';
import TaskCard from './TaskCard';
import TaskFilters from './TaskFilters';
import { useTasksApi } from '@/hooks/useTasks';
import { Task } from '@/types';
import { cn } from '@/lib/utils';

interface TaskListProps {
  initialTasks?: Task[];
  showFilters?: boolean;
  layout?: 'list' | 'grid' | 'compact';
  onTaskSelect?: (task: Task) => void;
  className?: string;
}

export const TaskList: React.FC<TaskListProps> = ({
  initialTasks,
  showFilters = true,
  layout: initialLayout = 'list',
  onTaskSelect,
  className,
}) => {
  const {
    tasks,
    filters,
    sortOptions,
    pagination,
    loading,
    errors,
    fetchTasks,
    updateFilters,
    updateSort,
    loadMoreTasks,
    refreshTasks,
  } = useTasksApi();

  const [layout, setLayout] = useState(initialLayout);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize tasks
  useEffect(() => {
    if (!isInitialized) {
      if (initialTasks) {
        // Use initial tasks if provided
        setIsInitialized(true);
      } else {
        // Fetch tasks from API
        fetchTasks().finally(() => setIsInitialized(true));
      }
    }
  }, [isInitialized, initialTasks, fetchTasks]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop !==
      document.documentElement.offsetHeight ||
      loading.fetchTasks ||
      !pagination.hasMore
    ) {
      return;
    }

    loadMoreTasks();
  }, [loading.fetchTasks, pagination.hasMore, loadMoreTasks]);

  // Attach scroll listener
  useEffect(() => {
    if (isInitialized) {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [isInitialized, handleScroll]);

  const renderTasksGrid = () => {
    const gridClasses = {
      grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
      list: 'space-y-4',
      compact: 'space-y-2',
    };

    return (
      <div className={gridClasses[layout]}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            layout={layout === 'compact' ? 'compact' : layout === 'grid' ? 'grid' : 'detailed'}
            onTaskClick={onTaskSelect}
          />
        ))}
      </div>
    );
  };

  const renderLoadingState = () => {
    const count = layout === 'grid' ? 6 : 4;
    const gridClasses = layout === 'grid' ?
      'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' :
      'space-y-4';

    return (
      <div className={gridClasses}>
        {Array.from({ length: count }).map((_, i) => (
          <LoadingCard
            key={i}
            showAvatar
            showActions
            lines={layout === 'compact' ? 1 : 3}
            className={layout === 'compact' ? 'h-16' : ''}
          />
        ))}
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-white/60" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">No tasks found</h3>
      <p className="text-white/60 mb-4">
        Try adjusting your filters or check back later for new tasks.
      </p>
      <Button variant="secondary" onClick={refreshTasks}>
        Refresh Tasks
      </Button>
    </div>
  );

  const renderErrorState = () => (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">Failed to load tasks</h3>
      <p className="text-red-400 mb-4">{errors.fetchTasks}</p>
      <Button variant="secondary" onClick={refreshTasks}>
        Try Again
      </Button>
    </div>
  );

  const hasError = !!errors.fetchTasks && tasks.length === 0;
  const isEmpty = !loading.fetchTasks && !hasError && tasks.length === 0;
  const isLoading = loading.fetchTasks && tasks.length === 0;

  return (
    <div className={cn('space-y-6', className)}>
      {showFilters && (
        <TaskFilters
          filters={filters}
          sortOptions={sortOptions}
          onFiltersChange={updateFilters}
          onSortChange={updateSort}
        />
      )}

      {/* Layout and Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-white">
            Available Tasks
          </h2>
          {tasks.length > 0 && (
            <span className="text-sm text-white/60">
              {tasks.length} tasks
              {pagination.hasMore && ' (more available)'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshTasks}
            disabled={loading.fetchTasks}
            leftIcon={
              <RefreshCw
                className={cn(
                  'w-4 h-4',
                  loading.fetchTasks && 'animate-spin'
                )}
              />
            }
          >
            Refresh
          </Button>

          {/* Layout Toggle */}
          <div className="flex rounded-lg border border-white/20 overflow-hidden">
            <button
              onClick={() => setLayout('list')}
              className={cn(
                'px-3 py-2 text-sm transition-colors',
                layout === 'list'
                  ? 'bg-[rgb(25,137,251)] text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('grid')}
              className={cn(
                'px-3 py-2 text-sm transition-colors',
                layout === 'grid'
                  ? 'bg-[rgb(25,137,251)] text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        {isLoading && renderLoadingState()}
        {hasError && renderErrorState()}
        {isEmpty && renderEmptyState()}
        {!isLoading && !hasError && !isEmpty && renderTasksGrid()}

        {/* Load More Loading */}
        {loading.fetchTasks && tasks.length > 0 && (
          <div className="py-8">
            <div className="flex justify-center">
              <LoadingSkeleton width={200} height="2rem" />
            </div>
          </div>
        )}

        {/* Load More Button (fallback for infinite scroll) */}
        {!loading.fetchTasks && pagination.hasMore && tasks.length > 0 && (
          <div className="flex justify-center py-8">
            <Button
              variant="secondary"
              onClick={loadMoreTasks}
              disabled={loading.fetchTasks}
            >
              Load More Tasks
            </Button>
          </div>
        )}

        {/* End of results indicator */}
        {!pagination.hasMore && tasks.length > 0 && (
          <div className="text-center py-8 text-white/50 text-sm">
            You've reached the end of available tasks
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskList;