'use client';

import React from 'react';
import { PlayIcon, PauseIcon, StopIcon } from '@heroicons/react/24/solid';
import { formatTime, getProgress } from '@/hooks/useTimer';

interface BreakTimerProps {
  timeRemaining: number;
  totalTime: number;
  isRunning: boolean;
  isPaused: boolean;
  breakType: 'short' | 'long';
  onPause: () => void;
  onStop: () => void;
}

export default function BreakTimer({
  timeRemaining,
  totalTime,
  isRunning,
  isPaused,
  breakType,
  onPause,
  onStop
}: BreakTimerProps) {
  const progress = getProgress(timeRemaining, totalTime);
  const radius = 160;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="text-center">
      {/* Break Timer Title */}
      <h2 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-6">
        {breakType === 'short' ? '☕ Short Break' : '🌿 Long Break'}
      </h2>
      
      {/* Circular Progress Timer */}
      <div className="relative inline-block mb-8">
        <svg
          width="340"
          height="340"
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx="170"
            cy="170"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-green-200 dark:text-green-800"
          />
          {/* Progress circle */}
          <circle
            cx="170"
            cy="170"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-green-500 dark:text-green-400 transition-all duration-1000 ease-in-out"
          />
        </svg>
        
        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-6xl font-mono font-bold text-green-800 dark:text-green-300">
            {formatTime(timeRemaining)}
          </div>
          <div className="text-sm text-green-600 dark:text-green-400 mt-2">
            {isPaused ? 'Paused' : isRunning ? 'Break Time' : 'Ready'}
          </div>
        </div>
      </div>

      {/* Break Controls */}
      <div className="flex justify-center space-x-4 mb-6">
        <button
          onClick={onPause}
          className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          {isPaused ? (
            <>
              <PlayIcon className="w-5 h-5 mr-2" />
              Resume Break
            </>
          ) : (
            <>
              <PauseIcon className="w-5 h-5 mr-2" />
              Pause Break
            </>
          )}
        </button>
        
        <button
          onClick={onStop}
          className="flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <StopIcon className="w-5 h-5 mr-2" />
          End Break
        </button>
      </div>

      {/* Break Tips */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 max-w-md mx-auto">
        <h3 className="font-medium text-green-800 dark:text-green-300 mb-2">
          Break Tips:
        </h3>
        <ul className="text-sm text-green-700 dark:text-green-400 space-y-1 text-left">
          <li>• Step away from your screen</li>
          <li>• Take a few deep breaths</li>
          <li>• Stretch or walk around</li>
          <li>• Hydrate and rest your eyes</li>
        </ul>
      </div>
    </div>
  );
}
