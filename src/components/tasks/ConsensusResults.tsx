/**
 * ConsensusResults Component
 * Displays aggregated consensus statistics for RLHF tasks
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Chip,
  Skeleton,
  useSafeAreaInsets
} from '@worldcoin/mini-apps-ui-kit-react';
import {
  BarChart3,
  Users,
  Clock,
  Award,
  RefreshCw,
  TrendingUp,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface ConsensusData {
  total_responses: number;
  choice_a_count: number;
  choice_b_count: number;
  agreement_percentage: number;
  consensus_choice: 'A' | 'B' | null;
  confidence_stats?: {
    average_confidence: number;
    min_confidence?: number;
    max_confidence?: number;
  };
  timing_stats?: {
    average_time_seconds: number;
    min_time_seconds?: number;
    max_time_seconds?: number;
  };
}

interface ConsensusResultsProps {
  taskId: string;
  className?: string;
  onRefresh?: () => void;
}

export const ConsensusResults: React.FC<ConsensusResultsProps> = ({
  taskId,
  className = '',
  onRefresh
}) => {
  const [consensusData, setConsensusData] = useState<ConsensusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConsensusData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tasks/${taskId}/consensus`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch consensus data');
      }

      setConsensusData(result.data);
    } catch (err) {
      console.error('Error fetching consensus data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load consensus data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchConsensusData();
    }
  }, [taskId]);

  const handleRefresh = () => {
    fetchConsensusData();
    onRefresh?.();
  };

  const getChoicePercentage = (choice: 'A' | 'B') => {
    if (!consensusData || consensusData.total_responses === 0) return 0;

    const count = choice === 'A' ? consensusData.choice_a_count : consensusData.choice_b_count;
    return Math.round((count / consensusData.total_responses) * 100);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  const getConsensusStrength = (percentage: number) => {
    if (percentage >= 80) return { label: 'Strong Consensus', color: 'success', icon: CheckCircle };
    if (percentage >= 60) return { label: 'Moderate Consensus', color: 'warning', icon: TrendingUp };
    return { label: 'Weak Consensus', color: 'error', icon: AlertTriangle };
  };

  if (loading) {
    return (
      <div className={`bg-white/5 border border-white/10 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="w-32 h-6 rounded" />
        </div>
        <div className="space-y-4">
          <Skeleton className="w-full h-16 rounded" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="w-full h-12 rounded" />
            <Skeleton className="w-full h-12 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-500/10 border border-red-500/20 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <Typography variant="h3" className="text-red-400">
            Failed to Load Consensus
          </Typography>
        </div>
        <Typography variant="body2" className="text-red-300 mb-4">
          {error}
        </Typography>
        <Button
          variant="secondary"
          size="small"
          onClick={handleRefresh}
          className="!bg-red-500/20 !text-red-300 !border-red-500/30"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (!consensusData || consensusData.total_responses === 0) {
    return (
      <div className={`bg-white/5 border border-white/10 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-white/60" />
          <Typography variant="h3" className="text-white">
            Consensus Results
          </Typography>
        </div>
        <div className="text-center py-8">
          <Typography variant="body2" className="text-white/60 mb-4">
            No submissions yet. Consensus will appear once users start rating.
          </Typography>
          <Button
            variant="secondary"
            size="small"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  const choiceAPercentage = getChoicePercentage('A');
  const choiceBPercentage = getChoicePercentage('B');
  const consensusStrength = getConsensusStrength(consensusData.agreement_percentage);
  const ConsensusIcon = consensusStrength.icon;

  return (
    <div className={`bg-white/5 border border-white/10 rounded-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-white/60" />
          <Typography variant="h3" className="text-white">
            Consensus Results
          </Typography>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={handleRefresh}
          className="!p-2"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-white/40" />
            <Typography variant="caption" className="text-white/60">
              Total Responses
            </Typography>
          </div>
          <Typography variant="h3" className="text-white">
            {consensusData.total_responses}
          </Typography>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ConsensusIcon className="w-4 h-4 text-white/40" />
            <Typography variant="caption" className="text-white/60">
              Agreement
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            <Typography variant="h3" className="text-white">
              {consensusData.agreement_percentage}%
            </Typography>
            <Chip variant={consensusStrength.color} size="small">
              {consensusStrength.label}
            </Chip>
          </div>
        </div>

        {consensusData.confidence_stats && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-white/40" />
              <Typography variant="caption" className="text-white/60">
                Avg Confidence
              </Typography>
            </div>
            <Typography variant="h3" className="text-white">
              {Math.round(consensusData.confidence_stats.average_confidence * 100)}%
            </Typography>
          </div>
        )}

        {consensusData.timing_stats && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-white/40" />
              <Typography variant="caption" className="text-white/60">
                Avg Time
              </Typography>
            </div>
            <Typography variant="h3" className="text-white">
              {formatTime(consensusData.timing_stats.average_time_seconds)}
            </Typography>
          </div>
        )}
      </div>

      {/* Choice Comparison */}
      <div className="space-y-4">
        <Typography variant="h3" className="text-white mb-4">
          Choice Distribution
        </Typography>

        {/* Option A */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Typography variant="body2" className="text-white font-medium">
                Option A
              </Typography>
              {consensusData.consensus_choice === 'A' && (
                <Chip variant="success" size="small">
                  Consensus Winner
                </Chip>
              )}
            </div>
            <Typography variant="body2" className="text-white">
              {consensusData.choice_a_count} votes ({choiceAPercentage}%)
            </Typography>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                consensusData.consensus_choice === 'A'
                  ? 'bg-green-400'
                  : 'bg-blue-400'
              }`}
              style={{ width: `${choiceAPercentage}%` }}
            />
          </div>
        </div>

        {/* Option B */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Typography variant="body2" className="text-white font-medium">
                Option B
              </Typography>
              {consensusData.consensus_choice === 'B' && (
                <Chip variant="success" size="small">
                  Consensus Winner
                </Chip>
              )}
            </div>
            <Typography variant="body2" className="text-white">
              {consensusData.choice_b_count} votes ({choiceBPercentage}%)
            </Typography>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                consensusData.consensus_choice === 'B'
                  ? 'bg-green-400'
                  : 'bg-orange-400'
              }`}
              style={{ width: `${choiceBPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Consensus Summary */}
      {consensusData.consensus_choice && (
        <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <Typography variant="body2" className="text-green-400 font-medium">
                Community Consensus: Option {consensusData.consensus_choice}
              </Typography>
              <Typography variant="caption" className="text-green-300">
                {consensusData.agreement_percentage}% agreement among {consensusData.total_responses} participants
              </Typography>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsensusResults;