-- ============================================================================
-- WORLDHUMAN STUDIO: OPTIMAL RLHF DATABASE SCHEMA
-- ============================================================================
-- This schema is designed for scalable RLHF with efficient consensus tracking

-- ============================================================================
-- 1. STRUCTURED QUESTION STORAGE
-- ============================================================================

-- Separate table for question content (enables versioning and reuse)
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_type TEXT NOT NULL CHECK (question_type IN ('pairwise_ab', 'text_generation', 'voice_transcription', 'conversation_eval', 'ranking')),
    content JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    source_dataset TEXT, -- e.g., 'mt_bench', 'custom', 'generated'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient content queries
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_content ON questions USING GIN(content);
CREATE INDEX IF NOT EXISTS idx_questions_source ON questions(source_dataset);

-- ============================================================================
-- 2. ENHANCED TASKS TABLE
-- ============================================================================

-- Add question reference to tasks (replace instructions field)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES questions(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS consensus_threshold INTEGER DEFAULT 3;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS min_agreement_percentage NUMERIC(5,2) DEFAULT 70.00;

-- Convert existing instructions to JSONB for immediate improvement
ALTER TABLE tasks ALTER COLUMN instructions TYPE JSONB USING instructions::jsonb;

-- Index for task-question relationships
CREATE INDEX IF NOT EXISTS idx_tasks_question_id ON tasks(question_id);

-- ============================================================================
-- 3. STRUCTURED RESPONSE STORAGE
-- ============================================================================

-- Enhanced submissions table for structured responses
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS unique_user_task_submission;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS response_version INTEGER DEFAULT 1;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS response_type TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2);

-- Allow multiple submissions per user per task (for consensus)
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_task_version ON submissions(task_id, user_id, response_version);

-- ============================================================================
-- 4. CONSENSUS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS response_consensus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    consensus_data JSONB NOT NULL,
    agreement_percentage NUMERIC(5,2),
    total_responses INTEGER DEFAULT 0,
    consensus_reached BOOLEAN DEFAULT FALSE,
    final_answer JSONB,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for consensus queries
CREATE INDEX IF NOT EXISTS idx_consensus_task ON response_consensus(task_id);
CREATE INDEX IF NOT EXISTS idx_consensus_reached ON response_consensus(consensus_reached, agreement_percentage);

-- ============================================================================
-- 5. RESPONSE QUALITY & REPUTATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS response_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

    -- Quality metrics
    accuracy_score NUMERIC(3,2), -- How accurate vs gold standard
    consensus_alignment NUMERIC(3,2), -- How well aligns with consensus
    response_time_seconds INTEGER,
    explanation_quality NUMERIC(3,2), -- If explanation provided

    -- Reputation impact
    reputation_change INTEGER DEFAULT 0,
    is_outlier BOOLEAN DEFAULT FALSE,
    flagged_for_review BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for quality tracking
