-- WorldHuman Studio Database Schema
-- This schema supports sybil resistance using World ID nullifier hashes

-- Users table - stores verified humans with World ID
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id TEXT NOT NULL UNIQUE, -- World ID identifier
    nullifier_hash TEXT NOT NULL UNIQUE, -- For sybil resistance
    verification_level TEXT NOT NULL DEFAULT 'orb', -- 'orb' or 'device'
    wallet_address TEXT UNIQUE,
    username TEXT UNIQUE,
    profile_image_url TEXT,
    bio TEXT,
    reputation_score INTEGER DEFAULT 0,
    total_earned DECIMAL(18, 8) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT users_reputation_score_check CHECK (reputation_score >= 0),
    CONSTRAINT users_total_earned_check CHECK (total_earned >= 0),
    CONSTRAINT users_verification_level_check CHECK (verification_level IN ('orb', 'device'))
);

-- Task categories for organization
CREATE TABLE IF NOT EXISTS task_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table - individual human intelligence tasks
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES task_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    instructions TEXT NOT NULL,
    task_type TEXT NOT NULL DEFAULT 'data_entry', -- 'data_entry', 'content_review', 'transcription', 'translation', etc.
    difficulty_level INTEGER NOT NULL DEFAULT 1, -- 1-5 scale
    estimated_time_minutes INTEGER,
    reward_amount DECIMAL(18, 8) NOT NULL,
    reward_currency TEXT NOT NULL DEFAULT 'WLD',
    max_submissions INTEGER DEFAULT 1,
    requires_verification BOOLEAN DEFAULT true,
    verification_criteria JSONB,
    attachment_urls TEXT[],
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed', 'cancelled'
    priority INTEGER DEFAULT 3, -- 1-5, higher is more priority
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT tasks_difficulty_level_check CHECK (difficulty_level BETWEEN 1 AND 5),
    CONSTRAINT tasks_priority_check CHECK (priority BETWEEN 1 AND 5),
    CONSTRAINT tasks_reward_amount_check CHECK (reward_amount > 0),
    CONSTRAINT tasks_max_submissions_check CHECK (max_submissions > 0),
    CONSTRAINT tasks_estimated_time_check CHECK (estimated_time_minutes > 0),
    CONSTRAINT tasks_status_check CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    CONSTRAINT tasks_reward_currency_check CHECK (reward_currency IN ('WLD', 'ETH', 'USDC'))
);

-- Task submissions from users
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submitter_nullifier TEXT NOT NULL, -- Additional sybil check
    submission_data JSONB NOT NULL,
    attachments_urls TEXT[],
    time_spent_minutes INTEGER,
    quality_score DECIMAL(3, 2), -- 0.00 to 5.00
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'under_review'
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    review_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    is_paid BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT submissions_quality_score_check CHECK (quality_score BETWEEN 0 AND 5),
    CONSTRAINT submissions_time_spent_check CHECK (time_spent_minutes > 0),
    CONSTRAINT submissions_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),

    -- Prevent duplicate submissions from same user/nullifier
    CONSTRAINT unique_user_task_submission UNIQUE (task_id, user_id),
    CONSTRAINT unique_nullifier_task_submission UNIQUE (task_id, submitter_nullifier)
);

-- Payment transactions and escrow
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
    payer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(18, 8) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'WLD',
    payment_type TEXT NOT NULL DEFAULT 'task_reward', -- 'task_reward', 'escrow_deposit', 'escrow_release', 'refund'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
    transaction_hash TEXT UNIQUE,
    blockchain_network TEXT DEFAULT 'optimism',
    gas_fee DECIMAL(18, 8),
    platform_fee DECIMAL(18, 8),
    net_amount DECIMAL(18, 8),
    payment_method TEXT, -- 'world_pay', 'crypto_wallet', 'fiat'
    external_payment_id TEXT,
    failure_reason TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT payments_amount_check CHECK (amount > 0),
    CONSTRAINT payments_currency_check CHECK (currency IN ('WLD', 'ETH', 'USDC')),
    CONSTRAINT payments_type_check CHECK (payment_type IN ('task_reward', 'escrow_deposit', 'escrow_release', 'refund')),
    CONSTRAINT payments_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);

-- User sessions for authentication (complementing Vercel KV)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    nullifier_hash TEXT NOT NULL, -- Session tied to specific nullifier
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Index for performance
    CONSTRAINT user_sessions_expires_check CHECK (expires_at > created_at)
);

-- Task reviews and ratings
CREATE TABLE IF NOT EXISTS task_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    is_helpful BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Prevent duplicate reviews
    CONSTRAINT unique_reviewer_task UNIQUE (task_id, reviewer_id)
);

-- Disputes for task submissions
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    disputant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- User raising dispute
    reason TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT[],
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'under_review', 'resolved', 'dismissed'
    resolution TEXT,
    resolver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT disputes_status_check CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed'))
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_nullifier_hash ON users(nullifier_hash);
CREATE INDEX IF NOT EXISTS idx_users_world_id ON users(world_id);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active, created_at);

CREATE INDEX IF NOT EXISTS idx_tasks_creator_id ON tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks(status, expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_tasks_reward ON tasks(reward_amount DESC, created_at);

CREATE INDEX IF NOT EXISTS idx_submissions_task_id ON submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_nullifier ON submissions(submitter_nullifier);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_pending ON submissions(task_id, status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_payments_task_id ON payments(task_id);
CREATE INDEX IF NOT EXISTS idx_payments_recipient_id ON payments(recipient_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_hash ON payments(transaction_hash);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_nullifier ON user_sessions(nullifier_hash);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default task categories
INSERT INTO task_categories (name, description, icon) VALUES
    ('Data Entry', 'Simple data input and transcription tasks', '📝'),
    ('Content Review', 'Review and moderate user-generated content', '👀'),
    ('Translation', 'Translate text between different languages', '🌐'),
    ('Transcription', 'Convert audio/video to text format', '🎤'),
    ('Image Tagging', 'Label and categorize images', '🏷️'),
    ('Quality Assurance', 'Test and verify digital products', '✅'),
    ('Research', 'Gather and verify information online', '🔍'),
    ('Creative Tasks', 'Design, writing, and creative projects', '🎨')
ON CONFLICT (name) DO NOTHING;