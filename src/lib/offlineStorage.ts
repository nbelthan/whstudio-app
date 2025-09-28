/**
 * Offline storage utilities for task data and app state
 * Uses IndexedDB for structured data and localStorage for simple data
 */

import { Task, TaskSubmission, User } from '@/types';

// Database configuration
const DB_NAME = 'WHStudioOfflineDB';
const DB_VERSION = 1;

// Store names
const STORES = {
  TASKS: 'tasks',
  SUBMISSIONS: 'submissions',
  USER_DATA: 'userData',
  QUEUE: 'actionQueue',
  CACHE: 'apiCache',
  SETTINGS: 'settings',
} as const;

// Data interfaces
export interface OfflineTask extends Task {
  lastModified: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
  localChanges?: Partial<Task>;
}

export interface OfflineSubmission extends TaskSubmission {
  lastModified: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
  localChanges?: Partial<TaskSubmission>;
  retryCount: number;
}

export interface QueuedAction {
  id: string;
  type: 'submit_task' | 'update_profile' | 'payment_request' | 'api_call';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  lastAttempt?: number;
  url?: string;
  method?: string;
}

export interface CachedApiResponse {
  url: string;
  data: any;
  timestamp: number;
  ttl: number;
  etag?: string;
}

export interface OfflineSettings {
  enableOfflineMode: boolean;
  syncFrequency: number;
  maxCacheSize: number;
  keepDataDays: number;
  autoSync: boolean;
  compressData: boolean;
}

// Database instance
let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB database
 */
