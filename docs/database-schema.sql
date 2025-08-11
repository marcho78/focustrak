-- Focus App Database Schema
-- Based on the MVP requirements for procrastination management

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settings JSONB DEFAULT '{}',
  timezone VARCHAR(50) DEFAULT 'UTC'
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, paused
  priority INTEGER DEFAULT 2, -- 1=low, 2=medium, 3=high
  due_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  estimated_sessions INTEGER DEFAULT 1
);

-- Task steps (AI-generated micro-steps)
CREATE TABLE task_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Focus sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  planned_duration INTEGER DEFAULT 1500, -- 25 minutes in seconds
  actual_duration INTEGER,
  status VARCHAR(20) DEFAULT 'active', -- active, completed, skipped, paused
  notes TEXT,
  completed_steps INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0
);

-- Distraction capture during sessions
CREATE TABLE distractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  handled BOOLEAN DEFAULT FALSE
);

-- Daily streaks tracking
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  started_sessions INTEGER DEFAULT 0,
  completed_sessions INTEGER DEFAULT 0,
  total_focus_time INTEGER DEFAULT 0, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Implementation intentions (behavior change feature)
CREATE TABLE implementation_intentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trigger_text TEXT NOT NULL, -- "If I get distracted"
  action_text TEXT NOT NULL, -- "then I will close tab"
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at);
CREATE INDEX idx_distractions_session_id ON distractions(session_id);
CREATE INDEX idx_streaks_user_date ON streaks(user_id, date);

-- Functions for streak calculation
CREATE OR REPLACE FUNCTION update_streak()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO streaks (user_id, date, started_sessions, completed_sessions, total_focus_time)
  VALUES (
    NEW.user_id,
    DATE(NEW.started_at),
    CASE WHEN NEW.status = 'active' THEN 1 ELSE 0 END,
    CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
    COALESCE(NEW.actual_duration, 0)
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    started_sessions = streaks.started_sessions + CASE WHEN NEW.status = 'active' THEN 1 ELSE 0 END,
    completed_sessions = streaks.completed_sessions + CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
    total_focus_time = streaks.total_focus_time + COALESCE(NEW.actual_duration, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update streaks
CREATE TRIGGER session_streak_trigger
  AFTER INSERT OR UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_streak();
