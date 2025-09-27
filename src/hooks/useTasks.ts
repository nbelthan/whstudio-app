/**
 * Custom hooks for task-related operations
 * Simplified version to avoid infinite loops
 */

'use client';

import { useState, useEffect } from 'react';
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
  console.log('🔍 useTasks: Hook called with options:', options);

  const {
    initialFilters = {},
    limit = 20,
    autoFetch = true
  } = options;

  // State management
  const [tasks, setTasksState] = useState<Task[]>([]);

  const setTasks = (newTasks: Task[]) => {
    console.log('🎯 useTasks: setTasks called with', newTasks?.length || 0, 'tasks');
    setTasksState(newTasks);
  };
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFilters>(initialFilters);
  const [pagination, setPagination] = useState({
    limit,
    offset: 0,
    count: 0,
    total: 0,
    has_more: false
  });

  console.log('🔍 useTasks: State initialized, tasks.length:', tasks.length);

  // Fetch function
  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 useTasks: Starting fetch');

      // Use relative URL since we're client-side now
      const url = '/api/tasks?limit=20&offset=0';
      console.log('🔍 useTasks: Fetching from:', url);

      const response = await fetch(url);
      console.log('🔍 useTasks: fetch response:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🔍 useTasks: fetch data:', data);

      if (data.success && data.tasks) {
        console.log('🔍 useTasks: Setting', data.tasks.length, 'tasks');
        setTasks(data.tasks);
        setPagination(data.pagination);
      } else {
        console.error('🔍 useTasks: API returned success=false or no tasks');
        setError('Failed to fetch tasks');
      }

    } catch (err) {
      console.error('🔍 useTasks: fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Use useEffect that only runs on client side
  useEffect(() => {
    console.log('🔍 useTasks: useEffect ACTUALLY RUNS! autoFetch:', autoFetch);

    // Always fetch if autoFetch is true
    if (autoFetch) {
      fetchTasks();
    }

    return () => {
      console.log('🔍 useTasks: useEffect cleanup');
    };
  }, []); // Empty dependency array - run once on mount

  console.log('🔍 useTasks: Returning state with', tasks.length, 'tasks');

  // Simplified return with dummy functions
  return {
    tasks,
    categories,
    loading,
    error,
    pagination,
    filters,
    setFilters: () => {},
    refreshTasks: async () => {},
    loadMore: async () => {},
    categoriesLoading,
    categoriesError,
    refreshCategories: async () => {}
  };
}

/**
 * Hook for fetching a single task by ID
 */
export function useTask(taskId: string | null) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      return;
    }

    const fetchTask = async () => {
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
    };

    fetchTask();
  }, [taskId]);

  return {
    task,
    loading,
    error,
    refetch: () => {
      // Re-trigger the effect by updating a dependency
    }
  };
}