export async function initOfflineStorage(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB initialized successfully');
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Tasks store
      if (!database.objectStoreNames.contains(STORES.TASKS)) {
        const tasksStore = database.createObjectStore(STORES.TASKS, { keyPath: 'id' });
        tasksStore.createIndex('category', 'category');
        tasksStore.createIndex('status', 'status');
        tasksStore.createIndex('syncStatus', 'syncStatus');
        tasksStore.createIndex('lastModified', 'lastModified');
      }

      // Submissions store
      if (!database.objectStoreNames.contains(STORES.SUBMISSIONS)) {
        const submissionsStore = database.createObjectStore(STORES.SUBMISSIONS, { keyPath: 'id' });
        submissionsStore.createIndex('taskId', 'task_id');
        submissionsStore.createIndex('userId', 'user_id');
        submissionsStore.createIndex('status', 'status');
        submissionsStore.createIndex('syncStatus', 'syncStatus');
        submissionsStore.createIndex('lastModified', 'lastModified');
      }

      // User data store
      if (!database.objectStoreNames.contains(STORES.USER_DATA)) {
        const userStore = database.createObjectStore(STORES.USER_DATA, { keyPath: 'id' });
        userStore.createIndex('lastModified', 'lastModified');
      }

      // Action queue store
      if (!database.objectStoreNames.contains(STORES.QUEUE)) {
        const queueStore = database.createObjectStore(STORES.QUEUE, { keyPath: 'id' });
        queueStore.createIndex('type', 'type');
        queueStore.createIndex('timestamp', 'timestamp');
        queueStore.createIndex('retryCount', 'retryCount');
      }

      // API cache store
      if (!database.objectStoreNames.contains(STORES.CACHE)) {
        const cacheStore = database.createObjectStore(STORES.CACHE, { keyPath: 'url' });
        cacheStore.createIndex('timestamp', 'timestamp');
        cacheStore.createIndex('ttl', 'ttl');
      }

      // Settings store
      if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
        database.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Generic database operations
 */
async function performDbOperation<T>(
  storeName: string,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
  mode: IDBTransactionMode = 'readonly'
): Promise<T> {
  if (!db) {
    await initOfflineStorage();
  }

  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not available'));
      return;
    }

    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Task storage operations
 */
export const taskStorage = {
  /**
   * Save tasks to offline storage
   */
  async saveTasks(tasks: Task[]): Promise<void> {
    const offlineTasks: OfflineTask[] = tasks.map(task => ({
      ...task,
      lastModified: Date.now(),
      syncStatus: 'synced',
    }));

    await performDbOperation(
      STORES.TASKS,
      (store) => {
        const promises = offlineTasks.map(task => store.put(task));
        return promises[promises.length - 1]; // Return the last promise
      },
      'readwrite'
    );
  },

  /**
   * Get tasks from offline storage
   */
  async getTasks(filters?: {
    category?: string;
    status?: string;
    syncStatus?: string;
  }): Promise<OfflineTask[]> {
    return performDbOperation(STORES.TASKS, (store) => {
      if (!filters) {
        return store.getAll();
      }

      // If we have filters, use appropriate index
      if (filters.category) {
        const index = store.index('category');
        return index.getAll(filters.category);
      }

      if (filters.status) {
        const index = store.index('status');
        return index.getAll(filters.status);
      }

      if (filters.syncStatus) {
        const index = store.index('syncStatus');
        return index.getAll(filters.syncStatus);
      }

      return store.getAll();
    });
  },

  /**
   * Get a single task by ID
   */
  async getTask(taskId: string): Promise<OfflineTask | null> {
    const result = await performDbOperation(STORES.TASKS, (store) => store.get(taskId));
    return result || null;
  },

  /**
   * Update task sync status
   */
  async updateTaskSyncStatus(taskId: string, syncStatus: 'synced' | 'pending' | 'conflict'): Promise<void> {
    const task = await this.getTask(taskId);
    if (task) {
      task.syncStatus = syncStatus;
      task.lastModified = Date.now();
      await performDbOperation(STORES.TASKS, (store) => store.put(task), 'readwrite');
    }
  },

  /**
   * Mark task for local changes
   */
  async updateTaskLocally(taskId: string, changes: Partial<Task>): Promise<void> {
    const task = await this.getTask(taskId);
    if (task) {
      task.localChanges = { ...task.localChanges, ...changes };
      task.syncStatus = 'pending';
      task.lastModified = Date.now();
      await performDbOperation(STORES.TASKS, (store) => store.put(task), 'readwrite');
    }
  },

  /**
   * Delete task from offline storage
   */
  async deleteTask(taskId: string): Promise<void> {
    await performDbOperation(STORES.TASKS, (store) => store.delete(taskId), 'readwrite');
  },

  /**
   * Clear all tasks
   */
  async clearTasks(): Promise<void> {
    await performDbOperation(STORES.TASKS, (store) => store.clear(), 'readwrite');
  },
};

/**
 * Submission storage operations
 */
export const submissionStorage = {
  /**
   * Save submission to offline storage
   */
  async saveSubmission(submission: TaskSubmission): Promise<void> {
    const offlineSubmission: OfflineSubmission = {
      ...submission,
      lastModified: Date.now(),
      syncStatus: 'pending',
      retryCount: 0,
    };

    await performDbOperation(STORES.SUBMISSIONS, (store) => store.put(offlineSubmission), 'readwrite');
  },

  /**
   * Get submissions from offline storage
   */
  async getSubmissions(filters?: {
    taskId?: string;
    userId?: string;
    status?: string;
    syncStatus?: string;
  }): Promise<OfflineSubmission[]> {
    return performDbOperation(STORES.SUBMISSIONS, (store) => {
      if (!filters) {
        return store.getAll();
      }

      if (filters.taskId) {
        const index = store.index('taskId');
        return index.getAll(filters.taskId);
      }

      if (filters.userId) {
        const index = store.index('userId');
        return index.getAll(filters.userId);
      }

      if (filters.status) {
        const index = store.index('status');
        return index.getAll(filters.status);
      }

      if (filters.syncStatus) {
        const index = store.index('syncStatus');
        return index.getAll(filters.syncStatus);
      }

      return store.getAll();
    });
  },

  /**
   * Get a single submission by ID
   */
  async getSubmission(submissionId: string): Promise<OfflineSubmission | null> {
    const result = await performDbOperation(STORES.SUBMISSIONS, (store) => store.get(submissionId));
    return result || null;
  },

  /**
   * Update submission sync status
   */
  async updateSubmissionSyncStatus(submissionId: string, syncStatus: 'synced' | 'pending' | 'conflict'): Promise<void> {
    const submission = await this.getSubmission(submissionId);
    if (submission) {
      submission.syncStatus = syncStatus;
      submission.lastModified = Date.now();
      await performDbOperation(STORES.SUBMISSIONS, (store) => store.put(submission), 'readwrite');
    }
  },

  /**
   * Increment retry count for submission
   */
  async incrementRetryCount(submissionId: string): Promise<void> {
    const submission = await this.getSubmission(submissionId);
    if (submission) {
      submission.retryCount += 1;
      submission.lastModified = Date.now();
      await performDbOperation(STORES.SUBMISSIONS, (store) => store.put(submission), 'readwrite');
    }
  },

  /**
   * Delete submission from offline storage
   */
  async deleteSubmission(submissionId: string): Promise<void> {
    await performDbOperation(STORES.SUBMISSIONS, (store) => store.delete(submissionId), 'readwrite');
  },

  /**
   * Clear all submissions
   */
  async clearSubmissions(): Promise<void> {
    await performDbOperation(STORES.SUBMISSIONS, (store) => store.clear(), 'readwrite');
  },
};

/**
 * Action queue operations
 */
export const actionQueue = {
  /**
   * Add action to queue
   */
  async enqueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const queuedAction: QueuedAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    await performDbOperation(STORES.QUEUE, (store) => store.add(queuedAction), 'readwrite');
    return queuedAction.id;
  },

  /**
   * Get all queued actions
   */
  async getAll(): Promise<QueuedAction[]> {
    return performDbOperation(STORES.QUEUE, (store) => store.getAll());
  },

  /**
   * Get actions by type
   */
  async getByType(type: QueuedAction['type']): Promise<QueuedAction[]> {
    return performDbOperation(STORES.QUEUE, (store) => {
      const index = store.index('type');
      return index.getAll(type);
    });
  },

  /**
   * Update action retry count
   */
  async incrementRetry(actionId: string): Promise<void> {
    const action = await performDbOperation(STORES.QUEUE, (store) => store.get(actionId));
    if (action) {
      action.retryCount += 1;
      action.lastAttempt = Date.now();
      await performDbOperation(STORES.QUEUE, (store) => store.put(action), 'readwrite');
    }
  },

  /**
   * Remove action from queue
   */
  async dequeue(actionId: string): Promise<void> {
    await performDbOperation(STORES.QUEUE, (store) => store.delete(actionId), 'readwrite');
  },

  /**
   * Clear all actions
   */
  async clear(): Promise<void> {
    await performDbOperation(STORES.QUEUE, (store) => store.clear(), 'readwrite');
  },

  /**
   * Get actions that need retry
   */
  async getRetryable(): Promise<QueuedAction[]> {
    const actions = await this.getAll();
    const now = Date.now();
    const retryDelay = 5 * 60 * 1000; // 5 minutes

    return actions.filter(action => {
      if (action.retryCount >= action.maxRetries) return false;
      if (!action.lastAttempt) return true;
      return now - action.lastAttempt > retryDelay;
    });
  },
};

