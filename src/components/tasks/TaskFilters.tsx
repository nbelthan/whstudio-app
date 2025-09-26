/**
 * Task filters component with search, category, difficulty, and reward filters
 * Provides filtering interface for task listings
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Filter, X, Search, ChevronDown, SlidersHorizontal } from 'lucide-react';

import { Button, Input, Card, Badge, Modal } from '@/components/ui';
import { TaskFilters, TaskSortOptions, TaskType, TaskDifficulty, TaskStatus } from '@/types';
import { useTaskCategories } from '@/hooks/useTasks';
import { getTaskTypeDisplayName, getTaskTypeIcon, cn } from '@/lib/utils';

interface TaskFiltersProps {
  filters: TaskFilters;
  sortOptions: TaskSortOptions;
  onFiltersChange: (filters: Partial<TaskFilters>) => void;
  onSortChange: (sort: TaskSortOptions) => void;
  className?: string;
}

const TASK_TYPES: TaskType[] = [
  'data_entry',
  'content_review',
  'transcription',
  'translation',
  'image_tagging',
  'quality_assurance',
  'research',
  'creative_tasks',
  'rlhf_rating',
  'voice_recording',
  'data_annotation',
];

const DIFFICULTY_LEVELS: { value: TaskDifficulty; label: string; color: string }[] = [
  { value: 1, label: 'Beginner', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 2, label: 'Easy', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 3, label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 4, label: 'Hard', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 5, label: 'Expert', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

const SORT_OPTIONS: { field: TaskSortOptions['field']; label: string }[] = [
  { field: 'created_at', label: 'Recently Added' },
  { field: 'reward_amount', label: 'Highest Reward' },
  { field: 'difficulty_level', label: 'Difficulty' },
  { field: 'expires_at', label: 'Expiring Soon' },
  { field: 'priority', label: 'Priority' },
];

export const TaskFiltersComponent: React.FC<TaskFiltersProps> = ({
  filters,
  sortOptions,
  onFiltersChange,
  onSortChange,
  className,
}) => {
  const { categories } = useTaskCategories();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchQuery, setSearchQuery] = useState(filters.category || '');

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category) count++;
    if (filters.task_type) count++;
    if (filters.difficulty_level) count++;
    if (filters.reward_min || filters.reward_max) count++;
    if (filters.status) count++;
    if (filters.expires_within_hours) count++;
    return count;
  }, [filters]);

  const handleFilterChange = (key: keyof TaskFilters, value: any) => {
    onFiltersChange({ [key]: value || undefined });
  };

  const clearFilters = () => {
    onFiltersChange({
      category: undefined,
      task_type: undefined,
      difficulty_level: undefined,
      reward_min: undefined,
      reward_max: undefined,
      status: undefined,
      expires_within_hours: undefined,
    });
    setSearchQuery('');
  };

  const handleSortChange = (field: TaskSortOptions['field']) => {
    const newDirection = sortOptions.field === field && sortOptions.direction === 'desc' ? 'asc' : 'desc';
    onSortChange({ field, direction: newDirection });
  };

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {/* Search and Quick Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1">
            <Input
              placeholder="Search tasks by title or description..."
              leftIcon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Debounced search could be implemented here
              }}
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex gap-2">
            <select
              className="h-10 px-3 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(25,137,251)]/20 focus:border-[rgb(25,137,251)]"
              value={`${sortOptions.field}:${sortOptions.direction}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split(':');
                onSortChange({
                  field: field as TaskSortOptions['field'],
                  direction: direction as 'asc' | 'desc'
                });
              }}
            >
              {SORT_OPTIONS.map(({ field, label }) => (
                <React.Fragment key={field}>
                  <option value={`${field}:desc`}>{label} (High to Low)</option>
                  <option value={`${field}:asc`}>{label} (Low to High)</option>
                </React.Fragment>
              ))}
            </select>

            {/* Advanced Filters Toggle */}
            <Button
              variant={activeFilterCount > 0 ? 'primary' : 'secondary'}
              onClick={() => setShowAdvanced(true)}
              leftIcon={<SlidersHorizontal className="w-4 h-4" />}
            >
              Filters
              {activeFilterCount > 0 && (
                <Badge size="sm" className="ml-2 bg-white/20 text-white">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Quick Filter Tags */}
        <div className="flex flex-wrap gap-2">
          {/* Task Type Quick Filters */}
          {TASK_TYPES.slice(0, 6).map((taskType) => (
            <button
              key={taskType}
              onClick={() => handleFilterChange('task_type',
                filters.task_type === taskType ? undefined : taskType
              )}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-xs rounded-full border transition-colors',
                filters.task_type === taskType
                  ? 'bg-[rgb(25,137,251)]/20 text-[rgb(25,137,251)] border-[rgb(25,137,251)]/30'
                  : 'bg-white/5 text-white/70 border-white/20 hover:bg-white/10 hover:text-white'
              )}
            >
              <span>{getTaskTypeIcon(taskType)}</span>
              <span>{getTaskTypeDisplayName(taskType)}</span>
            </button>
          ))}

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Modal */}
      <Modal
        isOpen={showAdvanced}
        onClose={() => setShowAdvanced(false)}
        title="Advanced Filters"
        size="lg"
      >
        <div className="space-y-6">
          {/* Categories */}
          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-white mb-3">
                Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleFilterChange('category',
                      filters.category === category.name ? undefined : category.name
                    )}
                    className={cn(
                      'flex items-center gap-2 p-3 text-sm rounded-lg border transition-colors text-left',
                      filters.category === category.name
                        ? 'bg-[rgb(25,137,251)]/20 text-[rgb(25,137,251)] border-[rgb(25,137,251)]/30'
                        : 'bg-white/5 text-white/80 border-white/20 hover:bg-white/10'
                    )}
                  >
                    <span className="text-base">{category.icon}</span>
                    <span className="truncate">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Task Types */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              Task Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TASK_TYPES.map((taskType) => (
                <button
                  key={taskType}
                  onClick={() => handleFilterChange('task_type',
                    filters.task_type === taskType ? undefined : taskType
                  )}
                  className={cn(
                    'flex items-center gap-3 p-3 text-sm rounded-lg border transition-colors text-left',
                    filters.task_type === taskType
                      ? 'bg-[rgb(25,137,251)]/20 text-[rgb(25,137,251)] border-[rgb(25,137,251)]/30'
                      : 'bg-white/5 text-white/80 border-white/20 hover:bg-white/10'
                  )}
                >
                  <span className="text-base">{getTaskTypeIcon(taskType)}</span>
                  <span>{getTaskTypeDisplayName(taskType)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Level */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              Difficulty Level
            </label>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => handleFilterChange('difficulty_level',
                    filters.difficulty_level === level.value ? undefined : level.value
                  )}
                  className={cn(
                    'px-3 py-2 text-sm rounded-lg border transition-colors',
                    filters.difficulty_level === level.value
                      ? level.color
                      : 'bg-white/5 text-white/70 border-white/20 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reward Range */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              Reward Range (WLD)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Min reward"
                value={filters.reward_min?.toString() || ''}
                onChange={(e) => handleFilterChange('reward_min',
                  e.target.value ? parseFloat(e.target.value) : undefined
                )}
              />
              <Input
                type="number"
                placeholder="Max reward"
                value={filters.reward_max?.toString() || ''}
                onChange={(e) => handleFilterChange('reward_max',
                  e.target.value ? parseFloat(e.target.value) : undefined
                )}
              />
            </div>
          </div>

          {/* Expires Within */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              Expires Within
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { hours: 24, label: '24 hours' },
                { hours: 72, label: '3 days' },
                { hours: 168, label: '1 week' },
                { hours: 720, label: '30 days' },
              ].map(({ hours, label }) => (
                <button
                  key={hours}
                  onClick={() => handleFilterChange('expires_within_hours',
                    filters.expires_within_hours === hours ? undefined : hours
                  )}
                  className={cn(
                    'px-3 py-2 text-sm rounded-lg border transition-colors',
                    filters.expires_within_hours === hours
                      ? 'bg-[rgb(25,137,251)]/20 text-[rgb(25,137,251)] border-[rgb(25,137,251)]/30'
                      : 'bg-white/5 text-white/70 border-white/20 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <Modal.Footer>
          <Button variant="ghost" onClick={clearFilters}>
            Clear All
          </Button>
          <Button onClick={() => setShowAdvanced(false)}>
            Apply Filters
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default TaskFiltersComponent;