CREATE INDEX IF NOT EXISTS idx_quality_user ON response_quality_metrics(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quality_task ON response_quality_metrics(task_id);
CREATE INDEX IF NOT EXISTS idx_quality_outliers ON response_quality_metrics(is_outlier, flagged_for_review);

-- ============================================================================
-- 6. USER REPUTATION TRACKING
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 100;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_completed_tasks INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS average_quality_score NUMERIC(3,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS consensus_agreement_rate NUMERIC(5,2);

-- ============================================================================
-- 7. OPTIMIZED VIEWS FOR FRONTEND
-- ============================================================================

-- View for task dashboard with all needed data
CREATE OR REPLACE VIEW task_dashboard AS
SELECT
    t.id,
    t.title,
    t.description,
    t.task_type,
    t.reward_amount,
    t.reward_currency,
    t.status,
    t.created_at,
    t.expires_at,
    tc.name as category_name,
    q.question_type,
    q.content as question_content,
    q.source_dataset,
    COALESCE(rc.total_responses, 0) as response_count,
    COALESCE(rc.consensus_reached, false) as consensus_reached,
    COALESCE(rc.agreement_percentage, 0) as agreement_percentage,
    t.consensus_threshold,
    t.max_submissions
FROM tasks t
LEFT JOIN task_categories tc ON t.category_id = tc.id
LEFT JOIN questions q ON t.question_id = q.id
LEFT JOIN response_consensus rc ON t.id = rc.task_id
WHERE t.status = 'active';

-- View for user submissions with quality metrics
CREATE OR REPLACE VIEW user_submissions_detailed AS
SELECT
    s.id,
    s.task_id,
    s.user_id,
    s.submission_data,
    s.response_type,
    s.confidence_score,
    s.status,
    s.created_at,
    t.title as task_title,
    q.question_type,
    rqm.accuracy_score,
    rqm.consensus_alignment,
    rqm.response_time_seconds,
    rqm.reputation_change
FROM submissions s
JOIN tasks t ON s.task_id = t.id
LEFT JOIN questions q ON t.question_id = q.id
LEFT JOIN response_quality_metrics rqm ON s.id = rqm.submission_id;

-- ============================================================================
-- 8. FUNCTIONS FOR CONSENSUS CALCULATION
-- ============================================================================

-- Function to calculate consensus for pairwise_ab tasks
CREATE OR REPLACE FUNCTION calculate_pairwise_consensus(task_uuid UUID)
RETURNS TABLE(consensus_choice TEXT, agreement_pct NUMERIC, total_count INTEGER) AS $$
DECLARE
    choice_a_count INTEGER;
    choice_b_count INTEGER;
    total_submissions INTEGER;
    winner_choice TEXT;
    agreement_percentage NUMERIC;
BEGIN
    -- Count A and B choices
    SELECT
        COUNT(*) FILTER (WHERE submission_data->>'chosen_response' = 'A'),
        COUNT(*) FILTER (WHERE submission_data->>'chosen_response' = 'B'),
        COUNT(*)
    INTO choice_a_count, choice_b_count, total_submissions
    FROM submissions
    WHERE task_id = task_uuid AND status = 'approved';

    -- Determine winner and agreement percentage
    IF choice_a_count > choice_b_count THEN
        winner_choice := 'A';
        agreement_percentage := (choice_a_count::NUMERIC / total_submissions) * 100;
    ELSE
        winner_choice := 'B';
        agreement_percentage := (choice_b_count::NUMERIC / total_submissions) * 100;
    END IF;

    RETURN QUERY SELECT winner_choice, agreement_percentage, total_submissions;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. MIGRATION SCRIPT FOR EXISTING DATA
-- ============================================================================

-- Migrate existing MT-Bench tasks to new structure
DO $$
DECLARE
    task_record RECORD;
    question_uuid UUID;
    instructions_json JSONB;
BEGIN
    FOR task_record IN
        SELECT id, instructions, task_type
        FROM tasks
        WHERE title LIKE 'A/B Preference – MTBench%'
    LOOP
        -- Parse existing instructions
        instructions_json := task_record.instructions::jsonb;

        -- Create question record
        INSERT INTO questions (question_type, content, source_dataset)
        VALUES (
            'pairwise_ab',
            jsonb_build_object(
                'prompt', instructions_json->>'prompt',
                'optionA', instructions_json->>'optionA',
                'optionB', instructions_json->>'optionB',
                'gold_standard', instructions_json->>'gold'
            ),
            'mt_bench'
        ) RETURNING id INTO question_uuid;

        -- Update task to reference question
        UPDATE tasks
        SET question_id = question_uuid
        WHERE id = task_record.id;
    END LOOP;
END $$;

-- ============================================================================
-- 10. PERFORMANCE INDEXES
-- ============================================================================

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_submissions_task_status_user ON submissions(task_id, status, user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_created ON submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_active_reward ON tasks(status, reward_amount DESC) WHERE status = 'active';

-- JSONB indexes for submission data queries
CREATE INDEX IF NOT EXISTS idx_submissions_chosen_response ON submissions USING GIN((submission_data->>'chosen_response'));
CREATE INDEX IF NOT EXISTS idx_submissions_confidence ON submissions((submission_data->>'confidence')::NUMERIC);

-- ============================================================================
-- 11. TRIGGERS FOR AUTOMATIC CONSENSUS UPDATES
-- ============================================================================

-- Trigger to update consensus when new submission is approved
CREATE OR REPLACE FUNCTION update_consensus_on_submission()
RETURNS TRIGGER AS $$
DECLARE
    consensus_result RECORD;
    task_threshold INTEGER;
BEGIN
    -- Only process approved submissions
    IF NEW.status = 'approved' THEN
        -- Get task consensus threshold
        SELECT consensus_threshold INTO task_threshold
        FROM tasks WHERE id = NEW.task_id;

        -- Calculate current consensus
        SELECT * INTO consensus_result
        FROM calculate_pairwise_consensus(NEW.task_id);

        -- Update or insert consensus record
        INSERT INTO response_consensus (
            task_id,
            question_id,
            consensus_data,
            agreement_percentage,
            total_responses,
            consensus_reached,
            final_answer
        )
        VALUES (
            NEW.task_id,
            (SELECT question_id FROM tasks WHERE id = NEW.task_id),
            jsonb_build_object('method', 'majority_vote', 'choice_counts', jsonb_build_object('A', 0, 'B', 0)),
            consensus_result.agreement_pct,
            consensus_result.total_count,
            consensus_result.total_count >= task_threshold AND consensus_result.agreement_pct >= 70,
            jsonb_build_object('chosen_response', consensus_result.consensus_choice)
        )
        ON CONFLICT (task_id) DO UPDATE SET
            agreement_percentage = consensus_result.agreement_pct,
            total_responses = consensus_result.total_count,
            consensus_reached = consensus_result.total_count >= task_threshold AND consensus_result.agreement_pct >= 70,
            final_answer = jsonb_build_object('chosen_response', consensus_result.consensus_choice),
            updated_at = CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_consensus ON submissions;
CREATE TRIGGER trigger_update_consensus
    AFTER INSERT OR UPDATE ON submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_consensus_on_submission();

-- ============================================================================
-- 12. EXAMPLE QUERIES FOR FRONTEND
-- ============================================================================

/*
-- Get all active tasks with consensus status
SELECT * FROM task_dashboard WHERE status = 'active' ORDER BY created_at DESC;

-- Get user's submission history with quality scores
SELECT * FROM user_submissions_detailed
WHERE user_id = $1
ORDER BY created_at DESC;

-- Get tasks needing more responses for consensus
SELECT * FROM task_dashboard
WHERE consensus_reached = false
AND response_count < max_submissions
ORDER BY (consensus_threshold - response_count) ASC;

-- Get consensus results for completed tasks
SELECT t.title, rc.final_answer, rc.agreement_percentage, rc.total_responses
FROM response_consensus rc
JOIN tasks t ON rc.task_id = t.id
WHERE rc.consensus_reached = true;
*/