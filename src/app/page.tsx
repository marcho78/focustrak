'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { useTimer } from '@/hooks/useTimer';
import { useSettings } from '@/hooks/useSettings';
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

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
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
  
  // Load settings
  const { settings, saveSettings, isLoaded } = useSettings();

  // Use refs to store current values for stable callback
  const currentSessionRef = useRef<Session | null>(null);
  const currentTaskRef = useRef<Task | null>(null);
  const setDistractionsRef = useRef(setDistractions);
  const setCurrentSessionRef = useRef(setCurrentSession);
  const setCurrentTaskRef = useRef(setCurrentTask);
  const setStreakRef = useRef(setStreak);

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
  const handleBreakComplete = useCallback(() => {
    // Store the current task before any state updates
    const taskForResumption = currentTask;
    
    // Get current break timer state to avoid stale closures
    setBreakTimer(prev => {
      // Only complete if time actually reached zero and we're active
      if (prev.timeRemaining === 0 && prev.isActive) {
        // Store completed break data with the task we captured earlier
        setCompletedBreakData({
          breakType: prev.type,
          duration: prev.totalTime,
          taskToResume: taskForResumption // Use the task we captured before state updates
        });
        
        // Show break completion modal
        setIsBreakCompleteModalOpen(true);
        
        return { ...prev, isActive: false };
      } else {
        return prev;
      }
    });
  }, [currentTask]);
  
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
  }, [settings.breakDuration, settings.longBreakDuration, settings.autoStartBreaks, breakTimerHook, completedSessionData, currentTask]);
  
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
        
        // Check if task should be marked as completed
        const currentTask = currentTaskRef.current;
        if (currentTask && currentTask.steps && currentTask.steps.length > 0) {
          const allStepsComplete = currentTask.steps.every(step => step.done);
          
          if (allStepsComplete) {
            try {
              // Mark task as completed
              const response = await fetch(`/api/tasks/${currentTask.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  status: 'completed',
                  completedAt: new Date().toISOString()
                })
              });
              
              const result = await response.json();
              if (!result.success) {
                console.warn('Failed to mark task as completed:', result.error);
              }
            } catch (error) {
              console.warn('Failed to mark task as completed:', error);
            }
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
          isTaskComplete: isTaskFullyComplete,
          task: !isTaskFullyComplete ? task : null // Keep task for resumption if not complete
        });
        
        // Check if we should auto-start a break or show the completion modal
        if (settings.autoStartBreaks) {
          console.log('🔄 Auto-starting break after session completion');
          // Auto-start a short break
          setTimeout(() => {
            handleTakeBreak('short');
          }, 500); // Small delay to ensure state updates complete
        } else {
          // Show completion modal for user to choose
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
      
      // Reset for next session regardless of database update success
      setCurrentSessionRef.current(null);
      setCurrentTaskRef.current(null);
      setDistractionsRef.current([]);
    } else {
      console.log('⚠️ handleSessionComplete called but no current session');
    }
  }, [settings.defaultSessionDuration, settings.autoStartBreaks, streak, handleTakeBreak]); // Include necessary dependencies

  // Create timer with the stable completion callback - wait for settings to load
  const timer = useTimer({
    duration: settings.defaultSessionDuration || 1500,
    onComplete: handleSessionComplete,
  });

  const handleStart = useCallback(async (task?: Task) => {
    console.log('🚀 Starting session with task:', task);
    setIsStarting(true);
    
    try {
      let currentTaskToUse = task;
      
      // Validate that we have a task to work with
      if (!task) {
        throw new Error('Cannot start focus session without a task. Please create a new task first.');
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
  }, [timer]);

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
    console.log('🛑 Stopping break timer');
    breakTimerHook.reset();
    setBreakTimer({
      isActive: false,
      timeRemaining: 0,
      totalTime: 0,
      type: 'short'
    });
  }, [breakTimerHook]);
  
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
      // Reset task steps to allow working on them again
      const resetTask = {
        ...taskToResume,
        steps: taskToResume.steps.map(step => ({ ...step, done: false }))
      };
      
      setCurrentTask(resetTask);
      
      // Start new focus session with the task
      setTimeout(() => {
        handleStart(resetTask);
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
        hasSteps: currentTask?.steps?.length > 0,
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

  return (
    <div className={`min-h-screen p-4 ${
      isBreakActive 
        ? 'bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900 dark:to-emerald-800'
        : 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800'
    }`}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Focus
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Start sooner, stay focused, finish on time
          </p>
          
          {/* Streak display */}
          <div className="flex items-center justify-center mt-4 text-orange-600 dark:text-orange-400">
            <FireIcon className="w-5 h-5 mr-2" />
            <span className="font-semibold">{streak} day streak</span>
          </div>
        </header>

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
                        taskId={currentTask.id}
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
                  onClick={() => setIsDistractionCaptureOpen(true)}
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
        
        {/* App info */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>🎯 {Math.floor((settings.defaultSessionDuration || 1500) / 60)}-minute focus sessions</p>
          <p>✨ AI-powered task breakdown</p>
          <p>📝 Distraction capture</p>
        </div>
      </div>
      
      {/* Distraction capture modal */}
      <DistractionCapture
        isOpen={isDistractionCaptureOpen}
        onClose={() => setIsDistractionCaptureOpen(false)}
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
            steps: task.steps
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
        {/* Settings button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-14 h-14 bg-gradient-to-r from-gray-600 to-gray-700 dark:from-gray-700 dark:to-gray-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
          aria-label="Open settings"
        >
          <Cog6ToothIcon className="w-6 h-6 mx-auto" />
        </button>
        
        {/* Task history button */}
        <button
          onClick={() => setIsTaskHistoryOpen(true)}
          className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800"
          aria-label="View task history"
        >
          <TrophyIcon className="w-6 h-6 mx-auto" />
        </button>
      </div>
    </div>
  );
}
