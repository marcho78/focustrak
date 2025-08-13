-- Add totalTimeSpent field to tasks table
-- This tracks the cumulative time spent on a task across all sessions

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS total_time_spent INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN tasks.total_time_spent IS 'Total time spent on task in seconds across all sessions';