/**
 * API cache operations
 */
export const apiCache = {
  /**
   * Store API response in cache
   */
  async set(url: string, data: any, ttl: number = 5 * 60 * 1000): Promise<void> {
    const cachedResponse: CachedApiResponse = {
      url,
      data,
      timestamp: Date.now(),
      ttl,
    };

    await performDbOperation(STORES.CACHE, (store) => store.put(cachedResponse), 'readwrite');
  },

  /**
   * Get cached API response
   */
  async get(url: string): Promise<any | null> {
    const cached = await performDbOperation(STORES.CACHE, (store) => store.get(url));

    if (!cached) return null;

    // Check if cache is expired
    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      await this.delete(url);
      return null;
    }

    return cached.data;
  },

  /**
   * Delete cached response
   */
  async delete(url: string): Promise<void> {
    await performDbOperation(STORES.CACHE, (store) => store.delete(url), 'readwrite');
  },

  /**
   * Clear expired cache entries
   */
  async clearExpired(): Promise<void> {
    const allCached = await performDbOperation(STORES.CACHE, (store) => store.getAll());
    const now = Date.now();

    for (const cached of allCached) {
      if (now - cached.timestamp > cached.ttl) {
        await this.delete(cached.url);
      }
    }
  },

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    await performDbOperation(STORES.CACHE, (store) => store.clear(), 'readwrite');
  },

  /**
   * Get cache size
   */
  async getSize(): Promise<number> {
    const allCached = await performDbOperation(STORES.CACHE, (store) => store.getAll());
    return allCached.length;
  },
};

/**
 * Settings operations
 */
export const settingsStorage = {
  /**
   * Get settings
   */
  async getSettings(): Promise<OfflineSettings> {
    const result = await performDbOperation(STORES.SETTINGS, (store) => store.get('offline_settings'));

    return result?.value || {
      enableOfflineMode: true,
      syncFrequency: 30000, // 30 seconds
      maxCacheSize: 100,
      keepDataDays: 7,
      autoSync: true,
      compressData: false,
    };
  },

  /**
   * Update settings
   */
  async updateSettings(settings: Partial<OfflineSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };

    await performDbOperation(
      STORES.SETTINGS,
      (store) => store.put({ key: 'offline_settings', value: updated }),
      'readwrite'
    );
  },
};

/**
 * Storage management utilities
 */
export const storageManager = {
  /**
   * Get storage usage statistics
   */
  async getUsageStats(): Promise<{
    tasks: number;
    submissions: number;
    cache: number;
    queue: number;
    totalSizeMB: number;
  }> {
    const [tasks, submissions, cache, queue] = await Promise.all([
      taskStorage.getTasks(),
      submissionStorage.getSubmissions(),
      apiCache.getSize(),
      actionQueue.getAll(),
    ]);

    // Rough estimation of storage size
    const totalSizeMB = Math.round(
      (JSON.stringify({ tasks, submissions, queue }).length / 1024 / 1024 + cache * 0.01) * 100
    ) / 100;

    return {
      tasks: tasks.length,
      submissions: submissions.length,
      cache,
      queue: queue.length,
      totalSizeMB,
    };
  },

  /**
   * Clean up old data
   */
  async cleanup(olderThanDays: number = 7): Promise<void> {
    const cutoffDate = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    // Clean up old tasks
    const tasks = await taskStorage.getTasks();
    for (const task of tasks) {
      if (task.lastModified < cutoffDate && task.syncStatus === 'synced') {
        await taskStorage.deleteTask(task.id);
      }
    }

    // Clean up old submissions
    const submissions = await submissionStorage.getSubmissions();
    for (const submission of submissions) {
      if (submission.lastModified < cutoffDate && submission.syncStatus === 'synced') {
        await submissionStorage.deleteSubmission(submission.id);
      }
    }

    // Clean up expired cache
    await apiCache.clearExpired();

    // Clean up old queue items that have exceeded max retries
    const queueItems = await actionQueue.getAll();
    for (const item of queueItems) {
      if (item.timestamp < cutoffDate || item.retryCount >= item.maxRetries) {
        await actionQueue.dequeue(item.id);
      }
    }
  },

  /**
   * Clear all offline data
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      taskStorage.clearTasks(),
      submissionStorage.clearSubmissions(),
      actionQueue.clear(),
      apiCache.clear(),
    ]);
  },

  /**
   * Export data for backup
   */
  async exportData(): Promise<string> {
    const [tasks, submissions, settings] = await Promise.all([
      taskStorage.getTasks(),
      submissionStorage.getSubmissions(),
      settingsStorage.getSettings(),
    ]);

    return JSON.stringify({
      version: DB_VERSION,
      timestamp: Date.now(),
      data: { tasks, submissions, settings },
    });
  },

  /**
   * Import data from backup
   */
  async importData(exportedData: string): Promise<void> {
    try {
      const { data } = JSON.parse(exportedData);
      const { tasks, submissions, settings } = data;

      await Promise.all([
        taskStorage.saveTasks(tasks || []),
        Promise.all((submissions || []).map((s: TaskSubmission) => submissionStorage.saveSubmission(s))),
        settings ? settingsStorage.updateSettings(settings) : Promise.resolve(),
      ]);
    } catch (error) {
      throw new Error('Invalid backup data format');
    }
  },
};

// Initialize storage on module load
if (typeof window !== 'undefined') {
  initOfflineStorage().catch(console.error);
}

export default {
  init: initOfflineStorage,
  tasks: taskStorage,
  submissions: submissionStorage,
  queue: actionQueue,
  cache: apiCache,
  settings: settingsStorage,
  manager: storageManager,
};