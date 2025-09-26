/**
 * Dashboard Stats Component
 * Displays user statistics, earnings, and performance metrics
 */

'use client';

import React, { useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Award, Clock, Target, Zap, DollarSign, CheckCircle } from 'lucide-react';

import { Card, Badge, LoadingSkeleton } from '@/components/ui';
import { useDashboard, useAuth } from '@/stores';
import { formatCurrency, calculateCompletionPercentage, cn } from '@/lib/utils';

interface DashboardStatsProps {
  className?: string;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  className,
}) => {
  const { user } = useAuth();
  const {
    userStats,
    earningsData,
    loading,
    setUserStats,
    setEarningsData,
    setDashboardLoading,
    setDashboardError,
  } = useDashboard();

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    if (!user) return;

    setDashboardLoading('stats', true);

    try {
      // Mock data - in real app, this would come from API
      const mockStats = {
        total_earned: user.total_earned || 0,
        tasks_completed: Math.floor(Math.random() * 50) + 20,
        success_rate: Math.random() * 20 + 80, // 80-100%
        average_rating: Math.random() * 1 + 4, // 4-5 stars
        current_streak: Math.floor(Math.random() * 10) + 3,
        badges_earned: ['Early Adopter', 'Quality Contributor', 'Fast Learner'],
      };

      const mockEarnings = {
        daily: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          amount: Math.random() * 50 + 10,
        })).reverse(),
        weekly: Array.from({ length: 4 }, (_, i) => ({
          week: `Week ${i + 1}`,
          amount: Math.random() * 200 + 100,
        })),
        monthly: Array.from({ length: 6 }, (_, i) => ({
          month: new Date(2024, 5 - i, 1).toLocaleDateString('en-US', { month: 'short' }),
          amount: Math.random() * 800 + 200,
        })).reverse(),
        by_task_type: [
          { task_type: 'rlhf_rating', amount: Math.random() * 150 + 50, count: Math.floor(Math.random() * 20) + 10 },
          { task_type: 'data_annotation', amount: Math.random() * 100 + 30, count: Math.floor(Math.random() * 15) + 5 },
          { task_type: 'voice_recording', amount: Math.random() * 80 + 20, count: Math.floor(Math.random() * 10) + 3 },
          { task_type: 'transcription', amount: Math.random() * 60 + 15, count: Math.floor(Math.random() * 8) + 2 },
        ],
      };

      setUserStats(mockStats);
      setEarningsData(mockEarnings);

    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setDashboardError('stats', 'Failed to load dashboard statistics');
    } finally {
      setDashboardLoading('stats', false);
    }
  };

  // Calculate trends
  const trends = useMemo(() => {
    if (!earningsData) return {};

    const dailyEarnings = earningsData.daily;
    const lastWeekEarnings = dailyEarnings.slice(0, 7).reduce((sum, day) => sum + day.amount, 0);
    const previousWeekEarnings = dailyEarnings.slice(7, 14).reduce((sum, day) => sum + day.amount, 0);

    const weeklyChange = previousWeekEarnings > 0
      ? ((lastWeekEarnings - previousWeekEarnings) / previousWeekEarnings) * 100
      : 0;

    return {
      weeklyEarnings: lastWeekEarnings,
      weeklyChange,
      isPositiveChange: weeklyChange >= 0,
    };
  }, [earningsData]);

  const getCompletionLevel = () => {
    if (!userStats) return { level: 1, progress: 0 };

    const completed = userStats.tasks_completed;
    const level = Math.floor(completed / 10) + 1;
    const progress = (completed % 10) / 10 * 100;

    return { level, progress };
  };

  const { level, progress } = getCompletionLevel();

  if (loading.dashboard_stats && !userStats) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <Card.Content>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <LoadingSkeleton width={60} height={16} />
                    <LoadingSkeleton width={24} height={24} rounded />
                  </div>
                  <LoadingSkeleton width={80} height={24} />
                  <LoadingSkeleton width={120} height={12} />
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <Card.Content>
              <LoadingSkeleton width="100%" height={200} />
            </Card.Content>
          </Card>
          <Card>
            <Card.Content>
              <LoadingSkeleton width="100%" height={200} />
            </Card.Content>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Earnings */}
        <Card variant="elevated">
          <Card.Content>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/80 text-sm font-medium">Total Earned</span>
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-white">
                {formatCurrency(userStats?.total_earned || 0, 'WLD')}
              </p>
              {trends.weeklyChange !== undefined && (
                <div className="flex items-center gap-1 text-sm">
                  {trends.isPositiveChange ? (
                    <TrendingUp className="w-3 h-3 text-green-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  )}
                  <span className={trends.isPositiveChange ? 'text-green-400' : 'text-red-400'}>
                    {Math.abs(trends.weeklyChange).toFixed(1)}% this week
                  </span>
                </div>
              )}
            </div>
          </Card.Content>
        </Card>

        {/* Tasks Completed */}
        <Card variant="elevated">
          <Card.Content>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/80 text-sm font-medium">Tasks Completed</span>
              <CheckCircle className="w-5 h-5 text-blue-400" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-white">
                {userStats?.tasks_completed || 0}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/20 rounded-full h-2">
                  <div
                    className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-white/60">Level {level}</span>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Success Rate */}
        <Card variant="elevated">
          <Card.Content>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/80 text-sm font-medium">Success Rate</span>
              <Target className="w-5 h-5 text-purple-400" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-white">
                {userStats?.success_rate?.toFixed(1) || 0}%
              </p>
              <div className="text-sm text-white/60">
                {userStats?.success_rate && userStats.success_rate > 90 ? 'Excellent' :
                 userStats?.success_rate && userStats.success_rate > 80 ? 'Good' :
                 userStats?.success_rate && userStats.success_rate > 70 ? 'Fair' : 'Needs Improvement'}
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Current Streak */}
        <Card variant="elevated">
          <Card.Content>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/80 text-sm font-medium">Current Streak</span>
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-white">
                {userStats?.current_streak || 0} days
              </p>
              <div className="text-sm text-white/60">
                Keep it up!
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Overview */}
        <Card variant="elevated">
          <Card.Header
            title="Performance Overview"
            subtitle="Your key performance metrics"
          />
          <Card.Content>
            <div className="space-y-4">
              {/* Average Rating */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-orange-400" />
                  <span className="text-white/80">Average Rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'w-4 h-4',
                          i < Math.floor(userStats?.average_rating || 0)
                            ? 'text-yellow-400'
                            : 'text-white/20'
                        )}
                      >
                        ★
                      </div>
                    ))}
                  </div>
                  <span className="text-white font-semibold">
                    {userStats?.average_rating?.toFixed(1) || 0}
                  </span>
                </div>
              </div>

              {/* Response Time */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <span className="text-white/80">Avg Response Time</span>
                </div>
                <span className="text-white font-semibold">2.4 min</span>
              </div>

              {/* Quality Score */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-green-400" />
                  <span className="text-white/80">Quality Score</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-white/20 rounded-full h-2">
                    <div
                      className="bg-green-400 h-2 rounded-full"
                      style={{ width: `${(userStats?.success_rate || 0)}%` }}
                    />
                  </div>
                  <span className="text-white font-semibold">
                    {userStats?.success_rate?.toFixed(0) || 0}%
                  </span>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Earnings by Task Type */}
        <Card variant="elevated">
          <Card.Header
            title="Earnings by Task Type"
            subtitle="Your highest earning task categories"
          />
          <Card.Content>
            <div className="space-y-3">
              {earningsData?.by_task_type.map((taskType, index) => {
                const maxAmount = Math.max(...earningsData.by_task_type.map(t => t.amount));
                const percentage = (taskType.amount / maxAmount) * 100;

                return (
                  <div key={taskType.task_type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white/80 capitalize text-sm">
                        {taskType.task_type.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {formatCurrency(taskType.amount, 'WLD')}
                        </span>
                        <Badge variant="ghost" size="sm">
                          {taskType.count}
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div
                        className={cn(
                          'h-2 rounded-full transition-all duration-300',
                          index === 0 ? 'bg-[rgb(25,137,251)]' :
                          index === 1 ? 'bg-green-400' :
                          index === 2 ? 'bg-yellow-400' :
                          'bg-purple-400'
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Achievements */}
      {userStats?.badges_earned && userStats.badges_earned.length > 0 && (
        <Card variant="elevated">
          <Card.Header
            title="Achievements"
            subtitle="Badges and milestones you've earned"
          />
          <Card.Content>
            <div className="flex flex-wrap gap-3">
              {userStats.badges_earned.map((badge) => (
                <Badge
                  key={badge}
                  variant="primary"
                  size="lg"
                  leftIcon={<Award className="w-4 h-4" />}
                >
                  {badge}
                </Badge>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default DashboardStats;