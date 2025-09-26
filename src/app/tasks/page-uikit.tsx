/**
 * Tasks Page using World App UI Kit
 * Browse and filter available tasks
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  Typography,
  ListItem,
  Chip,
  Button,
  Select,
  SearchField,
  Skeleton,
  SkeletonTypography,
  Tabs,
  TabItem,
  useSafeAreaInsets
} from '@worldcoin/mini-apps-ui-kit-react';
import {
  Search,
  Filter,
  Clock,
  DollarSign,
  Award,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

export default function TasksPageUIKit() {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demonstration
  const tasks = [
    {
      id: 1,
      title: 'RLHF Rating Task',
      category: 'ai_training',
      difficulty: 'easy',
      timeEstimate: '5 min',
      reward: 2.50,
      completions: 1234,
      description: 'Rate AI responses for quality and helpfulness'
    },
    {
      id: 2,
      title: 'Voice Recording',
      category: 'data_collection',
      difficulty: 'medium',
      timeEstimate: '10 min',
      reward: 3.00,
      completions: 856,
      description: 'Record voice samples for speech recognition training'
    },
    {
      id: 3,
      title: 'Data Annotation',
      category: 'annotation',
      difficulty: 'easy',
      timeEstimate: '3 min',
      reward: 1.75,
      completions: 2341,
      description: 'Label images for computer vision models'
    },
    {
      id: 4,
      title: 'Content Moderation',
      category: 'verification',
      difficulty: 'hard',
      timeEstimate: '15 min',
      reward: 5.00,
      completions: 432,
      description: 'Review and moderate user-generated content'
    },
  ];

  const categories = [
    { id: 'all', label: 'All Tasks', count: tasks.length },
    { id: 'ai_training', label: 'AI Training', count: 1 },
    { id: 'data_collection', label: 'Data Collection', count: 1 },
    { id: 'annotation', label: 'Annotation', count: 1 },
    { id: 'verification', label: 'Verification', count: 1 },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'secondary';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView className="min-h-screen bg-black">
      <div className="px-6 py-8" style={{ paddingTop: insets.top + 32 }}>
        {/* Header */}
        <div className="mb-8">
          <Typography variant="h1" className="text-white mb-2">
            Available Tasks
          </Typography>
          <Typography variant="body2" className="text-white/70">
            Complete tasks to earn rewards with your verified World ID
          </Typography>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search tasks..."
            className="w-full"
          />

          <div className="flex gap-2">
            <Select
              defaultValue="all"
              className="flex-1"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>

            <Button variant="secondary" size="small">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs className="mb-6">
          {categories.map((category) => (
            <TabItem
              key={category.id}
              isActive={selectedCategory === category.id}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.label}
              {category.count > 0 && (
                <Chip variant="secondary" size="small" className="ml-2">
                  {category.count}
                </Chip>
              )}
            </TabItem>
          ))}
        </Tabs>

        {/* Tasks List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <Skeleton className="w-full h-24" />
                <SkeletonTypography variant="h3" className="mt-3" />
                <SkeletonTypography variant="body2" className="mt-2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <div key={task.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Typography variant="h3" className="text-white mb-1">
                      {task.title}
                    </Typography>
                    <Typography variant="body2" className="text-white/70">
                      {task.description}
                    </Typography>
                  </div>
                  <Chip
                    variant={getDifficultyColor(task.difficulty)}
                    size="small"
                  >
                    {task.difficulty}
                  </Chip>
                </div>

                {/* Task Details */}
                <div className="flex items-center gap-6 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-white/40" />
                    <Typography variant="caption" className="text-white/60">
                      {task.timeEstimate}
                    </Typography>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <Typography variant="body2" className="text-green-400 font-medium">
                      ${task.reward.toFixed(2)}
                    </Typography>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-white/40" />
                    <Typography variant="caption" className="text-white/60">
                      {task.completions} completions
                    </Typography>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  variant="primary"
                  size="medium"
                  className="w-full"
                >
                  Start Task
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ))}

            {filteredTasks.length === 0 && (
              <div className="text-center py-12">
                <Typography variant="h3" className="text-white mb-2">
                  No tasks found
                </Typography>
                <Typography variant="body2" className="text-white/60 mb-4">
                  Try adjusting your filters or check back later
                </Typography>
                <Button variant="secondary" size="small">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </SafeAreaView>
  );
}