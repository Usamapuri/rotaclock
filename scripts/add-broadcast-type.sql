-- Add broadcast type to notifications table constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('info', 'success', 'warning', 'error', 'schedule', 'time', 'leave', 'swap', 'broadcast', 'shift_assigned', 'shift_reminder'));
