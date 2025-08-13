'use client';

import { formatTime, getProgress } from '@/hooks/useTimer';
import { TimerDisplayProps } from '@/types';

export default function TimerDisplay({
  timeRemaining,
  totalTime,
  isRunning,
  isPaused,
}: TimerDisplayProps) {
  const progress = getProgress(timeRemaining, totalTime);
  const circumference = 2 * Math.PI * 120; // radius = 120
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Circular Progress Timer */}
      <div className="relative w-64 h-64 mb-8">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 256 256">
          {/* Background circle */}
          <circle
            cx="128"
            cy="128"
            r="120"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx="128"
            cy="128"
            r="120"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-1000 ease-in-out ${
              isRunning && !isPaused
                ? 'text-blue-500'
                : isPaused
                ? 'text-yellow-500'
                : 'text-green-500'
            }`}
            strokeLinecap="round"
          />
        </svg>
        
        {/* Time display in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl font-mono font-bold text-gray-900 dark:text-white">
              {formatTime(timeRemaining)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isRunning && !isPaused && 'Focus time'}
              {isPaused && 'Paused'}
              {!isRunning && timeRemaining === totalTime && 'Ready to start'}
              {!isRunning && timeRemaining === 0 && 'Session complete!'}
              {!isRunning && timeRemaining > 0 && timeRemaining < totalTime && 'Stopped'}
            </div>
          </div>
        </div>
        
        {/* Pulse animation when running */}
        {isRunning && !isPaused && (
          <div className="absolute inset-0 rounded-full border-4 border-blue-500 opacity-20 animate-ping" />
        )}
      </div>

      {/* Session info */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-300 mb-4">
        <div>Session length: {formatTime(totalTime)}</div>
      </div>
    </div>
  );
}
