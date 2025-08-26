'use client';

import React, { useState, useEffect } from 'react';
import { PlayIcon, PauseIcon, StopIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { formatTime, getProgress } from '@/hooks/useTimer';
import { focusContentService } from '@/lib/focus-content-service';

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
  const [breakContent, setBreakContent] = useState<{ line: string; tip: string } | null>(null);
  
  useEffect(() => {
    // Get break content when component mounts
    const content = focusContentService.getBreakContent();
    setBreakContent(content);
  }, []);
  
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
      <div className="relative inline-block mb-8 max-w-[340px] w-full">
        <svg
          viewBox="0 0 340 340"
          className="transform -rotate-90 w-full h-full"
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

      {/* Break Content - Motivational Line and Tip */}
      {breakContent && (
        <div className="space-y-4 max-w-md mx-auto">
          {/* Motivational Line */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <SparklesIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">
                {breakContent.line}
              </p>
            </div>
          </div>
          
          {/* Productivity Tip */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
            <h3 className="font-medium text-green-800 dark:text-green-300 mb-2 flex items-center">
              <SparklesIcon className="w-4 h-4 mr-2" />
              Productivity Tip
            </h3>
            <p className="text-sm text-green-700 dark:text-green-400 text-left">
              {breakContent.tip}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
