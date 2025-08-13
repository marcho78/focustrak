// Core types for the Focus App

export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  settings: UserSettings;
  timezone: string;
}

export interface UserSettings {
  defaultSessionDuration?: number; // in seconds, default 1500 (25 min)
  soundEnabled?: boolean;
  notificationsEnabled?: boolean;
  theme?: 'light' | 'dark' | 'system';
  breakDuration?: number; // in seconds, default 300 (5 min)
  longBreakDuration?: number; // in seconds, default 900 (15 min)
  autoStartBreaks?: boolean;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
  estimatedSessions: number;
  totalTimeSpent?: number; // in seconds, cumulative across all sessions
  steps: TaskStep[];
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'paused';
export type TaskPriority = 1 | 2 | 3; // 1=low, 2=medium, 3=high

export interface TaskStep {
  id: string;
  taskId: string;
  content: string;
  done: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  taskId?: string;
  task?: Task;
  startedAt: string;
  endedAt?: string;
  plannedDuration: number; // in seconds
  actualDuration?: number; // in seconds
  status: SessionStatus;
  notes?: string;
  completedSteps: number;
  totalSteps: number;
  distractions: Distraction[];
}

export type SessionStatus = 'active' | 'completed' | 'skipped' | 'paused';

export interface Distraction {
  id: string;
  userId: string;
  sessionId: string;
  content: string;
  createdAt: string;
  handled: boolean;
}

export interface Streak {
  id: string;
  userId: string;
  date: string;
  startedSessions: number;
  completedSessions: number;
  totalFocusTime: number; // in seconds
  createdAt: string;
}

export interface ImplementationIntention {
  id: string;
  userId: string;
  triggerText: string; // "If I get distracted"
  actionText: string; // "then I will close tab"
  active: boolean;
  createdAt: string;
}

// UI-specific types
export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  timeRemaining: number; // in seconds
  totalTime: number; // in seconds
  currentSession?: Session;
}

export interface AppState {
  user: User | null;
  currentTask: Task | null;
  timer: TimerState;
  streak: number;
  todaysSessions: Session[];
  isLoading: boolean;
  error: string | null;
}

// AI-related types
export interface AITaskBreakdownRequest {
  title: string;
  description?: string;
  context?: string;
}

export interface AITaskBreakdownResponse {
  steps: string[];
  estimatedDuration: number; // in minutes
  tips?: string[];
}

export interface AIRescueRequest {
  taskTitle: string;
  currentStep?: string;
  stuckReason?: string;
}

export interface AIRescueResponse {
  suggestions: {
    title: string;
    action: string;
    duration: number; // in minutes
  }[];
  encouragement: string;
}

// API Response types
export interface APIResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface SessionSummary {
  session: Session;
  completedSteps: TaskStep[];
  distractions: Distraction[];
  nextAction?: string;
  achievements: string[];
}

// Hook types
export interface UseTimerOptions {
  duration: number;
  onComplete: () => void;
  onTick?: (remaining: number) => void;
  autoStart?: boolean;
}

export type SessionType = 'focus' | 'break';

export interface BreakTimerState {
  isActive: boolean;
  timeRemaining: number;
  totalTime: number;
  type: 'short' | 'long';
}

export interface UseTimerReturn {
  timeRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
}

// Component props
export interface StartButtonProps {
  task?: Task;
  onStart: (task?: Task) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export interface TimerDisplayProps {
  timeRemaining: number;
  totalTime: number;
  isRunning: boolean;
  isPaused: boolean;
}

export interface DistractionCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (distraction: string) => void;
  sessionId: string;
}

export interface TaskStepsProps {
  steps: TaskStep[];
  onToggleStep: (stepId: string) => void;
  readonly?: boolean;
}

export interface SessionSummaryProps {
  summary: SessionSummary;
  onStartNext?: () => void;
  onEditTask?: (task: Task) => void;
}
