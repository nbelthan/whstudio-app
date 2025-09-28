/**
 * Task card component for displaying task information in lists and grids
 * Supports different layouts and interaction states
 */

'use client';

import React from 'react';
import { Clock, DollarSign, Users, Calendar, Shield, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

import { Card, Badge, Button } from '@/components/ui';
import { Task } from '@/types';
import {
  formatCurrency,
  formatTimeAgo,
  formatDuration,
  getTaskTypeDisplayName,
  getTaskTypeIcon,
  getTaskDifficultyProps,
  getStatusProps,
  truncateText,
  cn,
} from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  layout?: 'compact' | 'detailed' | 'grid';
  showActions?: boolean;
  onTaskClick?: (task: Task) => void;
  className?: string;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  layout = 'detailed',
  showActions = true,
  onTaskClick,
  className,
}) => {
  const difficultyProps = getTaskDifficultyProps(task.difficulty_level);
  const statusProps = getStatusProps(task.status);
  const taskTypeIcon = getTaskTypeIcon(task.task_type);
  const taskTypeName = getTaskTypeDisplayName(task.task_type);

  const isExpiringSoon = task.expires_at && new Date(task.expires_at) <= new Date(Date.now() + 24 * 60 * 60 * 1000);
  const isCompleted = task.user_has_submitted;
  const canWork = task.status === 'active' && !isCompleted && (!task.expires_at || new Date(task.expires_at) > new Date());

  const handleClick = () => {
    onTaskClick?.(task);
  };

  const renderTaskHeader = () => (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-lg">{taskTypeIcon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-lg leading-tight mb-1">
            {layout === 'compact' ? truncateText(task.title, 60) : task.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <span>{taskTypeName}</span>
            <span>•</span>
            <span>{task.creator_username || 'Anonymous'}</span>
            <span>•</span>
            <span>{formatTimeAgo(task.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge
          variant={statusProps.label === 'Active' ? 'success' : 'default'}
          size="sm"
        >
          {statusProps.label}
        </Badge>
        {task.requires_verification && (
          <Shield className="w-4 h-4 text-[rgb(25,137,251)]" title="Requires verification" />
        )}
      </div>
    </div>
  );

  const renderTaskContent = () => (
    <div className="space-y-3">
      {layout !== 'compact' && (
        <p className="text-white/80 text-sm leading-relaxed">
          {truncateText(task.description, layout === 'grid' ? 120 : 200)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 text-sm">
        {/* Reward */}
        <div className="flex items-center gap-1 text-green-400">
          <DollarSign className="w-4 h-4" />
          <span className="font-medium">{formatCurrency(task.reward_amount, task.reward_currency)}</span>
        </div>

        {/* Difficulty */}
        <div className="flex items-center gap-1">
          <Badge
            size="sm"
            className={cn('border', difficultyProps.bgColor, difficultyProps.color)}
          >
            {difficultyProps.label}
          </Badge>
        </div>

        {/* Time estimate */}
        <div className="flex items-center gap-1 text-white/60">
          <Clock className="w-4 h-4" />
          <span>{formatDuration(task.estimated_time_minutes)}</span>
        </div>

        {/* Submissions */}
        {task.max_submissions > 1 && (
          <div className="flex items-center gap-1 text-white/60">
            <Users className="w-4 h-4" />
            <span>{task.max_submissions} slots</span>
          </div>
        )}

        {/* Expiration warning */}
        {isExpiringSoon && (
          <div className="flex items-center gap-1 text-yellow-400">
            <Calendar className="w-4 h-4" />
            <span>Expires soon</span>
          </div>
        )}
      </div>

      {task.category_name && (
        <div>
          <Badge variant="ghost" size="sm">
            {task.category_name}
          </Badge>
        </div>
      )}
    </div>
  );

  const renderTaskActions = () => {
    if (!showActions) return null;

    return (
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          {isCompleted && (
            <div className="flex items-center gap-1 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>
                {task.user_submission_status === 'approved' ? 'Completed' :
                 task.user_submission_status === 'rejected' ? 'Rejected' :
                 task.user_submission_status === 'under_review' ? 'Under Review' :
                 'Submitted'}
              </span>
            </div>
          )}

          {!canWork && !isCompleted && task.status !== 'active' && (
            <div className="flex items-center gap-1 text-red-400 text-sm">
              <XCircle className="w-4 h-4" />
              <span>Unavailable</span>
            </div>
          )}

          {task.expires_at && (
            <span className="text-white/50 text-xs">
              Expires {formatTimeAgo(task.expires_at)}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              // View details action
            }}
          >
            Details
          </Button>

          {canWork && (
            <Link href={`/tasks/${task.id}`} onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="primary">
                Start Task
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  };

  const cardContent = (
    <>
      {renderTaskHeader()}
      {renderTaskContent()}
      {renderTaskActions()}
    </>
  );

  if (layout === 'compact') {
    return (
      <Card
        variant="default"
        hover
        clickable
        onClick={handleClick}
        className={cn('p-6', className)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-sm">{taskTypeIcon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium truncate">{task.title}</h3>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <span>{taskTypeName}</span>
                <span>•</span>
                <span className="font-medium text-green-400">
                  {formatCurrency(task.reward_amount, task.reward_currency)}
                </span>
              </div>
            </div>
          </div>
          <Badge size="sm" className={cn(difficultyProps.bgColor, difficultyProps.color)}>
            {difficultyProps.label}
          </Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card
      variant="default"
      hover
      clickable
      onClick={handleClick}
      padding="none"
      className={cn(
        'overflow-hidden',
        layout === 'grid' ? 'h-full' : '',
        className
      )}
    >
      <div className="p-6 space-y-4">
        {cardContent}
      </div>
    </Card>
  );
};

export default TaskCard;