/**
 * Recent Activity Component
 * Shows recent user activities, completed tasks, and achievements
 */

'use client';

import React, { useEffect } from 'react';
import { Activity, CheckCircle, DollarSign, Award, Clock, ArrowRight } from 'lucide-react';

import { Card, Badge, Button, LoadingSkeleton } from '@/components/ui';
import { useDashboard, useAuth } from '@/stores';
import { formatTimeAgo, formatCurrency, cn } from '@/lib/utils';

interface RecentActivityProps {
  limit?: number;
  showViewAll?: boolean;
  className?: string;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  limit = 10,
  showViewAll = true,
  className,
}) => {
  const { user } = useAuth();
  const {
    recentActivity,
    loading,
    setRecentActivity,
    setDashboardLoading,
  } = useDashboard();

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    if (!user) return;

    setDashboardLoading('activity', true);

    try {
      // Mock data - in real app, this would come from API
      const mockActivity = [
        {
          id: '1',
          type: 'task_completed' as const,
          title: 'RLHF Rating Task Completed',
          description: 'Rated AI model responses for helpfulness and accuracy',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          amount: 12.50,
          currency: 'WLD' as const,
        },
        {
          id: '2',
          type: 'payment_received' as const,
          title: 'Payment Received',
          description: 'Reward for data annotation task',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          amount: 25.00,
          currency: 'WLD' as const,
        },
        {
          id: '3',
          type: 'task_completed' as const,
          title: 'Voice Recording Task Completed',
          description: 'Recorded high-quality audio samples for training',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          amount: 18.75,
          currency: 'WLD' as const,
        },
        {
          id: '4',
          type: 'rating_given' as const,
          title: 'Quality Rating Received',
          description: 'Your submission received a 4.8/5.0 rating',
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '5',
          type: 'task_completed' as const,
          title: 'Data Annotation Task Completed',
          description: 'Annotated 50+ images with bounding boxes',
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          amount: 32.50,
          currency: 'WLD' as const,
        },
        {
          id: '6',
          type: 'dispute_resolved' as const,
          title: 'Dispute Resolved',
          description: 'Task submission dispute resolved in your favor',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          amount: 15.00,
          currency: 'WLD' as const,
        },
        {
          id: '7',
          type: 'payment_received' as const,
          title: 'Weekly Bonus Earned',
          description: 'Completed 10+ tasks this week',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 50.00,
          currency: 'WLD' as const,
        },
        {
          id: '8',
          type: 'task_completed' as const,
          title: 'Transcription Task Completed',
          description: 'Transcribed 30 minutes of audio content',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 22.00,
          currency: 'WLD' as const,
        },
      ];

      setRecentActivity(mockActivity.slice(0, limit));

    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
    } finally {
      setDashboardLoading('activity', false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'payment_received':
        return <DollarSign className="w-5 h-5 text-blue-400" />;
      case 'rating_given':
        return <Award className="w-5 h-5 text-yellow-400" />;
      case 'dispute_resolved':
        return <Activity className="w-5 h-5 text-purple-400" />;
      default:
        return <Activity className="w-5 h-5 text-white/60" />;
    }
  };

  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'task_completed':
        return <Badge variant="success" size="sm">Completed</Badge>;
      case 'payment_received':
        return <Badge variant="info" size="sm">Paid</Badge>;
      case 'rating_given':
        return <Badge variant="warning" size="sm">Rated</Badge>;
      case 'dispute_resolved':
        return <Badge variant="primary" size="sm">Resolved</Badge>;
      default:
        return <Badge variant="default" size="sm">Activity</Badge>;
    }
  };

  if (loading.dashboard_activity && recentActivity.length === 0) {
    return (
      <Card className={className} variant="elevated">
        <Card.Header title="Recent Activity" />
        <Card.Content>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
                <LoadingSkeleton width={40} height={40} rounded />
                <div className="flex-1 space-y-2">
                  <LoadingSkeleton width="70%" height={16} />
                  <LoadingSkeleton width="50%" height={12} />
                </div>
                <LoadingSkeleton width={80} height={24} />
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card className={className} variant="elevated">
      <Card.Header
        title="Recent Activity"
        subtitle={`${recentActivity.length} recent activities`}
        action={showViewAll && recentActivity.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            View All
          </Button>
        ) : undefined}
      />

      <Card.Content>
        {recentActivity.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/60">No recent activity</p>
            <p className="text-white/40 text-sm mt-2">
              Complete your first task to see activity here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div
                key={activity.id}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-lg transition-colors hover:bg-white/5',
                  index === 0 ? 'bg-white/5' : 'bg-transparent'
                )}
              >
                {/* Icon */}
                <div className="shrink-0">
                  {getActivityIcon(activity.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-white font-medium text-sm leading-tight">
                      {activity.title}
                    </h4>
                    <div className="shrink-0 flex items-center gap-2">
                      {getActivityBadge(activity.type)}
                      {activity.amount && (
                        <span className="text-green-400 font-semibold text-sm">
                          +{formatCurrency(activity.amount, activity.currency || 'WLD')}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-white/70 text-sm leading-relaxed mb-2">
                    {activity.description}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-white/50">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(activity.timestamp)}</span>
                    </div>
                    {index === 0 && (
                      <Badge variant="primary" size="sm">
                        Latest
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activity Summary */}
        {recentActivity.length > 0 && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-white/60 text-xs mb-1">Today</p>
                <p className="text-white font-semibold">
                  {recentActivity.filter(a =>
                    new Date(a.timestamp).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <div>
                <p className="text-white/60 text-xs mb-1">This Week</p>
                <p className="text-white font-semibold">
                  {recentActivity.filter(a =>
                    new Date(a.timestamp) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length}
                </p>
              </div>
              <div>
                <p className="text-white/60 text-xs mb-1">Completed</p>
                <p className="text-white font-semibold">
                  {recentActivity.filter(a => a.type === 'task_completed').length}
                </p>
              </div>
              <div>
                <p className="text-white/60 text-xs mb-1">Earned</p>
                <p className="text-green-400 font-semibold text-sm">
                  {formatCurrency(
                    recentActivity
                      .filter(a => a.amount)
                      .reduce((sum, a) => sum + (a.amount || 0), 0),
                    'WLD'
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card.Content>
    </Card>
  );
};

export default RecentActivity;