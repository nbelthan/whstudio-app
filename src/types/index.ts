/**
 * Type definitions for WorldHuman Studio App
 * Based on the database schema and API responses
 */

// Core user types
export interface User {
  id: string;
  world_id: string;
  nullifier_hash: string;
  verification_level: 'orb' | 'device';
  wallet_address?: string;
  username?: string;
  profile_image_url?: string;
  bio?: string;
  reputation_score: number;
  total_earned: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  nullifier_hash: string;
  device_info?: Record<string, any>;
  ip_address?: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  last_accessed_at: string;
}

// Task category types
export interface TaskCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  is_active: boolean;
  created_at: string;
}

// Task types
export type TaskType =
  | 'data_entry'
  | 'content_review'
  | 'transcription'
  | 'translation'
  | 'image_tagging'
  | 'quality_assurance'
  | 'research'
  | 'creative_tasks'
  | 'rlhf_rating'
  | 'voice_recording'
  | 'data_annotation';

export type TaskStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export type TaskDifficulty = 1 | 2 | 3 | 4 | 5;
export type TaskPriority = 1 | 2 | 3 | 4 | 5;
export type RewardCurrency = 'WLD' | 'ETH' | 'USDC';

export interface Task {
  id: string;
  creator_id: string;
  category_id?: string;
  title: string;
  description: string;
  instructions: string;
  task_type: TaskType;
  difficulty_level: TaskDifficulty;
  estimated_time_minutes: number;
  reward_amount: number;
  reward_currency: RewardCurrency;
  max_submissions: number;
  requires_verification: boolean;
  verification_criteria?: Record<string, any>;
  attachment_urls?: string[];
  status: TaskStatus;
  priority: TaskPriority;
  expires_at?: string;
  created_at: string;
  updated_at: string;

  // Additional fields from API responses
  category_name?: string;
  creator_username?: string;
  user_has_submitted?: boolean;
  user_submission_status?: SubmissionStatus;
  is_creator?: boolean;
}

// Submission types
export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'under_review';

export interface Submission {
  id: string;
  task_id: string;
  user_id: string;
  submitter_nullifier: string;
  submission_data: Record<string, any>;
  attachments_urls?: string[];
  time_spent_minutes?: number;
  quality_score?: number;
  status: SubmissionStatus;
  reviewer_id?: string;
  review_notes?: string;
  reviewed_at?: string;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

// Payment types
export type PaymentType = 'task_reward' | 'escrow_deposit' | 'escrow_release' | 'refund';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type PaymentMethod = 'world_pay' | 'crypto_wallet' | 'fiat';

export interface Payment {
  id: string;
  task_id: string;
  submission_id?: string;
  payer_id: string;
  recipient_id?: string;
  amount: number;
  currency: RewardCurrency;
  payment_type: PaymentType;
  status: PaymentStatus;
  transaction_hash?: string;
  blockchain_network?: string;
  gas_fee?: number;
  platform_fee?: number;
  net_amount?: number;
  payment_method?: PaymentMethod;
  external_payment_id?: string;
  failure_reason?: string;
  processed_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

// Review and rating types
export interface TaskReview {
  id: string;
  task_id: string;
  reviewer_id: string;
  submission_id?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  review_text?: string;
  is_helpful: boolean;
  created_at: string;
}

// Dispute types
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';

export interface Dispute {
  id: string;
  submission_id: string;
  task_id: string;
  disputant_id: string;
  reason: string;
  description: string;
  evidence_urls?: string[];
  status: DisputeStatus;
  resolution?: string;
  resolver_id?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    limit: number;
    offset: number;
    count: number;
    has_more: boolean;
    total?: number;
  };
}

export interface TasksResponse extends ApiResponse {
  tasks: Task[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
    has_more: boolean;
  };
}

// Form data types for creating/updating entities
export interface CreateTaskData {
  title: string;
  description: string;
  instructions: string;
  task_type: TaskType;
  category_id?: string;
  difficulty_level: TaskDifficulty;
  estimated_time_minutes: number;
  reward_amount: number;
  reward_currency?: RewardCurrency;
  max_submissions?: number;
  requires_verification?: boolean;
  verification_criteria?: Record<string, any>;
  expires_at?: string;
}

export interface SubmissionData {
  submission_data: Record<string, any>;
  time_spent_minutes?: number;
  attachments_urls?: string[];
}

// UI state types
export interface LoadingState {
  [key: string]: boolean;
}

export interface ErrorState {
  [key: string]: string | null;
}

// World ID verification types
export interface WorldIdVerification {
  nullifier_hash: string;
  merkle_root: string;
  proof: string;
  verification_level: 'orb' | 'device';
}

// MiniKit specific types
export interface MiniKitUser {
  username?: string;
  profilePictureUrl?: string;
  walletAddress?: string;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Task-specific submission data types
export interface RLHFRatingData {
  response_a: string;
  response_b: string;
  chosen_response: 'a' | 'b';
  rating_reasons?: string[];
  confidence_score?: number;
  additional_comments?: string;
}

export interface VoiceRecordingData {
  audio_url: string;
  duration_seconds: number;
  transcript?: string;
  audio_quality_score?: number;
  background_noise_level?: 'low' | 'medium' | 'high';
}

export interface DataAnnotationData {
  annotations: Array<{
    id: string;
    type: 'bounding_box' | 'polygon' | 'point' | 'classification';
    coordinates?: number[];
    label: string;
    confidence?: number;
    metadata?: Record<string, any>;
  }>;
  image_url?: string;
  text_content?: string;
}

// Filter and sorting types
export interface TaskFilters {
  category?: string;
  task_type?: TaskType;
  difficulty_level?: TaskDifficulty;
  reward_min?: number;
  reward_max?: number;
  status?: TaskStatus;
  expires_within_hours?: number;
}

export interface TaskSortOptions {
  field: 'created_at' | 'reward_amount' | 'difficulty_level' | 'expires_at' | 'priority';
  direction: 'asc' | 'desc';
}

// Dashboard data types
export interface UserStats {
  total_earned: number;
  tasks_completed: number;
  success_rate: number;
  average_rating: number;
  current_streak: number;
  badges_earned: string[];
}

export interface EarningsData {
  daily: Array<{ date: string; amount: number }>;
  weekly: Array<{ week: string; amount: number }>;
  monthly: Array<{ month: string; amount: number }>;
  by_task_type: Array<{ task_type: TaskType; amount: number; count: number }>;
}