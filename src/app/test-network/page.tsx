'use client';

import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, Clock, BarChart3 } from 'lucide-react';
import { testNetworkResilience, networkResilienceTestRunner, TestSuite } from '@/lib/networkResilienceTest';

export default function TestNetworkPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestSuite[]>([]);
  const [report, setReport] = useState<string>('');

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    setReport('');

    try {
      const suites = await networkResilienceTestRunner.runAllTests();
      const generatedReport = networkResilienceTestRunner.generateReport();

      setResults(suites);
      setReport(generatedReport);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getOverallStats = () => {
    const totalTests = results.reduce((sum, suite) => sum + suite.results.length, 0);
    const passedTests = results.reduce(
      (sum, suite) => sum + suite.results.filter(r => r.passed).length,
      0
    );
    const totalDuration = results.reduce((sum, suite) => sum + suite.duration, 0);

    return { totalTests, passedTests, totalDuration };
  };

  const stats = getOverallStats();

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
            Network Resilience Testing
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Comprehensive testing suite for offline functionality and network resilience features.
          </p>
        </div>

        {/* Test Control */}
        <div className="mb-8">
          <button
            onClick={runTests}
            disabled={isRunning}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--color-accent-blue)] text-black rounded-lg font-medium hover:bg-[color-mix(in srgb,var(--color-accent-blue) 90%,white 10%)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <Clock size={20} className="animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play size={20} />
                Run All Tests
              </>
            )}
          </button>
        </div>

        {/* Overall Stats */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[color-mix(in srgb,var(--color-bg-surface) 80%,transparent)] rounded-lg p-4 border border-[color-mix(in srgb,var(--color-divider-low) 30%,transparent)]">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={20} className="text-[var(--color-accent-blue)]" />
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">Total Tests</span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                {stats.totalTests}
              </div>
            </div>

            <div className="bg-[color-mix(in srgb,var(--color-bg-surface) 80%,transparent)] rounded-lg p-4 border border-[color-mix(in srgb,var(--color-divider-low) 30%,transparent)]">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={20} className="text-[var(--color-success)]" />
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">Passed</span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-success)]">
                {stats.passedTests}
              </div>
            </div>

            <div className="bg-[color-mix(in srgb,var(--color-bg-surface) 80%,transparent)] rounded-lg p-4 border border-[color-mix(in srgb,var(--color-divider-low) 30%,transparent)]">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={20} className="text-[var(--color-error)]" />
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">Failed</span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-error)]">
                {stats.totalTests - stats.passedTests}
              </div>
            </div>

            <div className="bg-[color-mix(in srgb,var(--color-bg-surface) 80%,transparent)] rounded-lg p-4 border border-[color-mix(in srgb,var(--color-divider-low) 30%,transparent)]">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={20} className="text-[var(--color-accent-teal)]" />
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">Duration</span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                {stats.totalDuration}ms
              </div>
            </div>
          </div>
        )}

        {/* Test Results */}
        {results.length > 0 && (
          <div className="space-y-6">
            {results.map((suite, suiteIndex) => (
              <div
                key={suiteIndex}
                className="bg-[color-mix(in srgb,var(--color-bg-surface) 80%,transparent)] rounded-lg border border-[color-mix(in srgb,var(--color-divider-low) 30%,transparent)] overflow-hidden"
              >
                <div className="p-4 border-b border-[color-mix(in srgb,var(--color-divider-low) 30%,transparent)]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                      {suite.name}
                    </h3>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        {suite.results.filter(r => r.passed).length}/{suite.results.length} passed
                      </span>
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        {suite.duration}ms
                      </span>
                      {suite.passed ? (
                        <CheckCircle size={20} className="text-[var(--color-success)]" />
                      ) : (
                        <XCircle size={20} className="text-[var(--color-error)]" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="space-y-3">
                    {suite.results.map((test, testIndex) => (
                      <div
                        key={testIndex}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          test.passed
                            ? 'bg-[color-mix(in srgb,var(--color-success) 10%,transparent)] border border-[color-mix(in srgb,var(--color-success) 25%,transparent)]'
                            : 'bg-[color-mix(in srgb,var(--color-error) 10%,transparent)] border border-[color-mix(in srgb,var(--color-error) 25%,transparent)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {test.passed ? (
                            <CheckCircle size={16} className="text-[var(--color-success)]" />
                          ) : (
                            <XCircle size={16} className="text-[var(--color-error)]" />
                          )}
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {test.testName}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="text-sm text-[var(--color-text-secondary)]">
                            {test.duration}ms
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Raw Report */}
        {report && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
              Test Report
            </h2>
            <div className="bg-[color-mix(in srgb,var(--color-bg-surface) 80%,transparent)] rounded-lg border border-[color-mix(in srgb,var(--color-divider-low) 30%,transparent)] p-4">
              <pre className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap overflow-x-auto">
                {report}
              </pre>
            </div>
          </div>
        )}

        {/* Instructions */}
        {results.length === 0 && !isRunning && (
          <div className="bg-[color-mix(in srgb,var(--color-accent-teal) 10%,transparent)] rounded-lg border border-[color-mix(in srgb,var(--color-accent-teal) 25%,transparent)] p-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
              What This Tests
            </h3>
            <ul className="text-[var(--color-text-secondary)] space-y-2">
              <li>• <strong>Basic Connectivity:</strong> Online detection, Network Information API, Performance API</li>
              <li>• <strong>Offline Storage:</strong> IndexedDB availability, task storage, action queuing, API caching</li>
              <li>• <strong>Service Worker:</strong> Registration, Cache API functionality</li>
              <li>• <strong>Retry Logic:</strong> Exponential backoff, retry attempts, error handling</li>
              <li>• <strong>Cache Strategy:</strong> Cache-first, network-first, cache expiration</li>
              <li>• <strong>Offline Sync:</strong> Queue management, background sync, storage cleanup</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}