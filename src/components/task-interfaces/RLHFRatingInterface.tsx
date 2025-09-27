/**
 * RLHF Rating Interface Component
 * Allows users to compare and rate AI-generated responses for reinforcement learning
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Star, AlertTriangle, CheckCircle, MessageSquare } from 'lucide-react';

import {
  SafeAreaView,
  Typography,
  Button,
  Chip,
  useSafeAreaInsets
} from '@worldcoin/mini-apps-ui-kit-react';
import { RLHFRatingData, Task } from '@/types';
import { cn } from '@/lib/utils';

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
  criteria?: string[];
}

const RATING_CRITERIA = [
  { id: 'helpfulness', label: 'Helpfulness', description: 'Which response is more helpful to the user?' },
  { id: 'accuracy', label: 'Accuracy', description: 'Which response is more factually accurate?' },
  { id: 'clarity', label: 'Clarity', description: 'Which response is clearer and easier to understand?' },
  { id: 'relevance', label: 'Relevance', description: 'Which response better addresses the prompt?' },
  { id: 'safety', label: 'Safety', description: 'Which response is safer and more appropriate?' },
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
  const [showGuidelines, setShowGuidelines] = useState(false);
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
          criteria: ['helpfulness', 'accuracy', 'clarity', 'relevance'],
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
          criteria: ['helpfulness', 'accuracy', 'clarity'],
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
        criteria: ['helpfulness'],
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
      <Card variant="elevated">
        <Card.Header
          title="RLHF Rating Task"
          subtitle="Compare AI responses and help improve model performance"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGuidelines(true)}
              leftIcon={<MessageSquare className="w-4 h-4" />}
            >
              Guidelines
            </Button>
          }
        />
        <Card.Content>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Prompt</h4>
            <p className="text-white/80 text-sm">{responseData.prompt}</p>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-white/60">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>Time spent: {Math.floor(timeSpent / 60)}m {timeSpent % 60}s</span>
            </div>
            <Badge variant="info" size="sm">
              {task.difficulty_level}/5 Difficulty
            </Badge>
          </div>
        </Card.Content>
      </Card>

      {/* Response Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Response A */}
        <Card
          variant={chosenResponse === 'a' ? 'elevated' : 'default'}
          className={cn(
            'cursor-pointer transition-all duration-200',
            chosenResponse === 'a' && 'ring-2 ring-[rgb(25,137,251)]/30 border-[rgb(25,137,251)]/50'
          )}
          onClick={() => setChosenResponse('a')}
        >
          <Card.Header
            title="Response A"
            subtitle={responseData.model_a}
            action={
              <div className="flex items-center gap-2">
                {chosenResponse === 'a' && (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
                <Badge variant={chosenResponse === 'a' ? 'primary' : 'default'} size="sm">
                  {chosenResponse === 'a' ? 'Selected' : 'Option A'}
                </Badge>
              </div>
            }
          />
          <Card.Content>
            <p className="text-white/80 leading-relaxed">
              {responseData.response_a}
            </p>
          </Card.Content>
        </Card>

        {/* Response B */}
        <Card
          variant={chosenResponse === 'b' ? 'elevated' : 'default'}
          className={cn(
            'cursor-pointer transition-all duration-200',
            chosenResponse === 'b' && 'ring-2 ring-[rgb(25,137,251)]/30 border-[rgb(25,137,251)]/50'
          )}
          onClick={() => setChosenResponse('b')}
        >
          <Card.Header
            title="Response B"
            subtitle={responseData.model_b}
            action={
              <div className="flex items-center gap-2">
                {chosenResponse === 'b' && (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
                <Badge variant={chosenResponse === 'b' ? 'primary' : 'default'} size="sm">
                  {chosenResponse === 'b' ? 'Selected' : 'Option B'}
                </Badge>
              </div>
            }
          />
          <Card.Content>
            <p className="text-white/80 leading-relaxed">
              {responseData.response_b}
            </p>
          </Card.Content>
        </Card>
      </div>

      {/* Rating Criteria */}
      {chosenResponse && (
        <Card variant="elevated">
          <Card.Header
            title="Why did you choose this response?"
            subtitle="Select all criteria that influenced your decision (optional)"
          />
          <Card.Content>
            <div className="grid sm:grid-cols-2 gap-3">
              {RATING_CRITERIA.map((criterion) => (
                <button
                  key={criterion.id}
                  onClick={() => handleReasonToggle(criterion.id)}
                  className={cn(
                    'flex items-start gap-3 p-3 text-left rounded-lg border transition-colors',
                    ratingReasons.includes(criterion.id)
                      ? 'bg-[rgb(25,137,251)]/20 border-[rgb(25,137,251)]/30 text-[rgb(25,137,251)]'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded border-2 mt-0.5 flex-shrink-0',
                    ratingReasons.includes(criterion.id)
                      ? 'bg-[rgb(25,137,251)] border-[rgb(25,137,251)]'
                      : 'border-white/30'
                  )}>
                    {ratingReasons.includes(criterion.id) && (
                      <CheckCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{criterion.label}</div>
                    <div className="text-sm opacity-75">{criterion.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Confidence Level */}
      {chosenResponse && (
        <Card variant="elevated">
          <Card.Header
            title="Confidence Level"
            subtitle="How confident are you in your choice?"
          />
          <Card.Content>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white/80">Confidence:</span>
                <span className={cn('font-medium', confidenceLevel?.color)}>
                  {confidenceLevel?.label}
                </span>
              </div>

              <div className="relative">
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={confidenceScore}
                  onChange={(e) => setConfidenceScore(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-white/60 mt-2">
                  <span>Not confident</span>
                  <span>Very confident</span>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Additional Comments */}
      {chosenResponse && (
        <Card variant="elevated">
          <Card.Header
            title="Additional Comments"
            subtitle="Any other thoughts or feedback? (optional)"
          />
          <Card.Content>
            <Input
              placeholder="Share any additional insights about your choice..."
              value={additionalComments}
              onChange={(e) => setAdditionalComments(e.target.value)}
              maxLength={500}
            />
            <div className="text-right text-xs text-white/50 mt-1">
              {additionalComments.length}/500 characters
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          disabled={isSubmitDisabled}
          loading={isSubmitting}
          onClick={handleSubmit}
          leftIcon={<ThumbsUp className="w-4 h-4" />}
        >
          Submit Rating
        </Button>
      </div>

      {/* Guidelines Modal */}
      <Modal
        isOpen={showGuidelines}
        onClose={() => setShowGuidelines(false)}
        title="RLHF Rating Guidelines"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="text-blue-400 font-medium">Important</h4>
                <p className="text-white/80 text-sm mt-1">
                  Your ratings help train AI models to be more helpful, accurate, and safe.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-medium">How to Rate:</h4>
            <ul className="space-y-2 text-white/80 text-sm">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-white/60 rounded-full mt-2 flex-shrink-0" />
                <span>Read both responses carefully and completely</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-white/60 rounded-full mt-2 flex-shrink-0" />
                <span>Consider helpfulness, accuracy, clarity, relevance, and safety</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-white/60 rounded-full mt-2 flex-shrink-0" />
                <span>Choose the response that better serves the user's needs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-white/60 rounded-full mt-2 flex-shrink-0" />
                <span>Be honest about your confidence level</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-medium">What to Avoid:</h4>
            <ul className="space-y-2 text-white/80 text-sm">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                <span>Don't choose based on length alone</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                <span>Don't let personal biases influence your choice</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                <span>Don't rush - take time to evaluate properly</span>
              </li>
            </ul>
          </div>
        </div>

        <Modal.Footer>
          <Button onClick={() => setShowGuidelines(false)}>
            Got it
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Custom styles for range slider */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgb(25, 137, 251);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgb(25, 137, 251);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default RLHFRatingInterface;