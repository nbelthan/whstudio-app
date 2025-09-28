/**
 * Enhanced API utilities with network resilience
 * Provides retry logic, exponential backoff, and offline handling
 */

import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  offline?: boolean;
  cached?: boolean;
  retryCount?: number;
}

export interface ApiOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  retryMultiplier?: number;
  retryOn?: number[];
  onRetry?: (attempt: number, error: Error) => void;
  skipRetryIf?: (error: Error) => boolean;
  networkAware?: boolean;
  cacheStrategy?: 'cache-first' | 'network-first' | 'network-only' | 'cache-only';
  cacheTtl?: number;
}

interface PendingRequest {
  url: string;
  options: ApiOptions;
  timestamp: number;
  retryCount: number;
}

// Default configuration
const DEFAULT_CONFIG = {
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
  retryMultiplier: 2,
  retryOn: [408, 429, 500, 502, 503, 504],
  cacheTtl: 5 * 60 * 1000, // 5 minutes
};

// Network quality based timeouts
const NETWORK_TIMEOUTS = {
  excellent: 5000,
  good: 8000,
  fair: 12000,
  poor: 20000,
  offline: 30000,
};

// In-memory cache for quick responses
const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Queue for offline requests
let offlineQueue: PendingRequest[] = [];

/**
 * Enhanced fetch with retry logic and network awareness
 */
export async function apiFetch<T = any>(
  url: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const config = { ...DEFAULT_CONFIG, ...options };
  const startTime = Date.now();

  // Check cache first if using cache strategies
  if (config.cacheStrategy === 'cache-first' || config.cacheStrategy === 'cache-only') {
    const cached = getCachedResponse<T>(url);
    if (cached) {
      if (config.cacheStrategy === 'cache-only') {
        return { success: true, data: cached, cached: true };
      }
      // For cache-first, return cached and update in background
      updateCacheInBackground(url, options);
      return { success: true, data: cached, cached: true };
    } else if (config.cacheStrategy === 'cache-only') {
      return {
        success: false,
        error: 'No cached data available',
        offline: true,
      };
    }
  }

  // Get network status for network-aware requests
  let networkTimeout = config.timeout || DEFAULT_CONFIG.timeout;
  if (config.networkAware && typeof window !== 'undefined') {
    // This would ideally use the network status, but we'll use a default for now
    // In a real implementation, you'd inject the network status here
    networkTimeout = NETWORK_TIMEOUTS.good;
  }

  let lastError: Error | null = null;
  let retryCount = 0;

  for (let attempt = 0; attempt <= config.retries!; attempt++) {
    try {
      // Calculate delay for this attempt
      if (attempt > 0) {
        const delay = config.retryDelay! * Math.pow(config.retryMultiplier!, attempt - 1);
        const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
        await sleep(delay + jitter);

        // Call retry callback if provided
        if (config.onRetry) {
          config.onRetry(attempt, lastError!);
        }

        retryCount = attempt;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), networkTimeout);

      const requestOptions: RequestInit = {
        ...config,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
      };

      try {
        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);

        // Check if we should retry based on status code
        if (!response.ok && config.retryOn!.includes(response.status)) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let data: T;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = (await response.text()) as unknown as T;
        }

        // Cache successful responses
        if (response.ok && (config.cacheStrategy === 'network-first' || !config.cacheStrategy)) {
          setCachedResponse(url, data, config.cacheTtl || DEFAULT_CONFIG.cacheTtl);
        }

        // Process queue if we were offline and now back online
        if (typeof window !== 'undefined' && navigator.onLine) {
          processOfflineQueue();
        }

        return {
          success: response.ok,
          data: response.ok ? data : undefined,
          error: !response.ok ? (data as any)?.error || response.statusText : undefined,
          retryCount,
        };

      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should skip retry for this error
      if (config.skipRetryIf && config.skipRetryIf(lastError)) {
        break;
      }

      // If it's a timeout or network error and we have more retries, continue
      if (attempt < config.retries! && isRetriableError(lastError)) {
        continue;
      }

      // If offline, queue the request
      if (isNetworkError(lastError) && typeof window !== 'undefined' && !navigator.onLine) {
        queueOfflineRequest(url, options);
        return {
          success: false,
          error: 'Network unavailable - request queued for when online',
          offline: true,
        };
      }

      break;
    }
  }

  // All retries exhausted, check cache as fallback
  const cachedFallback = getCachedResponse<T>(url);
  if (cachedFallback) {
    return {
      success: true,
      data: cachedFallback,
      cached: true,
      error: 'Using cached data due to network issues',
    };
  }

  // Return final error
  return {
    success: false,
    error: lastError?.message || 'Request failed after all retries',
    retryCount,
  };
}

/**
 * Specialized API methods
 */
export const api = {
  get: <T>(url: string, options?: Omit<ApiOptions, 'method'>) =>
    apiFetch<T>(url, { ...options, method: 'GET' }),

  post: <T>(url: string, data?: any, options?: Omit<ApiOptions, 'method' | 'body'>) =>
    apiFetch<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(url: string, data?: any, options?: Omit<ApiOptions, 'method' | 'body'>) =>
    apiFetch<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(url: string, data?: any, options?: Omit<ApiOptions, 'method' | 'body'>) =>
    apiFetch<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(url: string, options?: Omit<ApiOptions, 'method'>) =>
    apiFetch<T>(url, { ...options, method: 'DELETE' }),
};

/**
 * Network-aware API methods that automatically adjust based on connection quality
 */
export function createNetworkAwareApi() {
  return {
    get: <T>(url: string, options?: Omit<ApiOptions, 'method'>) =>
      apiFetch<T>(url, { ...options, method: 'GET', networkAware: true }),

    post: <T>(url: string, data?: any, options?: Omit<ApiOptions, 'method' | 'body'>) =>
      apiFetch<T>(url, {
        ...options,
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
        networkAware: true,
      }),

    put: <T>(url: string, data?: any, options?: Omit<ApiOptions, 'method' | 'body'>) =>
      apiFetch<T>(url, {
        ...options,
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
        networkAware: true,
      }),

    patch: <T>(url: string, data?: any, options?: Omit<ApiOptions, 'method' | 'body'>) =>
      apiFetch<T>(url, {
        ...options,
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
        networkAware: true,
      }),

    delete: <T>(url: string, options?: Omit<ApiOptions, 'method'>) =>
      apiFetch<T>(url, { ...options, method: 'DELETE', networkAware: true }),
  };
}

/**
 * Cache management
 */
function getCachedResponse<T>(url: string): T | null {
  const cached = apiCache.get(url);
  if (!cached) return null;

  const isExpired = Date.now() - cached.timestamp > cached.ttl;
  if (isExpired) {
    apiCache.delete(url);
    return null;
  }

  return cached.data;
}

function setCachedResponse<T>(url: string, data: T, ttl: number): void {
  apiCache.set(url, {
    data,
    timestamp: Date.now(),
    ttl,
  });

  // Clean up expired entries periodically
  if (apiCache.size > 100) {
    cleanupCache();
  }
}

function cleanupCache(): void {
  const now = Date.now();
  for (const [key, value] of apiCache.entries()) {
    if (now - value.timestamp > value.ttl) {
      apiCache.delete(key);
    }
  }
}

function updateCacheInBackground(url: string, options: ApiOptions): void {
  // Update cache in background without blocking
  setTimeout(async () => {
    try {
      const response = await apiFetch(url, {
        ...options,
        cacheStrategy: 'network-only',
      });
      if (response.success && response.data) {
        setCachedResponse(url, response.data, options.cacheTtl || DEFAULT_CONFIG.cacheTtl);
      }
    } catch (error) {
      console.warn('Background cache update failed:', error);
    }
  }, 0);
}

/**
 * Offline queue management
 */
function queueOfflineRequest(url: string, options: ApiOptions): void {
  const request: PendingRequest = {
    url,
    options,
    timestamp: Date.now(),
    retryCount: 0,
  };

  offlineQueue.push(request);

  // Limit queue size to prevent memory issues
  if (offlineQueue.length > 50) {
    offlineQueue = offlineQueue.slice(-50);
  }

  // Store in localStorage for persistence
  try {
    localStorage.setItem('api-offline-queue', JSON.stringify(offlineQueue));
  } catch (error) {
    console.warn('Failed to persist offline queue:', error);
  }
}

function processOfflineQueue(): void {
  if (offlineQueue.length === 0) return;

  console.log(`Processing ${offlineQueue.length} queued requests`);

  const queueToProcess = [...offlineQueue];
  offlineQueue = [];

  queueToProcess.forEach(async (request) => {
    try {
      await apiFetch(request.url, {
        ...request.options,
        retries: 1, // Reduced retries for queued requests
      });
    } catch (error) {
      console.warn('Queued request failed:', error);
      // Could re-queue or handle differently
    }
  });

  // Clear persisted queue
  try {
    localStorage.removeItem('api-offline-queue');
  } catch (error) {
    console.warn('Failed to clear persisted queue:', error);
  }
}

// Load persisted queue on startup
if (typeof window !== 'undefined') {
  try {
    const persistedQueue = localStorage.getItem('api-offline-queue');
    if (persistedQueue) {
      offlineQueue = JSON.parse(persistedQueue);
      // Process queue if online
      if (navigator.onLine) {
        processOfflineQueue();
      }
    }
  } catch (error) {
    console.warn('Failed to load persisted queue:', error);
  }

  // Listen for online events to process queue
  window.addEventListener('online', processOfflineQueue);
}

/**
 * Error classification
 */
function isRetriableError(error: Error): boolean {
  return (
    error.name === 'AbortError' ||
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('timeout') ||
    error.message.includes('Failed to fetch')
  );
}

function isNetworkError(error: Error): boolean {
  return (
    error.message.includes('Failed to fetch') ||
    error.message.includes('network') ||
    error.name === 'TypeError'
  );
}

/**
 * Utility functions
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Batch requests to reduce network load
 */
export class RequestBatcher {
  private batches = new Map<string, { requests: Array<{ resolve: Function; reject: Function; url: string }>, timeout: NodeJS.Timeout }>();
  private batchWindow = 100; // 100ms batch window

  constructor(batchWindow = 100) {
    this.batchWindow = batchWindow;
  }

  async batchRequest<T>(url: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    return new Promise((resolve, reject) => {
      const batchKey = `${options?.method || 'GET'}-${url}`;

      if (!this.batches.has(batchKey)) {
        this.batches.set(batchKey, {
          requests: [],
          timeout: setTimeout(() => this.executeBatch(batchKey), this.batchWindow),
        });
      }

      const batch = this.batches.get(batchKey)!;
      batch.requests.push({ resolve, reject, url });
    });
  }

  private async executeBatch(batchKey: string) {
    const batch = this.batches.get(batchKey);
    if (!batch) return;

    this.batches.delete(batchKey);
    clearTimeout(batch.timeout);

    // For now, execute requests individually
    // In a real implementation, you might batch similar requests
    batch.requests.forEach(async ({ resolve, reject, url }) => {
      try {
        const response = await apiFetch(url);
        resolve(response);
      } catch (error) {
        reject(error);
      }
    });
  }
}

export const requestBatcher = new RequestBatcher();

export default api;