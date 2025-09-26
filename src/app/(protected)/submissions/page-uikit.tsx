/**
 * Submissions Page using World App UI Kit
 * View submission history and details
 */

'use client';

import React, { useState } from 'react';
import {
  SafeAreaView,
  Typography,
  ListItem,
  Chip,
  Progress,
  Tabs,
  TabItem,
  Skeleton,
  SkeletonTypography,
  useSafeAreaInsets
} from '@worldcoin/mini-apps-ui-kit-react';
import {
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Calendar,
  Award
} from 'lucide-react';

export default function SubmissionsPageUIKit() {
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Mock data for demonstration
  const submissions = [
    {
      id: 1,
      taskTitle: 'RLHF Rating Task',
      status: 'approved',
      submittedAt: '2024-03-20 14:30',
      reviewedAt: '2024-03-20 15:45',
      reward: 2.50,
      quality_score: 98
    },
    {
      id: 2,
      taskTitle: 'Voice Recording',
      status: 'approved',
      submittedAt: '2024-03-19 10:15',
      reviewedAt: '2024-03-19 12:00',
      reward: 3.00,
      quality_score: 95
    },
    {
      id: 3,
      taskTitle: 'Data Annotation',
      status: 'pending',
      submittedAt: '2024-03-21 09:00',
      reviewedAt: null,
      reward: 1.75,
      quality_score: null
    },
    {
      id: 4,
      taskTitle: 'Content Moderation',
      status: 'rejected',
      submittedAt: '2024-03-18 16:20',
      reviewedAt: '2024-03-18 18:00',
      reward: 0,
      quality_score: 65
    },
  ];

  const stats = {
    total: submissions.length,
    approved: submissions.filter(s => s.status === 'approved').length,
    pending: submissions.filter(s => s.status === 'pending').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
    totalEarnings: submissions
      .filter(s => s.status === 'approved')
      .reduce((sum, s) => sum + s.reward, 0),
    averageQuality: 96
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-400" />;
      default: return null;
    }
  };

  const filteredSubmissions = selectedFilter === 'all'
    ? submissions
    : submissions.filter(s => s.status === selectedFilter);

  return (
    <SafeAreaView className="min-h-screen bg-black">
      <div className="px-6 py-8" style={{ paddingTop: insets.top + 32 }}>
        {/* Header */}
        <div className="mb-8">
          <Typography variant="h1" className="text-white mb-2">
            Submissions
          </Typography>
          <Typography variant="body2" className="text-white/70">
            Track your task submissions and earnings
          </Typography>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <Typography variant="caption" className="text-white/60">
                Total Earnings
              </Typography>
            </div>
            <Typography variant="h3" className="text-white">
              ${stats.totalEarnings.toFixed(2)}
            </Typography>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-5 h-5 text-[rgb(25,137,251)]" />
              <Typography variant="caption" className="text-white/60">
                Quality Score
              </Typography>
            </div>
            <Typography variant="h3" className="text-white mb-2">
              {stats.averageQuality}%
            </Typography>
            <Progress value={stats.averageQuality} className="h-2" />
          </div>
        </div>

        {/* Filter Tabs */}
        <Tabs className="mb-6">
          <TabItem
            isActive={selectedFilter === 'all'}
            onClick={() => setSelectedFilter('all')}
          >
            All
            <Chip variant="secondary" size="small" className="ml-2">
              {stats.total}
            </Chip>
          </TabItem>
          <TabItem
            isActive={selectedFilter === 'approved'}
            onClick={() => setSelectedFilter('approved')}
          >
            Approved
            <Chip variant="success" size="small" className="ml-2">
              {stats.approved}
            </Chip>
          </TabItem>
          <TabItem
            isActive={selectedFilter === 'pending'}
            onClick={() => setSelectedFilter('pending')}
          >
            Pending
            <Chip variant="warning" size="small" className="ml-2">
              {stats.pending}
            </Chip>
          </TabItem>
          <TabItem
            isActive={selectedFilter === 'rejected'}
            onClick={() => setSelectedFilter('rejected')}
          >
            Rejected
            <Chip variant="error" size="small" className="ml-2">
              {stats.rejected}
            </Chip>
          </TabItem>
        </Tabs>

        {/* Submissions List */}
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => (
            <div key={submission.id} className="bg-white/5 border border-white/10 rounded-xl">
              <ListItem
                icon={getStatusIcon(submission.status)}
                title={submission.taskTitle}
                subtitle={
                  <div className="space-y-1 mt-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-white/40" />
                      <Typography variant="caption" className="text-white/60">
                        Submitted: {submission.submittedAt}
                      </Typography>
                    </div>
                    {submission.reviewedAt && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-white/40" />
                        <Typography variant="caption" className="text-white/60">
                          Reviewed: {submission.reviewedAt}
                        </Typography>
                      </div>
                    )}
                  </div>
                }
                trailing={
                  <div className="text-right space-y-2">
                    <Chip
                      variant={getStatusColor(submission.status)}
                      size="small"
                    >
                      {submission.status}
                    </Chip>
                    {submission.status === 'approved' && (
                      <Typography variant="body2" className="text-green-400 font-medium">
                        +${submission.reward.toFixed(2)}
                      </Typography>
                    )}
                    {submission.quality_score && (
                      <Typography variant="caption" className="text-white/60 block">
                        Quality: {submission.quality_score}%
                      </Typography>
                    )}
                  </div>
                }
              />
            </div>
          ))}

          {filteredSubmissions.length === 0 && (
            <div className="text-center py-12">
              <Typography variant="h3" className="text-white mb-2">
                No submissions found
              </Typography>
              <Typography variant="body2" className="text-white/60">
                Complete tasks to see your submission history here
              </Typography>
            </div>
          )}
        </div>
      </div>
    </SafeAreaView>
  );
}
