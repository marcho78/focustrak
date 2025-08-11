import { useState, useEffect, useRef, useCallback } from 'react';
import { UseTimerOptions, UseTimerReturn } from '@/types';

export function useTimer({
  duration,
  onComplete,
  onTick,
  autoStart = false,
}: UseTimerOptions): UseTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isPaused, setIsPaused] = useState(false);
  const [initialDuration, setInitialDuration] = useState(duration);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  
  // Update duration when it changes (but only if timer is not running)
  useEffect(() => {
    console.log('⚡ Duration update effect:', {
      duration,
      isRunning,
      isPaused,
      timeRemaining,
      initialDuration,
      shouldUpdate: !isRunning && !isPaused && timeRemaining === initialDuration
    });
    
    if (!isRunning && !isPaused && timeRemaining === initialDuration) {
      console.log('🔄 Updating timer duration from', initialDuration, 'to', duration);
      setTimeRemaining(duration);
      setInitialDuration(duration);
    }
  }, [duration, isRunning, isPaused, timeRemaining, initialDuration]);

  // Clear interval when component unmounts
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning && !isPaused) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000) - pausedTimeRef.current;
        const remaining = Math.max(0, initialDuration - elapsed);
        
        setTimeRemaining(remaining);
        onTick?.(remaining);

        if (remaining === 0) {
          setIsRunning(false);
          setIsPaused(false);
          startTimeRef.current = null;
          pausedTimeRef.current = 0;
          onComplete();
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, initialDuration, onComplete, onTick]);

  const start = useCallback(() => {
    console.log('⏱️ Timer start called:', {
      isRunning,
      isPaused,
      timeRemaining,
      initialDuration,
      duration
    });
    
    if (!isRunning) {
      setIsRunning(true);
      setIsPaused(false);
      if (timeRemaining === initialDuration || timeRemaining === 0) {
        // Fresh start (either at full duration or after reset)
        console.log('🚀 Fresh timer start');
        setTimeRemaining(duration);
        setInitialDuration(duration);
        startTimeRef.current = Date.now();
        pausedTimeRef.current = 0;
      } else {
        // Resume from pause
        console.log('▶️ Resume from pause');
        startTimeRef.current = Date.now() - (initialDuration - timeRemaining) * 1000;
      }
    } else if (isPaused) {
      // Resume from pause
      console.log('▶️ Resume from pause (was paused)');
      const pauseDuration = Math.floor((Date.now() - (startTimeRef.current || 0)) / 1000) - (initialDuration - timeRemaining);
      pausedTimeRef.current += pauseDuration;
      setIsPaused(false);
    }
    
    console.log('⏱️ Timer start completed:', {
      isRunning: true,
      timeRemaining: timeRemaining === 0 ? duration : timeRemaining,
      initialDuration: timeRemaining === 0 ? duration : initialDuration
    });
  }, [isRunning, isPaused, timeRemaining, initialDuration, duration]);

  const pause = useCallback(() => {
    if (isRunning && !isPaused) {
      setIsPaused(true);
    }
  }, [isRunning, isPaused]);

  const reset = useCallback(() => {
    console.log('🔄 Timer reset called with duration:', duration);
    setIsRunning(false);
    setIsPaused(false);
    setTimeRemaining(duration);
    setInitialDuration(duration);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    console.log('✅ Timer reset completed:', { timeRemaining: duration, initialDuration: duration });
  }, [duration]);

  const skip = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeRemaining(0);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onComplete();
  }, [onComplete]);

  return {
    timeRemaining,
    isRunning,
    isPaused,
    start,
    pause,
    reset,
    skip,
  };
}

// Helper function to format time for display
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Helper function to get progress percentage
export function getProgress(timeRemaining: number, totalTime: number): number {
  return ((totalTime - timeRemaining) / totalTime) * 100;
}
