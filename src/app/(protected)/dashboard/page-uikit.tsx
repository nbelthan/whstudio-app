/**
 * Dashboard Page using World App UI Kit
 * Main dashboard view for authenticated users
 */

'use client';

import React from 'react';
import {
  SafeAreaView,
  Typography,
  ListItem,
  Chip,
  Progress,
  Skeleton,
  SkeletonTypography,
  useSafeAreaInsets
} from '@worldcoin/mini-apps-ui-kit-react';
import {
  TrendingUp,
  Trophy,
  Clock,
  CheckCircle,
  DollarSign,
  Activity
} from 'lucide-react';

export default function DashboardPageUIKit() {
  const insets = useSafeAreaInsets();

  // Mock data for demonstration
  const stats = {
    totalEarnings: 125.50,
    tasksCompleted: 48,
    avgCompletionTime: '3m 24s',
    successRate: 98.5,
    weeklyGrowth: 12.5
  };

  const recentActivity = [
    { id: 1, type: 'task', title: 'RLHF Rating Task', status: 'completed', time: '2 hours ago', reward: 2.50 },
    { id: 2, type: 'task', title: 'Voice Recording', status: 'completed', time: '4 hours ago', reward: 3.00 },
    { id: 3, type: 'payment', title: 'Payment Received', status: 'success', time: '1 day ago', amount: 25.00 },
    { id: 4, type: 'task', title: 'Data Annotation', status: 'completed', time: '2 days ago', reward: 1.75 },
  ];

  return (
    <SafeAreaView className="min-h-screen bg-black">
      <div className="px-6 py-8" style={{ paddingTop: insets.top + 32 }}>
        {/* Header */}
        <div className="mb-8">
          <Typography variant="h1" className="text-white mb-2">
            Welcome back!
          </Typography>
          <Typography variant="body2" className="text-white/70">
            Here's your WorldHuman Studio activity overview
          </Typography>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[rgb(25,137,251)]/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[rgb(25,137,251)]" />
              </div>
              <Typography variant="caption" className="text-white/60">
                Total Earnings
              </Typography>
            </div>
            <Typography variant="h2" className="text-white mb-2">
              ${stats.totalEarnings}
            </Typography>
            <Chip variant="success" size="small">
              <TrendingUp className="w-3 h-3 mr-1" />
              {stats.weeklyGrowth}% this week
            </Chip>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5 text-green-400" />
              </div>
              <Typography variant="caption" className="text-white/60">
                Tasks Completed
              </Typography>
            </div>
            <Typography variant="h2" className="text-white mb-2">
              {stats.tasksCompleted}
            </Typography>
            <Progress value={stats.successRate} className="h-2" />
            <Typography variant="caption" className="text-white/60 mt-1">
              {stats.successRate}% success rate
            </Typography>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
          <ListItem
            icon={<Clock className="w-5 h-5 text-blue-400" />}
            title="Average Completion Time"
            subtitle={stats.avgCompletionTime}
            className="mb-4"
          />
          <ListItem
            icon={<CheckCircle className="w-5 h-5 text-green-400" />}
            title="Quality Score"
            subtitle="Excellent"
            trailing={
              <Chip variant="success" size="small">98.5%</Chip>
            }
          />
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h3" className="text-white">
              Recent Activity
            </Typography>
            <Chip variant="secondary" size="small">
              <Activity className="w-3 h-3 mr-1" />
              Live
            </Chip>
          </div>

          <div className="space-y-3">
            {recentActivity.map((item) => (
              <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl">
                <ListItem
                  icon={
                    item.type === 'payment' ? (
                      <DollarSign className="w-5 h-5 text-green-400" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-blue-400" />
                    )
                  }
                  title={item.title}
                  subtitle={item.time}
                  trailing={
                    item.type === 'payment' ? (
                      <Typography variant="body2" className="text-green-400 font-medium">
                        +${item.amount}
                      </Typography>
                    ) : (
                      <Typography variant="caption" className="text-white/60">
                        +${item.reward}
                      </Typography>
                    )
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* Loading State Example */}
        <div className="hidden">
          <Skeleton className="w-full h-32 mb-4" />
          <SkeletonTypography variant="h3" className="mb-2" />
          <SkeletonTypography variant="body1" />
        </div>
      </div>
    </SafeAreaView>
  );
}