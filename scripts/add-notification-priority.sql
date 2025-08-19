-- Migration script to add priority column to notifications table
-- Run this script if you have an existing notifications table without the priority column

-- Add priority column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'priority'
    ) THEN
        ALTER TABLE notifications ADD COLUMN priority VARCHAR(20) DEFAULT 'normal';
        
        -- Add check constraint for priority values
        ALTER TABLE notifications ADD CONSTRAINT notifications_priority_check 
        CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
    END IF;
END $$;

-- Update type constraint to include new notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('info', 'success', 'warning', 'error', 'schedule', 'time', 'leave', 'swap', 'broadcast', 'shift_assigned', 'shift_reminder'));

-- Update existing notifications to have normal priority
UPDATE notifications SET priority = 'normal' WHERE priority IS NULL;

-- Create index on priority column for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- Create index on type column for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_priority ON notifications(user_id, read, priority);

COMMENT ON TABLE notifications IS 'Stores user notifications with priority levels and various types';
COMMENT ON COLUMN notifications.priority IS 'Priority level: low, normal, high, urgent';
COMMENT ON COLUMN notifications.type IS 'Notification type: info, success, warning, error, schedule, time, leave, swap, broadcast, shift_assigned, shift_reminder';
