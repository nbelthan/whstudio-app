-- Notifications system database tables
-- Run this migration to set up the notification system

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  action_url TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'sent',
  metadata JSONB,
  personalization_data JSONB,

  -- Tracking timestamps
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Notification type preferences
  task_available BOOLEAN DEFAULT true,
  task_assigned BOOLEAN DEFAULT true,
  task_completed BOOLEAN DEFAULT true,
  payment_received BOOLEAN DEFAULT true,
  submission_reviewed BOOLEAN DEFAULT true,
  high_paying_task BOOLEAN DEFAULT true,
  streak_milestone BOOLEAN DEFAULT true,
  reputation_updated BOOLEAN DEFAULT false,
  urgent_task BOOLEAN DEFAULT true,
  consensus_needed BOOLEAN DEFAULT true,
  weekly_summary BOOLEAN DEFAULT true,
  achievement_unlocked BOOLEAN DEFAULT true,

  -- Delivery preferences
  in_app_notifications BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT false,

  -- Frequency settings
  max_daily_notifications INTEGER DEFAULT 20,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone VARCHAR(50) DEFAULT 'UTC',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create notification templates table (for admin management)
CREATE TABLE IF NOT EXISTS notification_templates (
  id VARCHAR(50) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  title_template TEXT NOT NULL,
  message_template TEXT,
  action_url TEXT,
  emoji VARCHAR(10) NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, status) WHERE status IN ('sent', 'delivered');

-- Insert default notification templates
INSERT INTO notification_templates (id, type, title_template, message_template, action_url, emoji, priority, is_active) VALUES
('task_available', 'task_available', '🎯 ${username}, new task available!', 'A new ${task_type} task is waiting for you. Earn ${amount} ${currency}.', '/tasks/${task_id}', '🎯', 'medium', true),
('task_assigned', 'task_assigned', '✅ ${username}, task assigned to you!', 'You''ve been assigned: "${task_title}". Get started now!', '/tasks/${task_id}', '✅', 'high', true),
('task_completed', 'task_completed', '🎉 ${username}, task completed!', 'Great job! You''ve completed "${task_title}". Payment is being processed.', '/submissions', '🎉', 'medium', true),
('payment_received', 'payment_received', '💰 ${username}, payment received!', 'You''ve earned ${amount} ${currency} for completing "${task_title}"!', '/payments', '💰', 'high', true),
('submission_reviewed', 'submission_reviewed', '📋 ${username}, submission reviewed', 'Your submission for "${task_title}" has been ${status}.', '/submissions/${submission_id}', '📋', 'medium', true),
('high_paying_task', 'high_paying_task', '🔥 ${username}, high-paying task available!', 'Premium task alert! Earn ${amount} ${currency} for ${task_type}. Limited spots!', '/tasks/${task_id}', '🔥', 'urgent', true),
('streak_milestone', 'streak_milestone', '⚡ ${username}, ${streak_count}-day streak!', 'Amazing! You''re on a ${streak_count}-day streak. Keep it up for bonus rewards!', '/dashboard', '⚡', 'medium', true),
('reputation_updated', 'reputation_updated', '⭐ ${username}, reputation updated!', 'Your reputation score is now ${reputation_score}. Great work!', '/dashboard', '⭐', 'low', true),
('urgent_task', 'urgent_task', '🚨 ${username}, urgent task needs attention!', 'Time-sensitive ${task_type} task expires soon. Earn ${amount} ${currency}!', '/tasks/${task_id}', '🚨', 'urgent', true),
('consensus_needed', 'consensus_needed', '🤝 ${username}, consensus review needed', 'Help review submissions for "${task_title}". Your expertise is needed!', '/tasks/${task_id}/consensus', '🤝', 'medium', true),
('weekly_summary', 'weekly_summary', '📊 ${username}, your weekly summary', 'This week: ${tasks_completed} tasks completed, ${amount} ${currency} earned!', '/dashboard', '📊', 'low', true),
('achievement_unlocked', 'achievement_unlocked', '🏆 ${username}, achievement unlocked!', 'Congratulations! You''ve unlocked "${achievement_name}". Keep up the great work!', '/achievements', '🏆', 'medium', true)
ON CONFLICT (id) DO UPDATE SET
  title_template = EXCLUDED.title_template,
  message_template = EXCLUDED.message_template,
  action_url = EXCLUDED.action_url,
  emoji = EXCLUDED.emoji,
  priority = EXCLUDED.priority,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating updated_at
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create default preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create notification preferences
CREATE TRIGGER create_notification_preferences_for_new_user
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- Create function to clean up expired notifications (can be called via cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE expires_at IS NOT NULL
    AND expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant appropriate permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO your_app_user;
-- GRANT SELECT ON notification_templates TO your_app_user;

COMMENT ON TABLE notifications IS 'Stores user notifications with tracking data';
COMMENT ON TABLE notification_preferences IS 'User-specific notification preferences and settings';
COMMENT ON TABLE notification_templates IS 'Admin-managed notification templates with personalization placeholders';
COMMENT ON FUNCTION cleanup_expired_notifications() IS 'Removes expired notifications - should be called periodically via cron job';