/**
 * Custom hooks for task-related operations
 * Handles fetching, filtering, and managing task state
 */

import { useCallback, useEffect } from 'react';
import { useTasks, useAuth, useUI } from '@/stores';
import { Task, TaskFilters, TaskSortOptions, TasksResponse } from '@/types';
import { parseErrorMessage } from '@/lib/utils';

export const useTasksApi = () => {
  const {
    tasks,
    filters,
    sortOptions,
    pagination,
    loading,
    errors,
    setTasks,
    addTasks,
    setTaskLoading,
    setTaskError,
    setPagination,
    setFilters,
    setSortOptions,
    resetTasks,
  } = useTasks();

  const { user } = useAuth();
  const { addNotification } = useUI();

  // Fetch tasks from API
  const fetchTasks = useCallback(async (
    loadMore = false,
    customFilters?: Partial<TaskFilters>,
    customSort?: TaskSortOptions
  ) => {
    const key = 'fetchTasks';
    setTaskLoading(key, true);
    setTaskError(key, null);

    try {
      const searchParams = new URLSearchParams();

      // Pagination
      const currentOffset = loadMore ? pagination.offset + pagination.limit : 0;
      searchParams.set('limit', pagination.limit.toString());
      searchParams.set('offset', currentOffset.toString());

      // Apply filters
      const activeFilters = { ...filters, ...customFilters };
      if (activeFilters.category) searchParams.set('category', activeFilters.category);
      if (activeFilters.task_type) searchParams.set('task_type', activeFilters.task_type);
      if (activeFilters.difficulty_level) searchParams.set('difficulty_level', activeFilters.difficulty_level.toString());
      if (activeFilters.reward_min) searchParams.set('reward_min', activeFilters.reward_min.toString());
      if (activeFilters.reward_max) searchParams.set('reward_max', activeFilters.reward_max.toString());
      if (activeFilters.status) searchParams.set('status', activeFilters.status);
      if (activeFilters.expires_within_hours) searchParams.set('expires_within_hours', activeFilters.expires_within_hours.toString());

      // Apply sorting
      const currentSort = customSort || sortOptions;
      searchParams.set('sort', `${currentSort.field}:${currentSort.direction}`);

      const response = await fetch(`/api/tasks?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: TasksResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch tasks');
      }

      // Update tasks
      if (loadMore) {
        addTasks(data.tasks);
      } else {
        setTasks(data.tasks);
      }

      // Update pagination
      setPagination({
        offset: currentOffset,
        hasMore: data.pagination.has_more,
        total: data.pagination.count,
      });

      return data.tasks;

    } catch (error) {
      const errorMsg = parseErrorMessage(error);
      setTaskError(key, errorMsg);

      addNotification({
        type: 'error',
        title: 'Failed to Load Tasks',
        message: errorMsg,
      });

      throw error;
    } finally {
      setTaskLoading(key, false);
    }
  }, [
    pagination,
    filters,
    sortOptions,
    setTasks,
    addTasks,
    setTaskLoading,
    setTaskError,
    setPagination,
    addNotification,
  ]);

  // Fetch a single task
  const fetchTask = useCallback(async (taskId: string): Promise<Task> => {
    const key = `fetchTask_${taskId}`;
    setTaskLoading(key, true);
    setTaskError(key, null);

    try {
      const response = await fetch(`/api/tasks/${taskId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch task');
      }

      return data.task;

    } catch (error) {
      const errorMsg = parseErrorMessage(error);
      setTaskError(key, errorMsg);
      throw error;
    } finally {
      setTaskLoading(key, false);
    }
  }, [setTaskLoading, setTaskError]);

  // Submit task solution
  const submitTask = useCallback(async (taskId: string, submissionData: any): Promise<void> => {
    const key = `submitTask_${taskId}`;
    setTaskLoading(key, true);
    setTaskError(key, null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to submit task');
      }

      addNotification({
        type: 'success',
        title: 'Task Submitted',
        message: 'Your submission has been sent for review',
      });

      // Refresh tasks to update submission status
      await fetchTasks();

    } catch (error) {
      const errorMsg = parseErrorMessage(error);
      setTaskError(key, errorMsg);

      addNotification({
        type: 'error',
        title: 'Submission Failed',
        message: errorMsg,
      });

      throw error;
    } finally {
      setTaskLoading(key, false);
    }
  }, [setTaskLoading, setTaskError, addNotification, fetchTasks]);

  // Update filters and refresh tasks
  const updateFilters = useCallback(async (newFilters: Partial<TaskFilters>) => {
    setFilters(newFilters);
    resetTasks();
    await fetchTasks(false, newFilters);
  }, [setFilters, resetTasks, fetchTasks]);

  // Update sorting and refresh tasks
  const updateSort = useCallback(async (newSort: TaskSortOptions) => {
    setSortOptions(newSort);
    resetTasks();
    await fetchTasks(false, undefined, newSort);
  }, [setSortOptions, resetTasks, fetchTasks]);

  // Load more tasks (pagination)
  const loadMoreTasks = useCallback(async () => {
    if (!pagination.hasMore || loading.fetchTasks) return;
    await fetchTasks(true);
  }, [pagination.hasMore, loading.fetchTasks, fetchTasks]);

  // Refresh tasks (reset and fetch)
  const refreshTasks = useCallback(async () => {
    resetTasks();
    await fetchTasks();
  }, [resetTasks, fetchTasks]);

  return {
    // State
    tasks,
    filters,
    sortOptions,
    pagination,
    loading,
    errors,

    // Actions
    fetchTasks,
    fetchTask,
    submitTask,
    updateFilters,
    updateSort,
    loadMoreTasks,
    refreshTasks,
    resetTasks,
  };
};

// Hook for task categories
export const useTaskCategories = () => {
  const { taskCategories, setTaskCategories, setDashboardLoading, setDashboardError } = useAuth();

  const fetchCategories = useCallback(async () => {
    const key = 'categories';
    setDashboardLoading(key, true);
    setDashboardError(key, null);

    try {
      const response = await fetch('/api/categories');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch categories');
      }

      setTaskCategories(data.categories);
      return data.categories;

    } catch (error) {
      const errorMsg = parseErrorMessage(error);
      setDashboardError(key, errorMsg);
      throw error;
    } finally {
      setDashboardLoading(key, false);
    }
  }, [setTaskCategories, setDashboardLoading, setDashboardError]);

  // Load categories on mount if not already loaded
  useEffect(() => {
    if (taskCategories.length === 0) {
      fetchCategories().catch(console.error);
    }
  }, [taskCategories.length, fetchCategories]);

  return {
    categories: taskCategories,
    fetchCategories,
  };
};