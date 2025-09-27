/**
 * Custom hooks for task-related operations
 * Handles fetching, filtering, and managing task state
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task, TaskCategory, TasksResponse } from '@/types';

interface TaskFilters {
  category?: string;
  difficulty?: number;
  task_type?: string;
  search?: string;
  sort?: string;
  status?: string;
}

interface UseTasksOptions {
  initialFilters?: TaskFilters;
  limit?: number;
  autoFetch?: boolean;
}

interface UseTasksReturn {
  tasks: Task[];
  categories: TaskCategory[];
  loading: boolean;
  error: string | null;
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
    has_more: boolean;
  };
  filters: TaskFilters;
  setFilters: (filters: TaskFilters) => void;
  refreshTasks: () => Promise<void>;
  loadMore: () => Promise<void>;
  categoriesLoading: boolean;
  categoriesError: string | null;
  refreshCategories: () => Promise<void>;
}

export function useTasks(options: UseTasksOptions = {}): UseTasksReturn {
  const {
    initialFilters = {},
    limit = 20,
    autoFetch = true
  } = options;

  // State management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<TaskFilters>(initialFilters);
  const [pagination, setPagination] = useState({
    limit,
    offset: 0,
    count: 0,
    total: 0,
    has_more: false
  });

  /**
   * Fetch tasks from the API
   */
  const fetchTasks = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const offset = reset ? 0 : pagination.offset;
      const searchParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(filters.category && { category: filters.category }),
        ...(filters.difficulty && { difficulty: filters.difficulty.toString() }),
        ...(filters.task_type && { task_type: filters.task_type }),
        ...(filters.search && { search: filters.search }),
        ...(filters.sort && { sort: filters.sort }),
        ...(filters.status && { status: filters.status })
      });

      const response = await fetch(`/api/tasks?${searchParams.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: TasksResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch tasks');
      }

      if (reset) {
        setTasks(data.tasks);
        setPagination({
          ...data.pagination,
          offset: data.pagination.count
        });
      } else {
        // Append new tasks for load more functionality
        setTasks(prev => [...prev, ...data.tasks]);
        setPagination(prev => ({
          ...data.pagination,
          offset: prev.offset + data.pagination.count
        }));
      }

    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters, limit, pagination.offset]);

  /**
   * Fetch categories from the API
   */
  const fetchCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError(null);

      const response = await fetch('/api/tasks/categories');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch categories');
      }

      setCategories(data.categories);

    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setCategoriesError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  /**
   * Set filters and reset pagination
   */
  const setFilters = useCallback((newFilters: TaskFilters) => {
    setFiltersState(newFilters);
    setPagination(prev => ({ ...prev, offset: 0 }));
  }, []);

  /**
   * Refresh tasks (reset and fetch from beginning)
   */
  const refreshTasks = useCallback(async () => {
    setPagination(prev => ({ ...prev, offset: 0 }));
    await fetchTasks(true);
  }, [fetchTasks]);

  /**
   * Load more tasks (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!loading && pagination.has_more) {
      await fetchTasks(false);
    }
  }, [fetchTasks, loading, pagination.has_more]);

  /**
   * Refresh categories
   */
  const refreshCategories = useCallback(async () => {
    await fetchCategories();
  }, [fetchCategories]);

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    if (autoFetch) {
      refreshTasks();
    }
  }, [refreshTasks, autoFetch, filters]);

  // Auto-fetch categories on mount
  useEffect(() => {
    if (autoFetch) {
      fetchCategories();
    }
  }, [fetchCategories, autoFetch]);

  return {
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
    categoriesError,
    refreshCategories
  };
}

/**
 * Hook for fetching a single task by ID
 */
export function useTask(taskId: string | null) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = useCallback(async () => {
    if (!taskId) {
      setTask(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tasks/${taskId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch task');
      }

      setTask(data.task);

    } catch (err) {
      console.error('Failed to fetch task:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  return {
    task,
    loading,
    error,
    refetch: fetchTask
  };
}