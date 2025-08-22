'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useUser } from '@/hooks/useAuth';
import Link from 'next/link';
import { Task, Session, Distraction, TaskStep, BreakTimerState } from '@/types';
import TaskCreationForm from '@/components/TaskCreationForm';
import TimerDisplay from '@/components/TimerDisplay';
import DistractionCapture from '@/components/DistractionCapture';
import TaskSteps from '@/components/TaskSteps';
import StopReasonModal from '@/components/StopReasonModal';
import SessionCompleteModal from '@/components/SessionCompleteModal';
import TaskManager from '@/components/TaskManager';
import SettingsModal from '@/components/SettingsModal';
import BreakTimer from '@/components/BreakTimer';
import BreakCompleteModal from '@/components/BreakCompleteModal';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTimer } from '@/hooks/useTimer';
import { useSettings } from '@/hooks/useSettings';
import { notificationService } from '@/lib/notifications';
import { 
  PauseIcon, 
  PlayIcon, 
  StopIcon, 
  ExclamationTriangleIcon,
  FireIcon,
  TrophyIcon,
  Cog6ToothIcon 
} from '@heroicons/react/24/solid';

// AI function for generating task steps
function generateTaskSteps(title: string): string[] {
  const commonSteps = {
    'write': ['Open document', 'Write outline', 'Write first draft'],
    'read': ['Find materials', 'Set up reading space', 'Start reading'],
    'code': ['Set up development environment', 'Create basic structure', 'Implement first feature'],
    'study': ['Gather materials', 'Create study space', 'Review first topic'],
    'email': ['Open email client', 'Sort by priority', 'Reply to first email'],
    'design': ['Open design tool', 'Create new project', 'Start with wireframe'],
  };
  
  const titleLower = title.toLowerCase();
  for (const [key, steps] of Object.entries(commonSteps)) {
    if (titleLower.includes(key)) {
      return steps;
    }
  }
  
  // Default generic steps
  return [
    'Set up workspace and materials',
    'Start with the smallest first step',
    'Make initial progress'
  ];
}

// API helper functions
async function createTask(title: string, description?: string, taskSteps?: TaskStep[]): Promise<Task> {
  // Use provided steps or generate default ones
  const steps = taskSteps ? taskSteps.map(step => step.content) : generateTaskSteps(title);
  
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, steps })
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to create task');
  }
  
  return result.data;
}

async function createSession(taskId?: string): Promise<Session> {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId })
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to create session');
  }
  
  return result.data;
}

