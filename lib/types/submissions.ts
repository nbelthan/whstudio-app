/**
 * TypeScript types for submission management system
 * Includes comprehensive submission interfaces with task joins
 */

// Base submission data types
export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'under_review';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ReviewStatus = 'not_reviewed' | 'in_review' | 'reviewed';

// Submission data stored in JSONB field
export interface SubmissionData {
  text?: string;
  files?: string[];
  answers?: Record<string, any>;
  metadata?: Record<string, any>;
  [key: string]: any;
}

// Base submission interface
export interface Submission {
  id: string;
  task_id: string;
  user_id: string;
  submitter_nullifier: string;
  submission_data: SubmissionData;
  attachments_urls: string[] | null;
  time_spent_minutes: number | null;
  quality_score: number | null;
  status: SubmissionStatus;
  reviewer_id: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

// Submission with task details (for API responses)
export interface SubmissionWithTask extends Submission {
  task: {
    id: string;
    title: string;
    description: string;
    task_type: string;
    difficulty_level: number;
    reward_amount: number;
    reward_currency: string;
    creator_id: string;
    creator_username?: string;
    category_name?: string;
    status: string;
    expires_at: string | null;
  };
}

// Submission with full user and task details
export interface SubmissionDetailed extends Submission {
  task: {
    id: string;
    title: string;
    description: string;
    instructions: string;
    task_type: string;
    difficulty_level: number;
    estimated_time_minutes: number | null;
    reward_amount: number;
    reward_currency: string;
    creator_id: string;
    creator_username?: string;
    category_name?: string;
    status: string;
    expires_at: string | null;
    created_at: string;
  };
  submitter: {
    id: string;
    username: string | null;
    reputation_score: number;
  };
  reviewer?: {
    id: string;
    username: string | null;
  } | null;
  payment?: {
    id: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    transaction_hash: string | null;
    processed_at: string | null;
  } | null;
}

// Submission creation request
export interface CreateSubmissionRequest {
  task_id: string;
  submission_data: SubmissionData;
  attachments_urls?: string[];
  time_spent_minutes?: number;
}

// Submission review request
export interface ReviewSubmissionRequest {
  status: 'approved' | 'rejected';
  review_notes?: string;
  quality_score?: number;
}

// Submission filters for API queries
export interface SubmissionFilters {
  status?: SubmissionStatus | 'all';
  task_id?: string;
  user_id?: string;
  reviewer_id?: string;
  task_type?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  sort?: 'created_at' | 'reviewed_at' | 'reward_amount' | 'quality_score';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Paginated submission response
export interface PaginatedSubmissions {
  submissions: SubmissionWithTask[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
    current_page: number;
    has_next: boolean;
    has_prev: boolean;
  };
  filters: SubmissionFilters;
  stats?: SubmissionStats;
}

// Submission statistics
export interface SubmissionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  under_review: number;
  total_earnings: number;
  average_quality_score: number | null;
  total_time_spent: number | null;
}

// Submission timeline entry
export interface SubmissionTimelineEntry {
  id: string;
  type: 'created' | 'reviewed' | 'paid' | 'disputed';
  timestamp: string;
  description: string;
  user_id?: string;
  username?: string;
  metadata?: Record<string, any>;
}

// Review dashboard filters
export interface ReviewFilters {
  status?: 'pending' | 'under_review' | 'all';
  task_type?: string;
  difficulty?: number;
  priority?: 'high' | 'medium' | 'low';
  date_from?: string;
  date_to?: string;
  reviewer_id?: string;
  sort?: 'created_at' | 'reward_amount' | 'difficulty_level';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Admin review interface data
export interface ReviewSubmission extends SubmissionDetailed {
  review_priority: 'high' | 'medium' | 'low';
  estimated_review_time: number;
  flags?: string[];
  similar_submissions?: number;
}

// Batch review operations
export interface BatchReviewRequest {
  submission_ids: string[];
  action: 'approve' | 'reject' | 'assign_reviewer';
  review_notes?: string;
  reviewer_id?: string;
  quality_score?: number;
}

// Submission earnings summary
export interface EarningsSummary {
  total_earned: number;
  pending_earnings: number;
  this_month: number;
  last_month: number;
  by_currency: Record<string, number>;
  by_task_type: Record<string, { count: number; total: number }>;
  payment_history: Array<{
    id: string;
    amount: number;
    currency: string;
    task_title: string;
    processed_at: string;
    transaction_hash: string | null;
  }>;
}

// API response types
export interface SubmissionApiResponse {
  success: boolean;
  data?: SubmissionDetailed;
  error?: string;
  message?: string;
}

export interface SubmissionsListApiResponse {
  success: boolean;
  data?: PaginatedSubmissions;
  error?: string;
  message?: string;
}

export interface ReviewApiResponse {
  success: boolean;
  data?: {
    submission: SubmissionDetailed;
    payment?: {
      id: string;
      status: PaymentStatus;
      transaction_hash?: string;
    };
  };
  error?: string;
  message?: string;
}

// Hook return types
export interface UseSubmissionsReturn {
  submissions: SubmissionWithTask[];
  loading: boolean;
  error: string | null;
  stats: SubmissionStats | null;
  pagination: PaginatedSubmissions['pagination'] | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  updateFilters: (filters: Partial<SubmissionFilters>) => void;
}

export interface UseSubmissionReviewReturn {
  reviewSubmission: (
    submissionId: string,
    review: ReviewSubmissionRequest
  ) => Promise<{ success: boolean; error?: string }>;
  batchReview: (
    request: BatchReviewRequest
  ) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
  error: string | null;
}

// Quality metrics
export interface QualityMetrics {
  accuracy: number;
  completeness: number;
  timeliness: number;
  overall: number;
  feedback: string[];
}

// Submission validation errors
export interface SubmissionValidationError {
  field: string;
  message: string;
  code: string;
}

export interface SubmissionValidationResult {
  valid: boolean;
  errors: SubmissionValidationError[];
  warnings: string[];
}