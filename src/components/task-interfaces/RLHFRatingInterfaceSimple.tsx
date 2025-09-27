/**
 * Simplified RLHF Rating Interface Component for World App UI Kit
 * Allows users to compare and rate AI-generated responses for reinforcement learning
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Chip,
  useSafeAreaInsets
} from '@worldcoin/mini-apps-ui-kit-react';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Star
} from 'lucide-react';
import { RLHFRatingData, Task } from '@/types';
import { BUTTON_INTENTS, cn } from '@/lib/utils';

interface RLHFRatingInterfaceProps {
  task: Task;
  onSubmit: (data: RLHFRatingData) => Promise<void>;
  isSubmitting?: boolean;
  className?: string;
}

interface MTBenchInstructions {
  type: 'pairwise_ab';
  prompt: string;
  optionA: string;
  optionB: string;
  gold?: 'A' | 'B';
}

interface ResponseData {
  id: string;
  response_a: string;
  response_b: string;
  prompt: string;
  model_a?: string;
  model_b?: string;
}

const RATING_CRITERIA = [
  { id: 'helpfulness', label: 'Helpfulness', description: 'Which response is more helpful to the user?' },
  { id: 'accuracy', label: 'Accuracy', description: 'Which response is more factually accurate?' },
  { id: 'clarity', label: 'Clarity', description: 'Which response is clearer and easier to understand?' },
  { id: 'relevance', label: 'Relevance', description: 'Which response better addresses the prompt?' },
];

const CONFIDENCE_LEVELS = [
  { value: 1, label: 'Not confident', color: 'text-red-400' },
  { value: 2, label: 'Somewhat confident', color: 'text-orange-400' },
  { value: 3, label: 'Confident', color: 'text-yellow-400' },
  { value: 4, label: 'Very confident', color: 'text-blue-400' },
  { value: 5, label: 'Extremely confident', color: 'text-green-400' },
];

export const RLHFRatingInterface: React.FC<RLHFRatingInterfaceProps> = ({
  task,
  onSubmit,
  isSubmitting = false,
  className,
}) => {
  const [responseData, setResponseData] = useState<ResponseData | null>(null);
  const [chosenResponse, setChosenResponse] = useState<'a' | 'b' | null>(null);
  const [ratingReasons, setRatingReasons] = useState<string[]>([]);
  const [confidenceScore, setConfidenceScore] = useState<number>(3);
  const [additionalComments, setAdditionalComments] = useState('');
  const [timeSpent, setTimeSpent] = useState(0);

  // Timer for tracking time spent
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Load response data from task instructions (MT-Bench format)
  useEffect(() => {
    try {
      // Try to parse MT-Bench format from task instructions
      let mtBenchData: MTBenchInstructions | null = null;

      if (task.verification_criteria && typeof task.verification_criteria === 'object') {
        // Check if verification_criteria contains MT-Bench data
        if ('type' in task.verification_criteria && task.verification_criteria.type === 'pairwise_ab') {
          mtBenchData = task.verification_criteria as MTBenchInstructions;
        }
      }

      // If no MT-Bench data in verification_criteria, try parsing instructions as JSON
      if (!mtBenchData) {
        try {
          const parsed = JSON.parse(task.instructions);
          if (parsed.type === 'pairwise_ab') {
            mtBenchData = parsed as MTBenchInstructions;
          }
        } catch {
          // Not JSON, continue with fallback
        }
      }

      let responseData: ResponseData;

      if (mtBenchData) {
        // Use MT-Bench format
        responseData = {
          id: `mt_bench_${task.id}`,
          prompt: mtBenchData.prompt,
          response_a: mtBenchData.optionA,
          response_b: mtBenchData.optionB,
          model_a: 'Option A',
          model_b: 'Option B',
        };
      } else {
        // Fallback to mock data
        responseData = {
          id: 'sample_comparison',
          prompt: task.instructions || 'Compare these two AI responses and choose the better one.',
          response_a: `Response A: This is a sample AI-generated response that demonstrates one approach to answering the user's question. It provides detailed information and tries to be comprehensive in its coverage of the topic.`,
          response_b: `Response B: This is an alternative AI-generated response that takes a different approach. It might be more concise, use different examples, or emphasize different aspects of the same topic.`,
          model_a: 'Model A',
          model_b: 'Model B',
        };
      }

      setResponseData(responseData);
    } catch (error) {
      console.error('Error parsing task data:', error);
      // Fallback to basic data
      setResponseData({
        id: 'fallback',
        prompt: task.instructions || 'Compare these options and choose the better one.',
        response_a: 'Option A content not available',
        response_b: 'Option B content not available',
        model_a: 'Option A',
        model_b: 'Option B',
      });
    }
  }, [task]);

  const handleReasonToggle = (reason: string) => {
    setRatingReasons(prev =>
      prev.includes(reason)
        ? prev.filter(r => r !== reason)
        : [...prev, reason]
    );
  };

  const handleSubmit = async () => {
    if (!chosenResponse || !responseData) return;

    const submissionData: RLHFRatingData = {
      response_a: responseData.response_a,
      response_b: responseData.response_b,
      chosen_response: chosenResponse,
      rating_reasons: ratingReasons.length > 0 ? ratingReasons : undefined,
      confidence_score: confidenceScore,
      additional_comments: additionalComments.trim() || undefined,
    };

    try {
      await onSubmit(submissionData);
    } catch (error) {
      console.error('Failed to submit RLHF rating:', error);
    }
  };

  const isSubmitDisabled = !chosenResponse || isSubmitting;
  const confidenceLevel = CONFIDENCE_LEVELS.find(level => level.value === confidenceScore);

  if (!responseData) {
    return (
      <div className={cn('animate-pulse bg-white/5 border border-white/10 rounded-2xl p-6', className)}>
        <div className="space-y-4">
          <div className="h-4 bg-white/10 rounded w-3/4" />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="h-32 bg-white/10 rounded" />
            <div className="h-32 bg-white/10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Task Instructions */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Typography variant="h3" className="text-white mb-1">
              RLHF Rating Task
            </Typography>
            <Typography variant="body2" className="text-white/70">
              Compare AI responses and help improve model performance
            </Typography>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
          <Typography variant="body2" className="text-white font-medium mb-2">
            Prompt
          </Typography>
          <Typography variant="body2" className="text-white/80">
            {responseData.prompt}
          </Typography>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/40" />
            <Typography variant="caption" className="text-white/60">
              Time spent: {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
            </Typography>
          </div>
          <Chip variant="secondary" size="small">
            {task.difficulty_level}/5 Difficulty
          </Chip>
        </div>
      </div>

      {/* Response Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Response A */}
        <div
          className={cn(
            'rounded-2xl border border-[color-mix(in srgb,var(--color-divider-low) 60%,transparent)] bg-[color-mix(in srgb,var(--color-bg-surface) 90%,transparent)] p-6 cursor-pointer transition-all duration-200 hover:border-[color-mix(in srgb,var(--color-accent-blue) 35%,transparent)] hover:bg-[color-mix(in srgb,var(--color-bg-surface) 80%,var(--color-accent-blue) 12%)]',
            chosenResponse === 'a' && 'border-[color-mix(in srgb,var(--color-accent-blue) 45%,transparent)] bg-[color-mix(in srgb,var(--color-accent-blue) 18%,transparent)] shadow-[0_0_0_1px_color-mix(in srgb,var(--color-accent-blue) 40%,transparent)]'
          )}
          onClick={() => setChosenResponse('a')}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <Typography variant="h3" className="text-[var(--color-text-primary)] mb-1">
                Response A
              </Typography>
              <Typography variant="caption" className="text-[var(--color-text-secondary)]">
                {responseData.model_a}
              </Typography>
            </div>
            <div className="flex items-center gap-2">
              {chosenResponse === 'a' && (
                <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
              )}
              <Chip variant={chosenResponse === 'a' ? 'primary' : 'secondary'} size="small">
                {chosenResponse === 'a' ? 'Selected' : 'Option A'}
              </Chip>
            </div>
          </div>
          <Typography variant="body2" className="text-[var(--color-text-primary)] leading-relaxed">
            {responseData.response_a}
          </Typography>
        </div>

        {/* Response B */}
        <div
          className={cn(
            'rounded-2xl border border-[color-mix(in srgb,var(--color-divider-low) 60%,transparent)] bg-[color-mix(in srgb,var(--color-bg-surface) 90%,transparent)] p-6 cursor-pointer transition-all duration-200 hover:border-[color-mix(in srgb,var(--color-accent-blue) 35%,transparent)] hover:bg-[color-mix(in srgb,var(--color-bg-surface) 80%,var(--color-accent-blue) 12%)]',
            chosenResponse === 'b' && 'border-[color-mix(in srgb,var(--color-accent-blue) 45%,transparent)] bg-[color-mix(in srgb,var(--color-accent-blue) 18%,transparent)] shadow-[0_0_0_1px_color-mix(in srgb,var(--color-accent-blue) 40%,transparent)]'
          )}
          onClick={() => setChosenResponse('b')}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <Typography variant="h3" className="text-[var(--color-text-primary)] mb-1">
                Response B
              </Typography>
              <Typography variant="caption" className="text-[var(--color-text-secondary)]">
                {responseData.model_b}
              </Typography>
            </div>
            <div className="flex items-center gap-2">
              {chosenResponse === 'b' && (
                <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
              )}
              <Chip variant={chosenResponse === 'b' ? 'primary' : 'secondary'} size="small">
                {chosenResponse === 'b' ? 'Selected' : 'Option B'}
              </Chip>
            </div>
          </div>
          <Typography variant="body2" className="text-[var(--color-text-primary)] leading-relaxed">
            {responseData.response_b}
          </Typography>
        </div>
      </div>

      {/* Rating Criteria */}
      {chosenResponse && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <Typography variant="h3" className="text-white mb-2">
            Why did you choose this response?
          </Typography>
          <Typography variant="body2" className="text-white/60 mb-4">
            Select all criteria that influenced your decision (optional)
          </Typography>

          <div className="grid sm:grid-cols-2 gap-3">
            {RATING_CRITERIA.map((criterion) => (
              <button
                key={criterion.id}
                onClick={() => handleReasonToggle(criterion.id)}
                className={cn(
                  'flex items-start gap-3 p-3 text-left rounded-xl border transition-all duration-200 bg-[color-mix(in srgb,var(--color-bg-surface) 92%,transparent)] border-[color-mix(in srgb,var(--color-divider-low) 55%,transparent)] text-[var(--color-text-secondary)] hover:bg-[color-mix(in srgb,var(--color-bg-surface) 82%,var(--color-accent-blue) 12%)] hover:text-[var(--color-text-primary)]',
                  ratingReasons.includes(criterion.id)
                    ? 'border-[color-mix(in srgb,var(--color-accent-blue) 45%,transparent)] bg-[color-mix(in srgb,var(--color-accent-blue) 18%,transparent)] text-[var(--color-accent-blue)] shadow-[0_0_0_1px_color-mix(in srgb,var(--color-accent-blue) 35%,transparent)]'
                    : ''
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded border-2 mt-0.5 flex-shrink-0 transition-colors duration-200',
                  ratingReasons.includes(criterion.id)
                    ? 'bg-[var(--color-accent-blue)] border-[color-mix(in srgb,var(--color-accent-blue) 55%,transparent)]'
                    : 'border-[color-mix(in srgb,var(--color-divider-low) 55%,transparent)]'
                )}>
                  {ratingReasons.includes(criterion.id) && (
                    <CheckCircle className="w-3 h-3 text-[var(--color-bg-base)]" />
                  )}
                </div>
                <div>
                  <Typography variant="body2" className="font-medium mb-1">
                    {criterion.label}
                  </Typography>
                  <Typography variant="caption" className="opacity-75">
                    {criterion.description}
                  </Typography>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Confidence Level */}
      {chosenResponse && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <Typography variant="h3" className="text-white mb-2">
            Confidence Level
          </Typography>
          <Typography variant="body2" className="text-white/60 mb-4">
            How confident are you in your choice?
          </Typography>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Typography variant="body2" className="text-[var(--color-text-primary)]">
                Confidence:
              </Typography>
              <Typography variant="body2" className={cn('font-medium', confidenceLevel?.color)}>
                {confidenceLevel?.label}
              </Typography>
            </div>

            <div className="relative">
              <input
                type="range"
                min={1}
                max={5}
                value={confidenceScore}
                onChange={(e) => setConfidenceScore(parseInt(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer slider bg-[color-mix(in srgb,var(--color-accent-blue) 20%,transparent)]"
              />
              <div className="flex justify-between text-xs text-[var(--color-text-secondary)] mt-2">
                <span>Not confident</span>
                <span>Very confident</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Comments */}
      {chosenResponse && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <Typography variant="h3" className="text-white mb-2">
            Additional Comments
          </Typography>
          <Typography variant="body2" className="text-white/60 mb-4">
            Any other thoughts or feedback? (optional)
          </Typography>

          <textarea
            placeholder="Share any additional insights about your choice..."
            value={additionalComments}
            onChange={(e) => setAdditionalComments(e.target.value)}
            maxLength={500}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/50"
            rows={3}
          />
          <Typography variant="caption" className="text-white/50 text-right block mt-1">
            {additionalComments.length}/500 characters
          </Typography>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button
          variant="primary"
          size="large"
          disabled={isSubmitDisabled}
          onClick={handleSubmit}
          className={`${BUTTON_INTENTS.primary} !min-w-48 !h-12 !rounded-2xl`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Rating'}
        </Button>
      </div>

      {/* Custom styles for range slider */}
      <style jsx>{`
        .slider::-webkit-slider-runnable-track {
          background: color-mix(in srgb, var(--color-accent-blue) 20%, transparent);
          height: 8px;
          border-radius: 999px;
        }

        .slider::-moz-range-track {
          background: color-mix(in srgb, var(--color-accent-blue) 20%, transparent);
          height: 8px;
          border-radius: 999px;
        }

        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--color-accent-blue);
          cursor: pointer;
          border: 2px solid color-mix(in srgb, var(--color-bg-base) 80%, transparent);
          box-shadow: 0 4px 12px rgba(75, 122, 242, 0.45);
          margin-top: -6px;
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--color-accent-blue);
          cursor: pointer;
          border: 2px solid color-mix(in srgb, var(--color-bg-base) 80%, transparent);
          box-shadow: 0 4px 12px rgba(75, 122, 242, 0.45);
        }
      `}</style>
    </div>
  );
};

export default RLHFRatingInterface;