async function updateSession(sessionId: string, updates: Record<string, unknown>): Promise<Session> {
  const response = await fetch(`/api/sessions/${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to update session');
  }
  
  return result.data;
}

async function captureDistraction(sessionId: string, content: string): Promise<void> {
  const response = await fetch('/api/distractions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, content })
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to capture distraction');
  }
}

async function getStreak(): Promise<{ streak: number; today: Record<string, unknown> }> {
  const response = await fetch('/api/streak');
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to get streak');
  }
  
  return result.data;
}

// API helper for toggling steps
async function toggleTaskStep(taskId: string, stepId: string): Promise<void> {
  const response = await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to toggle step');
  }
}

// Helper function to format task time in hours and minutes
function formatTaskTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else if (seconds > 0) {
    return 'Less than 1m';
  } else {
    return '0m';
  }
}

export default function Home() {
  const { user, error, isLoading } = useUser();
  const [isClient, setIsClient] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [userSynced, setUserSynced] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isDistractionCaptureOpen, setIsDistractionCaptureOpen] = useState(false);
  const [distractions, setDistractions] = useState<Distraction[]>([]);
  const [streak, setStreak] = useState(3); // Mock streak
  const [isStarting, setIsStarting] = useState(false);
  const [isStopReasonModalOpen, setIsStopReasonModalOpen] = useState(false);
  const [isSessionCompleteModalOpen, setIsSessionCompleteModalOpen] = useState(false);
  const [isTaskHistoryOpen, setIsTaskHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [taskManagerRefresh, setTaskManagerRefresh] = useState(0);
  const [completedSessionData, setCompletedSessionData] = useState<{
    duration: number;
    taskTitle?: string;
    completedSteps: number;
    totalSteps: number;
    streak: number;
    isTaskComplete?: boolean;
    task?: Task | null;
  } | null>(null);
  
  // Break timer state
  const [breakTimer, setBreakTimer] = useState<BreakTimerState>({
    isActive: false,
    timeRemaining: 0,
    totalTime: 0,
    type: 'short'
  });
  const [isBreakCompleteModalOpen, setIsBreakCompleteModalOpen] = useState(false);
  const [completedBreakData, setCompletedBreakData] = useState<{
    breakType: 'short' | 'long';
    duration: number;
    taskToResume?: Task | null;
  } | null>(null);
  
  
  // Fix hydration mismatch by ensuring client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);
  

  // Sync user with database when they log in
  useEffect(() => {
    if (user && !userSynced) {
      fetch('/api/auth/sync-user')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUserSynced(true);
            console.log('User synced successfully:', data.data);
          }
        })
        .catch(err => {
          console.error('Failed to sync user:', err);
        });
    }
  }, [user, userSynced]);
  
  // Load settings
  const { settings, saveSettings, isLoaded } = useSettings();
  
  // Check for orphaned active sessions on app startup and clean them up
  useEffect(() => {
    if (user && userSynced && settings && settings.defaultSessionDuration) {
      const cleanupOrphanedSessions = async () => {
        try {
          const response = await fetch('/api/sessions/cleanup-orphaned', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          const result = await response.json();
          if (result.success && result.data.cleanedUp > 0) {
            console.log(`🧹 Cleaned up ${result.data.cleanedUp} orphaned sessions`);
          }
        } catch (error) {
          console.warn('Failed to cleanup orphaned sessions:', error);
        }
      };
      
      cleanupOrphanedSessions();
    }
  }, [user, userSynced, settings]);

  // Use refs to store current values for stable callback
  const currentSessionRef = useRef<Session | null>(null);
  const currentTaskRef = useRef<Task | null>(null);
  const setDistractionsRef = useRef(setDistractions);
  const setCurrentSessionRef = useRef(setCurrentSession);
  const setCurrentTaskRef = useRef(setCurrentTask);
  const setStreakRef = useRef(setStreak);
  
  // Keep task ref in sync with state
  useEffect(() => {
    currentTaskRef.current = currentTask;
  }, [currentTask]);

  // Update refs when state changes
  useEffect(() => {
    currentSessionRef.current = currentSession;
  }, [currentSession]);

  useEffect(() => {
    currentTaskRef.current = currentTask;
  }, [currentTask]);

  useEffect(() => {
    setDistractionsRef.current = setDistractions;
    setCurrentSessionRef.current = setCurrentSession;
    setCurrentTaskRef.current = setCurrentTask;
    setStreakRef.current = setStreak;
  }, []);

  // Custom break timer implementation
  const breakTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle break timer completion
  const handleBreakComplete = useCallback((isManualEnd = false) => {
    // Store the current task before any state updates
    const taskForResumption = currentTask;
    
    // Get current break timer state to avoid stale closures
    setBreakTimer(prev => {
      // Complete if break is active AND (timer reached zero OR manually ended)
      if (prev.isActive && (prev.timeRemaining === 0 || isManualEnd)) {
        // Calculate actual break duration (how long the break actually lasted)
        const actualDuration = prev.totalTime - prev.timeRemaining;
        
        // Store completed break data with the task we captured earlier
        setCompletedBreakData({
          breakType: prev.type,
          duration: actualDuration > 0 ? actualDuration : prev.totalTime,
          taskToResume: taskForResumption // Use the task we captured before state updates
        });
        
        // Show break completion modal
        setIsBreakCompleteModalOpen(true);
        
        // Send notification if enabled
        if (settings.notificationsEnabled) {
          notificationService.notifyBreakComplete();
        }
        
        // Clear the timer interval if it exists
        if (breakTimerIntervalRef.current) {
          clearInterval(breakTimerIntervalRef.current);
          breakTimerIntervalRef.current = null;
        }
        
        return { 
          ...prev, 
          isActive: false,
          timeRemaining: 0 
        };
      } else {
        return prev;
      }
    });
  }, [currentTask, settings.notificationsEnabled]);
  
  // Start break timer
  const startBreakTimer = useCallback(() => {
    if (breakTimerIntervalRef.current) {
      clearInterval(breakTimerIntervalRef.current);
    }
    
    setBreakTimer(currentState => {
      console.log(`🚀 Starting custom break timer with ${currentState.timeRemaining} seconds`);
      return currentState;
    });
    
    breakTimerIntervalRef.current = setInterval(() => {
      setBreakTimer(prev => {
        const newTimeRemaining = Math.max(0, prev.timeRemaining - 1);
        
        if (newTimeRemaining === 0) {
          console.log('🎉 Break timer completed!');
          if (breakTimerIntervalRef.current) {
            clearInterval(breakTimerIntervalRef.current);
            breakTimerIntervalRef.current = null;
          }
          // Call completion handler
          setTimeout(() => handleBreakComplete(), 100);
        }
        
        return {
          ...prev,
          timeRemaining: newTimeRemaining
        };
      });
    }, 1000);
  }, [handleBreakComplete]);
  
  // Pause break timer
  const pauseBreakTimer = useCallback(() => {
    if (breakTimerIntervalRef.current) {
      clearInterval(breakTimerIntervalRef.current);
      breakTimerIntervalRef.current = null;
    }
  }, []);
  
  // Create fake break timer hook interface for compatibility
  const breakTimerHook = {
    isRunning: breakTimerIntervalRef.current !== null,
    isPaused: breakTimer.isActive && breakTimerIntervalRef.current === null,
    timeRemaining: breakTimer.timeRemaining,
    start: startBreakTimer,
    pause: pauseBreakTimer,
    reset: () => {
      if (breakTimerIntervalRef.current) {
        clearInterval(breakTimerIntervalRef.current);
        breakTimerIntervalRef.current = null;
      }
    }
  };
  
  // Break timer handlers
  const handleTakeBreak = useCallback((breakType: 'short' | 'long') => {
    console.log(`🌱 Starting ${breakType} break timer`);
    console.log('📋 Current settings:', settings);
    console.log('🔍 State before break starts:', {
      currentTask: currentTask ? { id: currentTask.id, title: currentTask.title } : null,
      hasCurrentTask: !!currentTask,
      completedSessionData: completedSessionData ? {
        taskTitle: completedSessionData.taskTitle,
        hasTask: !!completedSessionData.task,
        taskForResumption: completedSessionData.task ? {
          id: completedSessionData.task.id,
          title: completedSessionData.task.title
        } : null
      } : null
    });
    
    // Determine break duration based on settings and type
    const breakDuration = breakType === 'short' 
      ? (settings.breakDuration || 300) // 5 minutes default
      : (settings.longBreakDuration || 900); // 15 minutes default
    
    console.log(`⏱️ Break duration calculated: ${breakDuration} seconds (${Math.floor(breakDuration/60)}m ${breakDuration%60}s)`);
    console.log(`🔧 Settings breakDuration: ${settings.breakDuration}, longBreakDuration: ${settings.longBreakDuration}`);
    
    // Store the current task before starting break
    const taskToResume = completedSessionData?.task;
    console.log('📤 Task to resume after break:', {
      hasTaskToResume: !!taskToResume,
      taskDetails: taskToResume ? {
        id: taskToResume.id,
        title: taskToResume.title,
        steps: taskToResume.steps?.length
      } : null
    });
    
    // Close session complete modal
    setIsSessionCompleteModalOpen(false);
    setCompletedSessionData(null);
    
    // Set up break timer state
    setBreakTimer({
      isActive: true,
      timeRemaining: breakDuration,
      totalTime: breakDuration,
      type: breakType
    });
    
    // Store task for resumption after break
    if (taskToResume) {
      console.log('📥 Setting current task for resumption:', taskToResume.title);
      setCurrentTask(taskToResume);
    } else {
      console.log('⚠️ No task available for resumption - keeping current task as is');
    }
    
    // Send notification if enabled
    if (settings.notificationsEnabled) {
      notificationService.notifyBreakStart(breakDuration);
    }
    
    // Reset the break timer hook with new duration
    // Use setTimeout to ensure state update completes first
    setTimeout(() => {
      console.log('🔄 Resetting break timer hook');
      console.log(`🎯 Break timer hook will reset to duration: ${breakDuration}`);
      console.log(`🔧 Auto-start breaks setting: ${settings.autoStartBreaks}`);
      breakTimerHook.reset();
      
      // Only start automatically if auto-start is enabled
      if (settings.autoStartBreaks) {
        console.log('✅ Auto-starting break timer');
        breakTimerHook.start();
        console.log(`✅ Break timer hook started with timeRemaining: ${breakTimerHook.timeRemaining}`);
      } else {
        console.log('⏸️ Auto-start disabled - break timer ready but not started');
      }
      
      // Log final state after break setup
      setTimeout(() => {
        console.log('🏁 Break setup completed. Final state:');
        console.log('📊 Current task after break setup:', currentTask ? { id: currentTask.id, title: currentTask.title } : null);
      }, 100);
    }, 150);
  }, [settings.breakDuration, settings.longBreakDuration, settings.autoStartBreaks, settings.notificationsEnabled, breakTimerHook, completedSessionData, currentTask]);
  
  // Stable callback function
  const handleSessionComplete = useCallback(async () => {
    console.log('🔥 handleSessionComplete called!', { currentSession: currentSessionRef.current });
    const session = currentSessionRef.current;
    if (session) {
      try {
        console.log('Attempting to update session:', session.id);
        // Calculate actual duration from the configured session duration
        const sessionDuration = settings.defaultSessionDuration || 1500;
        const actualDuration = sessionDuration; // Full session completed
        
        // Update session as completed in database
        await updateSession(session.id, {
          status: 'completed',
          endedAt: new Date().toISOString(),
          actualDuration: actualDuration
        });
        
        console.log('Session completed successfully!', session);
        
        // Update task with time spent and check if it should be marked as completed
        const currentTask = currentTaskRef.current;
        if (currentTask) {
          const allStepsComplete = currentTask.steps && currentTask.steps.length > 0 && 
                                   currentTask.steps.every(step => step.done);
          
          try {
            // Update task with accumulated time (and status if complete)
            const response = await fetch(`/api/tasks/${currentTask.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: allStepsComplete ? 'completed' : currentTask.status,
                completedAt: allStepsComplete ? new Date().toISOString() : undefined,
                addTimeSpent: actualDuration // Add the session duration to total time
              })
            });
            
            const result = await response.json();
            if (result.success && result.data) {
              // Update local task with new total time
              const updatedTask = { ...currentTask, totalTimeSpent: result.data.total_time_spent };
              setCurrentTask(updatedTask);
              currentTaskRef.current = updatedTask;
            } else {
              console.warn('Failed to update task:', result.error);
            }
          } catch (error) {
            console.warn('Failed to update task:', error);
          }
        }
        
        // Update streak
        let currentStreak = streak;
        try {
          const streakData = await getStreak();
          setStreakRef.current(streakData.streak);
          currentStreak = streakData.streak;
        } catch (error) {
          console.warn('Failed to update streak:', error);
        }
        
        // Prepare session completion data
        const task = currentTaskRef.current;
        const completedSteps = task?.steps?.filter(step => step.done).length || 0;
        const totalSteps = task?.steps?.length || 0;
        const isTaskFullyComplete = task && totalSteps > 0 && completedSteps === totalSteps;
        
        setCompletedSessionData({
          duration: actualDuration,
          taskTitle: task?.title,
          completedSteps,
          totalSteps,
          streak: currentStreak,
          isTaskComplete: isTaskFullyComplete || undefined,
          task: task // Always keep task for resumption after break
        });
        
        // Send notification if enabled
        if (settings.notificationsEnabled) {
          await notificationService.notifySessionComplete(
            task?.title || 'Untitled Task',
            completedSteps
          );
        }
        
        // Check if we should auto-start a break or show the completion modal
        if (isTaskFullyComplete) {
          // Task is complete - ALWAYS show the completion modal for celebration
          console.log('🎉 Task fully complete - showing completion modal');
          setIsSessionCompleteModalOpen(true);
        } else if (settings.autoStartBreaks) {
          // Task not complete and auto-break is on - start break automatically
          console.log('🔄 Auto-starting break after session completion');
          setTimeout(() => {
            handleTakeBreak('short');
          }, 500); // Small delay to ensure state updates complete
        } else {
          // Task not complete and auto-break is off - show modal for user to choose
          setIsSessionCompleteModalOpen(true);
        }
        
      } catch (error) {
        console.error('Failed to complete session:', error);
        
        // Still show success modal even if database save failed
        const task = currentTaskRef.current;
        const completedSteps = task?.steps?.filter(step => step.done).length || 0;
        const totalSteps = task?.steps?.length || 0;
        
        setCompletedSessionData({
          duration: settings.defaultSessionDuration || 1500,
          taskTitle: task?.title,
          completedSteps,
          totalSteps,
          streak
        });
        
        setIsSessionCompleteModalOpen(true);
      }
      
      // Reset session but keep task for potential break resumption
      setCurrentSessionRef.current(null);
      // Don't clear task ref here - we need it for break resumption
      // setCurrentTaskRef.current(null);  
      setDistractionsRef.current([]);
    } else {
      console.log('⚠️ handleSessionComplete called but no current session');
    }
  }, [settings.defaultSessionDuration, settings.autoStartBreaks, settings.notificationsEnabled, streak, handleTakeBreak]); // Include necessary dependencies

  // Create timer with the stable completion callback - wait for settings to load
  const timer = useTimer({
    duration: settings.defaultSessionDuration || 1500,
    onComplete: handleSessionComplete,
  });

  // Browser close/refresh detection and cleanup (after timer initialization)
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      // Only show warning and do cleanup if there's an active session that's actually running
      if (currentSession && timer.isRunning && !timer.isPaused) {
        try {
          // Calculate how much time was actually spent
          const timeSpent = (settings.defaultSessionDuration || 1500) - timer.timeRemaining;
          
          // Use navigator.sendBeacon for reliable cleanup during page unload
          const sessionData = {
            status: 'skipped',
            endedAt: new Date().toISOString(),
            actualDuration: timeSpent,
            notes: 'Session interrupted by browser close/refresh'
          };
          
          const blob = new Blob([JSON.stringify(sessionData)], { type: 'application/json' });
          navigator.sendBeacon(`/api/sessions/${currentSession.id}`, blob);
          
        } catch (error) {
          console.error('Failed to cleanup session on browser close:', error);
        }
        
        // Show warning message to user only when timer is actually running
        event.preventDefault();
        const message = 'Your focus session is still running. Closing will end the session.';
        event.returnValue = message;
        return message;
      }
      
      // If there's a paused session, do cleanup but don't show warning
      if (currentSession && timer.isPaused) {
        try {
          const timeSpent = (settings.defaultSessionDuration || 1500) - timer.timeRemaining;
          const sessionData = {
            status: 'skipped',
            endedAt: new Date().toISOString(),
            actualDuration: timeSpent,
            notes: 'Session interrupted by browser close/refresh'
          };
          
          const blob = new Blob([JSON.stringify(sessionData)], { type: 'application/json' });
          navigator.sendBeacon(`/api/sessions/${currentSession.id}`, blob);
        } catch (error) {
          console.error('Failed to cleanup session on browser close:', error);
        }
        // Don't prevent close for paused sessions
      }
    };
    
    // Add event listener
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentSession, timer.isRunning, timer.isPaused, timer.timeRemaining, settings.defaultSessionDuration]);

  const handleStart = async (task?: Task) => {
    console.log('🚀 Starting session with task:', task);
    setIsStarting(true);
    
    try {
      let currentTaskToUse = task;
      
      // Validate that we have a task to work with
      if (!task) {
        throw new Error('Cannot start focus session without a task. Please create a new task first.');
      }
      
      // Send notification if enabled
      if (settings.notificationsEnabled) {
        await notificationService.notifySessionStart(
          task.title,
          settings.defaultSessionDuration || 1500
        );
      }
      
      // If it's a temporary task, create it in the database
      if (task.id.startsWith('temp-')) {
        if (task.title) {
          console.log('Creating new task:', task.title, 'with steps:', task.steps);
          currentTaskToUse = await createTask(task.title, task.description, task.steps);
          console.log('Created task:', currentTaskToUse);
          // Trigger TaskManager refresh so new task shows up in the list
          console.log('🔄 Before incrementing taskManagerRefresh, current value:', taskManagerRefresh);
          setTaskManagerRefresh(prev => {
            console.log('🔄 Incrementing taskManagerRefresh from', prev, 'to', prev + 1);
            return prev + 1;
          });
        } else {
          throw new Error('Cannot create task without a title.');
        }
      }
      
      console.log('Setting current task to:', currentTaskToUse);
      setCurrentTask(currentTaskToUse || null);
      
      // Create session in database
      console.log('Creating session for task ID:', currentTaskToUse?.id);
      const session = await createSession(currentTaskToUse?.id);
      console.log('Created session:', session);
      setCurrentSession(session);
      
      // Start the timer
      console.log('Starting timer...');
      timer.start();
      console.log('Timer started. Current state:', { isRunning: timer.isRunning, timeRemaining: timer.timeRemaining });
      
      // Update streak info
      try {
        const streakData = await getStreak();
        setStreak(streakData.streak);
      } catch (error) {
        console.warn('Failed to update streak:', error);
      }
      
    } catch (error) {
      console.error('Failed to start session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start session. Please try again.';
      alert(errorMessage);
    } finally {
      setIsStarting(false);
    }
  };

  const handlePause = () => {
    if (timer.isRunning && !timer.isPaused) {
      timer.pause();
    } else if (timer.isPaused) {
      timer.start();
    }
  };

  const handleStopClick = () => {
    setIsStopReasonModalOpen(true);
  };

  const handleConfirmStop = async (reason?: string) => {
    if (currentSession) {
      try {
        // Update session as stopped in database
        await updateSession(currentSession.id, {
          status: 'skipped',
          endedAt: new Date().toISOString(),
          actualDuration: (settings.defaultSessionDuration || 1500) - timer.timeRemaining,
          notes: reason ? `Stopped early: ${reason}` : 'Stopped early'
        });
      } catch (error) {
        console.error('Failed to update stopped session:', error);
      }
    }
    
    // Stop timer and reset state
    timer.reset();
    setCurrentSession(null);
    setCurrentTask(null);
    setDistractions([]);
    setIsStopReasonModalOpen(false);
  };

  const handleSessionCompleteModalClose = () => {
    // Force browser refresh to reset everything
    window.location.reload();
  };

  const handleContinueTask = useCallback(() => {
    console.log('🔄 handleContinueTask called');
    const taskData = completedSessionData?.task;
    console.log('📋 Task data:', taskData);
    
    if (taskData) {
      // Reset step completion status to allow working on the task again
      const resetTask = {
        ...taskData,
        steps: taskData.steps.map(step => ({ ...step, done: false }))
      };
      
      console.log('✨ Reset task with steps:', resetTask.steps.map(s => ({ content: s.content, done: s.done })));
      
      // Close modal and clear session data first
      setIsSessionCompleteModalOpen(false);
      setCompletedSessionData(null);
      
      // Reset the timer and task state synchronously
      console.log('🔄 Resetting timer and setting task...');
      timer.reset();
      setCurrentTask(resetTask);
      
      // Use setTimeout to defer the handleStart call to avoid DOM corruption
      setTimeout(() => {
        console.log('🚀 Starting new session with reset task');
        handleStart(resetTask);
      }, 10);
    } else {
      console.log('❌ No task data available for continuation');
    }
  }, [completedSessionData, handleStart, timer]);

  const handleToggleStep = useCallback(async (stepId: string) => {
    if (!currentTask) return;
    
    try {
      // Update step in database
      await toggleTaskStep(currentTask.id, stepId);
      
      // Update local state immediately for better UX
      setCurrentTask(prev => {
        if (!prev) return prev;
        
        const updatedSteps = prev.steps.map(step => 
          step.id === stepId ? { ...step, done: !step.done } : step
        );
        
        return { ...prev, steps: updatedSteps };
      });
    } catch (error) {
      console.error('Failed to toggle step:', error);
      // Could add a toast notification here
    }
  }, [currentTask]);

  const handleAddStep = useCallback(async (content: string) => {
    if (!currentTask) return;
    
    try {
      const response = await fetch(`/api/tasks/${currentTask.id}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      
      const result = await response.json();
      if (result.success) {
        // Update local state immediately for better UX
        setCurrentTask(prev => {
          if (!prev) return prev;
          
          return { ...prev, steps: [...prev.steps, result.data] };
        });
      } else {
        console.error('Failed to add step:', result.error);
      }
    } catch (error) {
      console.error('Failed to add step:', error);
    }
  }, [currentTask]);

  const handleEditStep = useCallback(async (stepId: string, content: string) => {
    if (!currentTask) return;
    
    try {
      const response = await fetch(`/api/tasks/${currentTask.id}/steps/${stepId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      
      const result = await response.json();
      if (result.success) {
        // Update local state immediately for better UX
        setCurrentTask(prev => {
          if (!prev) return prev;
          
          const updatedSteps = prev.steps.map(step => 
            step.id === stepId ? { ...step, content } : step
          );
          
          return { ...prev, steps: updatedSteps };
        });
      } else {
        console.error('Failed to edit step:', result.error);
      }
    } catch (error) {
      console.error('Failed to edit step:', error);
    }
  }, [currentTask]);

  const handleDeleteStep = useCallback(async (stepId: string) => {
    if (!currentTask) return;
    
    try {
      const response = await fetch(`/api/tasks/${currentTask.id}/steps/${stepId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      if (result.success) {
        // Update local state immediately for better UX
        setCurrentTask(prev => {
          if (!prev) return prev;
          
          const updatedSteps = prev.steps.filter(step => step.id !== stepId);
          return { ...prev, steps: updatedSteps };
        });
      } else {
        console.error('Failed to delete step:', result.error);
      }
    } catch (error) {
      console.error('Failed to delete step:', error);
    }
  }, [currentTask]);

  const [isGeneratingSteps, setIsGeneratingSteps] = useState(false);
  
  const handleGenerateSteps = useCallback(async () => {
    if (!currentTask) return;
    
    setIsGeneratingSteps(true);
    
    try {
      const completedSteps = currentTask.steps
        .filter(step => step.done)
        .map(step => step.content);
      
      const remainingSteps = currentTask.steps
        .filter(step => !step.done)
        .map(step => step.content);
      
      const response = await fetch('/api/tasks/generate-next-steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: currentTask.title,
          taskDescription: currentTask.description || '',
          completedSteps,
          remainingSteps
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // Add the generated steps to the task
        for (const stepContent of result.data) {
          await handleAddStep(stepContent);
        }
      } else {
        console.error('Failed to generate steps:', result.error);
      }
    } catch (error) {
      console.error('Error generating steps:', error);
    } finally {
      setIsGeneratingSteps(false);
    }
  }, [currentTask, handleAddStep]);

  // Track if timer was running before opening distraction modal
  const [wasTimerRunningBeforeDistraction, setWasTimerRunningBeforeDistraction] = useState(false);
  
  const handleOpenDistractionModal = useCallback(() => {
    // Store whether timer was running before we pause it
    setWasTimerRunningBeforeDistraction(timer.isRunning && !timer.isPaused);
    
    // Pause the timer if it's running
    if (timer.isRunning && !timer.isPaused) {
      timer.pause();
    }
    
    setIsDistractionCaptureOpen(true);
  }, [timer]);
  
  const handleCloseDistractionModal = useCallback(() => {
    setIsDistractionCaptureOpen(false);
    
    // Resume timer if it was running before we opened the modal
    if (wasTimerRunningBeforeDistraction) {
      timer.start();
    }
    
    // Reset the flag
    setWasTimerRunningBeforeDistraction(false);
  }, [timer, wasTimerRunningBeforeDistraction]);

  const handleDistractionCapture = async (distraction: string) => {
    if (!currentSession) return;
    
    try {
      // Save distraction to database
      await captureDistraction(currentSession.id, distraction);
      
      // Add to local state for immediate UI feedback
      const newDistraction: Distraction = {
        id: `temp-${Date.now()}`,
        userId: 'current-user',
        sessionId: currentSession.id,
        content: distraction,
        createdAt: new Date().toISOString(),
        handled: false,
      };
      
      setDistractions(prev => [...prev, newDistraction]);
      console.log('Captured distraction:', distraction);
    } catch (error) {
      console.error('Failed to capture distraction:', error);
      // Still add to local state as fallback
      const fallbackDistraction: Distraction = {
        id: `temp-${Date.now()}`,
        userId: 'current-user',
        sessionId: currentSession?.id || '',
        content: distraction,
        createdAt: new Date().toISOString(),
        handled: false,
      };
      setDistractions(prev => [...prev, fallbackDistraction]);
    }
  };

  
  const handleBreakPause = useCallback(() => {
    if (breakTimerHook.isRunning && !breakTimerHook.isPaused) {
      breakTimerHook.pause();
    } else if (breakTimerHook.isPaused) {
      breakTimerHook.start();
    }
  }, [breakTimerHook]);
  
  const handleBreakStop = useCallback(() => {
    console.log('🛑 Ending break timer early');
    
    // Trigger the break complete flow with manual end flag
    handleBreakComplete(true);
  }, [handleBreakComplete]);
  
  const handleStartNewSession = useCallback(() => {
    console.log('🚀 Starting new session after break');
    
    // Get the task to resume from completed break data
    const taskToResume = completedBreakData?.taskToResume;
    console.log('📋 Task to resume from break data:', {
      hasTask: !!taskToResume,
      taskTitle: taskToResume?.title
    });
    
    setIsBreakCompleteModalOpen(false);
    const savedBreakData = completedBreakData; // Save reference before clearing
    setCompletedBreakData(null);
    
    // Reset break timer state
    setBreakTimer({
      isActive: false,
      timeRemaining: 0,
      totalTime: 0,
      type: 'short'
    });
    
    // If we have a task to resume, start a new focus session with it
    if (taskToResume) {
      console.log('🔄 Resuming task after break:', taskToResume.title);
      // Keep the task with its current progress (don't reset completed steps)
      setCurrentTask(taskToResume);
      
      // Start new focus session with the task
      setTimeout(() => {
        handleStart(taskToResume);
      }, 100);
    } else {
      console.log('⚠️ No task to resume after break');
    }
  }, [completedBreakData, handleStart]);
  
  const handleBreakCompleteModalClose = useCallback(() => {
    console.log('🚪 Closing break complete modal');
    setIsBreakCompleteModalOpen(false);
    setCompletedBreakData(null);
    
    // Reset break timer state
    setBreakTimer({
      isActive: false,
      timeRemaining: 0,
      totalTime: 0,
      type: 'short'
    });
  }, []);
  


  const isSessionActive = timer.isRunning || timer.isPaused;
  const isBreakActive = breakTimer.isActive;
  const isAnySessionActive = isSessionActive || isBreakActive;

  // Auto-complete session when all task steps are done (only if we have a task with steps)
  useEffect(() => {
    console.log('🔍 Auto-completion effect triggered:', {
      hasCurrentTask: !!currentTask,
      taskTitle: currentTask?.title,
      hasSteps: currentTask?.steps?.length,
      isSessionActive,
      timerIsRunning: timer.isRunning,
      timerIsPaused: timer.isPaused,
      timeRemaining: timer.timeRemaining
    });
    
    // Only auto-complete if we have a task AND it has steps AND session is active
    if (currentTask && currentTask.steps && currentTask.steps.length > 0 && isSessionActive) {
      console.log('✅ Auto-completion conditions met - checking task completion:', {
        taskTitle: currentTask.title,
        hasSteps: currentTask.steps.length > 0,
        steps: currentTask.steps.map(s => ({ content: s.content, done: s.done })),
        isSessionActive
      });
      
      const allStepsComplete = currentTask.steps.every(step => step.done);
      console.log('📊 Step completion check:', { allStepsComplete, stepCount: currentTask.steps.length });
      
      if (allStepsComplete) {
        // All steps are complete, auto-complete the session
        console.log('🎯 All tasks complete! Auto-completing session...');
        timer.skip(); // This will trigger handleSessionComplete
      } else {
        console.log('📝 Not all steps complete, continuing session...');
      }
    } else {
      console.log('❌ Auto-completion disabled:', {
        hasTask: !!currentTask,
        hasSteps: (currentTask?.steps?.length ?? 0) > 0,
        isSessionActive,
        reason: !currentTask ? 'No current task' : 
                !currentTask.steps || currentTask.steps.length === 0 ? 'No steps' : 
                !isSessionActive ? 'Session not active' : 'Unknown'
      });
    }
  }, [currentTask, isSessionActive, timer]);

  // Don't render until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show loading state while Auth0 is loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Focus
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Start sooner, stay focused, finish on time
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Please sign in to start your focus session
          </p>
          <Link
            href="/api/auth/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Sign In to Get Started
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative pb-10 ${
      isBreakActive 
        ? 'bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900 dark:to-emerald-800'
        : 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800'
    }`}>
      {/* Add Header */}
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />
      
      <div className="max-w-2xl mx-auto pt-20 px-4">
        {/* Streak display */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center text-orange-600 dark:text-orange-400">
            <FireIcon className="w-5 h-5 mr-2" />
            <span className="font-semibold">{streak} day streak</span>
          </div>
        </div>

        {/* Main content area */}
        <div className={`rounded-3xl shadow-xl p-8 mb-6 ${
          isBreakActive 
            ? 'bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-800 dark:to-emerald-900'
            : 'bg-white dark:bg-gray-800'
        }`}>
          {isBreakActive ? (
            /* Break timer state */
            <BreakTimer
              timeRemaining={breakTimer.timeRemaining}
              totalTime={breakTimer.totalTime}
              isRunning={breakTimerHook.isRunning}
              isPaused={breakTimerHook.isPaused}
              breakType={breakTimer.type}
              onPause={handleBreakPause}
              onStop={handleBreakStop}
            />
          ) : !isSessionActive ? (
            /* Start state */
            <div>
              <TaskCreationForm
                task={currentTask || undefined}
                onStart={handleStart}
                onUpdateTask={(updatedTask) => setCurrentTask(updatedTask)}
                isLoading={isStarting}
                sessionDuration={settings.defaultSessionDuration || 1500}
              />
            </div>
          ) : (
            /* Active session state */
            <div className="text-center">
              <TimerDisplay
                timeRemaining={timer.timeRemaining}
                totalTime={settings.defaultSessionDuration || 1500}
                isRunning={timer.isRunning}
                isPaused={timer.isPaused}
              />
              
              {/* Total time on task */}
              {currentTask && currentTask.totalTimeSpent !== undefined && (
                <div className="text-center mb-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total time on task: {formatTaskTime(currentTask.totalTimeSpent)}
                  </div>
                </div>
              )}
              
              {/* Current task info */}
              {currentTask && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    {currentTask.title}
                  </h2>
                  {currentTask.steps && currentTask.steps.length > 0 && (
                    <div className="text-left">
                      <TaskSteps
                        steps={currentTask.steps}
                        onToggleStep={handleToggleStep}
                        onAddStep={handleAddStep}
                        onEditStep={handleEditStep}
                        onDeleteStep={handleDeleteStep}
                        onGenerateSteps={handleGenerateSteps}
                        taskId={currentTask.id}
                        taskTitle={currentTask.title}
                        taskDescription={currentTask.description}
                        isGeneratingSteps={isGeneratingSteps}
                      />
                    </div>
                  )}
                </div>
              )}
              
              {/* Session controls */}
              <div className="flex justify-center space-x-4 mb-6">
                <button
                  onClick={handlePause}
                  className="flex items-center px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  {timer.isPaused ? (
                    <><PlayIcon className="w-5 h-5 mr-2" />Resume</>
                  ) : (
                    <><PauseIcon className="w-5 h-5 mr-2" />Pause</>
                  )}
                </button>
                
                <button
                  onClick={handleOpenDistractionModal}
                  className="flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                  Not Now
                </button>
                
                <button
                  onClick={handleStopClick}
                  className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <StopIcon className="w-5 h-5 mr-2" />
                  Stop
                </button>
              </div>
              
              {/* Session stats */}
              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                <p>Distractions captured: {distractions.length}</p>
                {distractions.length > 0 && (
                  <p className="mt-1">Latest: &quot;{distractions[distractions.length - 1].content}&quot;</p>
                )}
              </div>
            </div>
          )}
        </div>
        
      </div>
      
      {/* Distraction capture modal */}
      <DistractionCapture
        isOpen={isDistractionCaptureOpen}
        onClose={handleCloseDistractionModal}
        onCapture={handleDistractionCapture}
        sessionId={currentSession?.id || ''}
      />
      
      {/* Stop reason modal */}
      <StopReasonModal
        isOpen={isStopReasonModalOpen}
        onClose={() => setIsStopReasonModalOpen(false)}
        onConfirmStop={handleConfirmStop}
      />
      
      {/* Session complete modal */}
      {completedSessionData && (
        <SessionCompleteModal
          isOpen={isSessionCompleteModalOpen}
          onClose={handleSessionCompleteModalClose}
          onContinueTask={completedSessionData.task ? handleContinueTask : undefined}
          onTakeBreak={handleTakeBreak}
          sessionDuration={completedSessionData.duration}
          taskTitle={completedSessionData.taskTitle}
          completedSteps={completedSessionData.completedSteps}
          totalSteps={completedSessionData.totalSteps}
          streak={completedSessionData.streak}
          isTaskComplete={completedSessionData.isTaskComplete}
        />
      )}
      
      {/* Break complete modal */}
      {completedBreakData && (
        <BreakCompleteModal
          isOpen={isBreakCompleteModalOpen}
          onClose={handleBreakCompleteModalClose}
          onStartNewSession={handleStartNewSession}
          breakType={completedBreakData.breakType}
          breakDuration={completedBreakData.duration}
          hasTaskToResume={!!completedBreakData.taskToResume}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={saveSettings}
        currentSettings={settings}
      />

      {/* Task Manager Modal */}
      <TaskManager
        isOpen={isTaskHistoryOpen}
        onClose={() => setIsTaskHistoryOpen(false)}
        refresh={taskManagerRefresh}
        onContinueTask={(task) => {
          // Convert TaskManager task format to our Task format
          const convertedTask: Task = {
            id: task.id,
            userId: 'current-user',
            title: task.title,
            description: task.description,
            status: 'pending',
            priority: 2,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            estimatedSessions: 1,
            totalTimeSpent: 0,
            steps: task.steps.map((step: any) => ({
              ...step,
              taskId: task.id // Ensure taskId is set
            }))
          };
          
          // Reset timer and start new session
          timer.reset();
          setCurrentTask(convertedTask);
          
          setTimeout(() => {
            handleStart(convertedTask);
          }, 10);
        }}
      />
      
      {/* Floating action buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-40">
        {/* Task history button */}
        <button
          onClick={() => setIsTaskHistoryOpen(true)}
          className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800"
          aria-label="View task history"
        >
          <TrophyIcon className="w-6 h-6 mx-auto" />
        </button>
      </div>
      <Footer />
    </div>
  );
}
