/**
 * Network Resilience Testing Utility
 * Provides comprehensive testing for offline functionality and network resilience
 */

import { api } from './api';
import offlineStorage from './offlineStorage';

export interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface TestSuite {
  name: string;
  results: TestResult[];
  passed: boolean;
  duration: number;
}

class NetworkResilienceTestRunner {
  private results: TestSuite[] = [];

  /**
   * Run all network resilience tests
   */
  async runAllTests(): Promise<TestSuite[]> {
    console.log('🧪 Starting Network Resilience Tests...');
    this.results = [];

    await this.runBasicConnectivityTests();
    await this.runOfflineStorageTests();
    await this.runServiceWorkerTests();
    await this.runRetryLogicTests();
    await this.runCacheTests();
    await this.runSyncTests();

    console.log('✅ Network Resilience Tests Completed');
    return this.results;
  }

  /**
   * Basic connectivity tests
   */
  private async runBasicConnectivityTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Basic Connectivity',
      results: [],
      passed: true,
      duration: 0,
    };

    const startTime = Date.now();

    // Test 1: Online detection
    suite.results.push(await this.runTest(
      'Online Detection',
      async () => {
        const isOnline = navigator.onLine;
        if (typeof isOnline !== 'boolean') {
          throw new Error('navigator.onLine not available');
        }
        return { isOnline };
      }
    ));

    // Test 2: Network information API
    suite.results.push(await this.runTest(
      'Network Information API',
      async () => {
        const connection = (navigator as any).connection;
        return {
          supported: !!connection,
          effectiveType: connection?.effectiveType,
          downlink: connection?.downlink,
          rtt: connection?.rtt,
        };
      }
    ));

    // Test 3: Performance API
    suite.results.push(await this.runTest(
      'Performance API',
      async () => {
        if (!window.performance) {
          throw new Error('Performance API not available');
        }
        const now = performance.now();
        return { performanceNow: now };
      }
    ));

    suite.duration = Date.now() - startTime;
    suite.passed = suite.results.every(r => r.passed);
    this.results.push(suite);
  }

  /**
   * Offline storage tests
   */
  private async runOfflineStorageTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Offline Storage',
      results: [],
      passed: true,
      duration: 0,
    };

    const startTime = Date.now();

    // Test 1: IndexedDB availability
    suite.results.push(await this.runTest(
      'IndexedDB Availability',
      async () => {
        if (!window.indexedDB) {
          throw new Error('IndexedDB not supported');
        }
        return { supported: true };
      }
    ));

    // Test 2: Initialize offline storage
    suite.results.push(await this.runTest(
      'Initialize Offline Storage',
      async () => {
        await offlineStorage.init();
        return { initialized: true };
      }
    ));

    // Test 3: Save and retrieve task
    suite.results.push(await this.runTest(
      'Save and Retrieve Task',
      async () => {
        const testTask = {
          id: 'test-task-1',
          title: 'Test Task',
          description: 'Test Description',
          category: 'test',
          difficulty: 1 as const,
          task_type: 'data_entry' as const,
          reward_amount: 10,
          reward_currency: 'WLD' as const,
          status: 'active' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          estimated_time: 5,
          instructions: 'Test instructions',
          required_annotations: 1,
        };

        await offlineStorage.tasks.saveTasks([testTask]);
        const retrieved = await offlineStorage.tasks.getTask('test-task-1');

        if (!retrieved || retrieved.id !== 'test-task-1') {
          throw new Error('Task not saved or retrieved correctly');
        }

        // Cleanup
        await offlineStorage.tasks.deleteTask('test-task-1');

        return { taskSaved: true, taskRetrieved: true };
      }
    ));

    // Test 4: Queue action
    suite.results.push(await this.runTest(
      'Queue Action',
      async () => {
        const actionId = await offlineStorage.queue.enqueue({
          type: 'api_call',
          data: { test: true },
          maxRetries: 3,
        });

        const actions = await offlineStorage.queue.getAll();
        const queued = actions.find(a => a.id === actionId);

        if (!queued) {
          throw new Error('Action not queued correctly');
        }

        // Cleanup
        await offlineStorage.queue.dequeue(actionId);

        return { actionQueued: true, actionId };
      }
    ));

    // Test 5: Cache API response
    suite.results.push(await this.runTest(
      'Cache API Response',
      async () => {
        const testData = { message: 'test response' };
        const url = '/api/test';

        await offlineStorage.cache.set(url, testData, 60000);
        const cached = await offlineStorage.cache.get(url);

        if (!cached || cached.message !== 'test response') {
          throw new Error('API response not cached correctly');
        }

        // Cleanup
        await offlineStorage.cache.delete(url);

        return { responseCached: true };
      }
    ));

    suite.duration = Date.now() - startTime;
    suite.passed = suite.results.every(r => r.passed);
    this.results.push(suite);
  }

  /**
   * Service worker tests
   */
  private async runServiceWorkerTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Service Worker',
      results: [],
      passed: true,
      duration: 0,
    };

    const startTime = Date.now();

    // Test 1: Service worker support
    suite.results.push(await this.runTest(
      'Service Worker Support',
      async () => {
        if (!('serviceWorker' in navigator)) {
          throw new Error('Service Worker not supported');
        }
        return { supported: true };
      }
    ));

    // Test 2: Service worker registration
    suite.results.push(await this.runTest(
      'Service Worker Registration',
      async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        return {
          registered: !!registration,
          scope: registration?.scope,
          active: !!registration?.active,
        };
      }
    ));

    // Test 3: Cache API
    suite.results.push(await this.runTest(
      'Cache API',
      async () => {
        if (!('caches' in window)) {
          throw new Error('Cache API not supported');
        }

        const testCacheName = 'test-cache';
        const testUrl = '/test-cache-url';
        const testResponse = new Response('test data');

        const cache = await caches.open(testCacheName);
        await cache.put(testUrl, testResponse);

        const cached = await cache.match(testUrl);
        if (!cached) {
          throw new Error('Cache storage failed');
        }

        // Cleanup
        await caches.delete(testCacheName);

        return { cacheWorking: true };
      }
    ));

    suite.duration = Date.now() - startTime;
    suite.passed = suite.results.every(r => r.passed);
    this.results.push(suite);
  }

  /**
   * Retry logic tests
   */
  private async runRetryLogicTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Retry Logic',
      results: [],
      passed: true,
      duration: 0,
    };

    const startTime = Date.now();

    // Test 1: Successful request (no retry needed)
    suite.results.push(await this.runTest(
      'Successful Request',
      async () => {
        // Mock a successful response
        const originalFetch = global.fetch;
        global.fetch = jest.fn(() =>
          Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
        ) as jest.MockedFunction<typeof fetch>;

        try {
          const response = await api.get('/test-success');
          return { success: response.success, retryCount: response.retryCount || 0 };
        } finally {
          global.fetch = originalFetch;
        }
      }
    ));

    // Test 2: Request with retries
    suite.results.push(await this.runTest(
      'Request with Retries',
      async () => {
        let callCount = 0;
        const originalFetch = global.fetch;
        global.fetch = jest.fn(() => {
          callCount++;
          if (callCount < 3) {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
        }) as jest.MockedFunction<typeof fetch>;

        try {
          const response = await api.get('/test-retry', { retries: 3, retryDelay: 100 });
          return {
            success: response.success,
            retryCount: response.retryCount,
            actualCalls: callCount
          };
        } finally {
          global.fetch = originalFetch;
        }
      }
    ));

    // Test 3: Exponential backoff
    suite.results.push(await this.runTest(
      'Exponential Backoff',
      async () => {
        const delays: number[] = [];
        const startTime = Date.now();

        const originalFetch = global.fetch;
        global.fetch = jest.fn(() => {
          delays.push(Date.now() - startTime);
          return Promise.reject(new Error('Network error'));
        }) as jest.MockedFunction<typeof fetch>;

        try {
          await api.get('/test-backoff', {
            retries: 3,
            retryDelay: 100,
            retryMultiplier: 2
          });
        } catch (error) {
          // Expected to fail
        } finally {
          global.fetch = originalFetch;
        }

        // Verify exponential backoff pattern
        const isExponential = delays.length >= 2 &&
          delays[1] > delays[0] * 1.5;

        return {
          delayPattern: delays,
          isExponential,
          attempts: delays.length
        };
      }
    ));

    suite.duration = Date.now() - startTime;
    suite.passed = suite.results.every(r => r.passed);
    this.results.push(suite);
  }

  /**
   * Cache tests
   */
  private async runCacheTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Cache Strategy',
      results: [],
      passed: true,
      duration: 0,
    };

    const startTime = Date.now();

    // Test 1: Cache-first strategy
    suite.results.push(await this.runTest(
      'Cache-First Strategy',
      async () => {
        const testUrl = '/api/test-cache-first';
        const testData = { cached: true, timestamp: Date.now() };

        // Pre-populate cache
        await offlineStorage.cache.set(testUrl, testData);

        const response = await api.get(testUrl, { cacheStrategy: 'cache-first' });

        return {
          fromCache: response.cached,
          data: response.data,
        };
      }
    ));

    // Test 2: Network-first strategy
    suite.results.push(await this.runTest(
      'Network-First Strategy',
      async () => {
        const testUrl = '/api/test-network-first';

        const originalFetch = global.fetch;
        global.fetch = jest.fn(() =>
          Promise.resolve(new Response(JSON.stringify({ fromNetwork: true }), { status: 200 }))
        ) as jest.MockedFunction<typeof fetch>;

        try {
          const response = await api.get(testUrl, { cacheStrategy: 'network-first' });
          return {
            fromNetwork: !response.cached,
            data: response.data,
          };
        } finally {
          global.fetch = originalFetch;
        }
      }
    ));

    // Test 3: Cache expiration
    suite.results.push(await this.runTest(
      'Cache Expiration',
      async () => {
        const testUrl = '/api/test-expiration';
        const testData = { expired: true };

        // Set cache with short TTL
        await offlineStorage.cache.set(testUrl, testData, 100); // 100ms TTL

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 150));

        const expired = await offlineStorage.cache.get(testUrl);

        return {
          cacheExpired: expired === null,
        };
      }
    ));

    suite.duration = Date.now() - startTime;
    suite.passed = suite.results.every(r => r.passed);
    this.results.push(suite);
  }

  /**
   * Sync tests
   */
  private async runSyncTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Offline Sync',
      results: [],
      passed: true,
      duration: 0,
    };

    const startTime = Date.now();

    // Test 1: Queue management
    suite.results.push(await this.runTest(
      'Queue Management',
      async () => {
        // Clear queue first
        await offlineStorage.queue.clear();

        // Add test actions
        const action1 = await offlineStorage.queue.enqueue({
          type: 'api_call',
          data: { test: 1 },
          maxRetries: 3,
        });

        const action2 = await offlineStorage.queue.enqueue({
          type: 'submit_task',
          data: { taskId: 'test' },
          maxRetries: 3,
        });

        const allActions = await offlineStorage.queue.getAll();
        const retryable = await offlineStorage.queue.getRetryable();

        // Cleanup
        await offlineStorage.queue.clear();

        return {
          totalActions: allActions.length,
          retryableActions: retryable.length,
          actionIds: [action1, action2],
        };
      }
    ));

    // Test 2: Background sync registration
    suite.results.push(await this.runTest(
      'Background Sync Registration',
      async () => {
        if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
          return { supported: false, message: 'Background sync not supported' };
        }

        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('background-sync');

        return { supported: true, registered: true };
      }
    ));

    // Test 3: Storage cleanup
    suite.results.push(await this.runTest(
      'Storage Cleanup',
      async () => {
        // Create old test data
        const oldTask = {
          id: 'old-task',
          title: 'Old Task',
          description: 'Old Description',
          category: 'test',
          difficulty: 1 as const,
          task_type: 'data_entry' as const,
          reward_amount: 10,
          reward_currency: 'WLD' as const,
          status: 'active' as const,
          created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
          updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_time: 5,
          instructions: 'Old instructions',
          required_annotations: 1,
        };

        await offlineStorage.tasks.saveTasks([oldTask]);

        const beforeCleanup = await offlineStorage.tasks.getTasks();
        await offlineStorage.manager.cleanup(7); // Clean up data older than 7 days
        const afterCleanup = await offlineStorage.tasks.getTasks();

        return {
          beforeCount: beforeCleanup.length,
          afterCount: afterCleanup.length,
          cleaned: beforeCleanup.length > afterCleanup.length,
        };
      }
    ));

    suite.duration = Date.now() - startTime;
    suite.passed = suite.results.every(r => r.passed);
    this.results.push(suite);
  }

  /**
   * Run individual test
   */
  private async runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const details = await testFn();
      const duration = Date.now() - startTime;

      console.log(`✅ ${testName} - ${duration}ms`);

      return {
        testName,
        passed: true,
        duration,
        details,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`❌ ${testName} - ${duration}ms - ${errorMessage}`);

      return {
        testName,
        passed: false,
        duration,
        error: errorMessage,
      };
    }
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    const totalTests = this.results.reduce((sum, suite) => sum + suite.results.length, 0);
    const passedTests = this.results.reduce(
      (sum, suite) => sum + suite.results.filter(r => r.passed).length,
      0
    );
    const totalDuration = this.results.reduce((sum, suite) => sum + suite.duration, 0);

    let report = '# Network Resilience Test Report\n\n';
    report += `**Overall Results:** ${passedTests}/${totalTests} tests passed (${Math.round((passedTests/totalTests)*100)}%)\n`;
    report += `**Total Duration:** ${totalDuration}ms\n\n`;

    for (const suite of this.results) {
      const suitePassed = suite.results.filter(r => r.passed).length;
      const suiteTotal = suite.results.length;

      report += `## ${suite.name}\n`;
      report += `**Results:** ${suitePassed}/${suiteTotal} tests passed\n`;
      report += `**Duration:** ${suite.duration}ms\n\n`;

      for (const test of suite.results) {
        const status = test.passed ? '✅' : '❌';
        report += `- ${status} **${test.testName}** (${test.duration}ms)\n`;

        if (!test.passed && test.error) {
          report += `  - Error: ${test.error}\n`;
        }

        if (test.details) {
          report += `  - Details: ${JSON.stringify(test.details, null, 2)}\n`;
        }
      }

      report += '\n';
    }

    return report;
  }
}

// Create global test runner instance
export const networkResilienceTestRunner = new NetworkResilienceTestRunner();

/**
 * Simple test runner function for manual testing
 */
export async function testNetworkResilience(): Promise<void> {
  console.log('🚀 Running Network Resilience Tests...');

  const suites = await networkResilienceTestRunner.runAllTests();
  const report = networkResilienceTestRunner.generateReport();

  console.log(report);

  // Also log to console for debugging
  console.table(
    suites.flatMap(suite =>
      suite.results.map(test => ({
        Suite: suite.name,
        Test: test.testName,
        Status: test.passed ? 'PASS' : 'FAIL',
        Duration: `${test.duration}ms`,
        Error: test.error || '-',
      }))
    )
  );
}

export default networkResilienceTestRunner;