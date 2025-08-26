'use client';

import React from 'react';
import { 
  ClipboardDocumentListIcon, 
  SparklesIcon,
  Cog6ToothIcon,
  UserCircleIcon 
} from '@heroicons/react/24/outline';
import {
  ClipboardDocumentListIcon as ClipboardSolid,
  SparklesIcon as SparklesSolid,
  Cog6ToothIcon as CogSolid,
  UserCircleIcon as UserSolid
} from '@heroicons/react/24/solid';

interface BottomNavigationProps {
  onTaskManagerClick: () => void;
  onAICoachClick: () => void;
  onSettingsClick: () => void;
  activePanel?: 'tasks' | 'ai' | 'settings' | null;
}

export default function BottomNavigation({ 
  onTaskManagerClick, 
  onAICoachClick, 
  onSettingsClick,
  activePanel
}: BottomNavigationProps) {
  return (
    <>
      {/* Mobile Bottom Navigation - only visible on small screens */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40">
        <div className="flex justify-around items-center h-16 px-4">
          {/* Task Manager */}
          <button
            onClick={onTaskManagerClick}
            className={`flex flex-col items-center justify-center flex-1 py-2 px-3 rounded-lg transition-colors ${
              activePanel === 'tasks' 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            aria-label="Task Manager"
          >
            {activePanel === 'tasks' ? (
              <ClipboardSolid className="w-6 h-6 mb-1" />
            ) : (
              <ClipboardDocumentListIcon className="w-6 h-6 mb-1" />
            )}
            <span className="text-xs">Tasks</span>
          </button>

          {/* AI Coach */}
          <button
            onClick={onAICoachClick}
            className={`flex flex-col items-center justify-center flex-1 py-2 px-3 rounded-lg transition-colors ${
              activePanel === 'ai' 
                ? 'text-purple-600 dark:text-purple-400' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            aria-label="AI Coach"
          >
            {activePanel === 'ai' ? (
              <SparklesSolid className="w-6 h-6 mb-1" />
            ) : (
              <SparklesIcon className="w-6 h-6 mb-1" />
            )}
            <span className="text-xs">AI Coach</span>
          </button>

          {/* Settings */}
          <button
            onClick={onSettingsClick}
            className={`flex flex-col items-center justify-center flex-1 py-2 px-3 rounded-lg transition-colors ${
              activePanel === 'settings' 
                ? 'text-gray-900 dark:text-gray-100' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            aria-label="Settings"
          >
            {activePanel === 'settings' ? (
              <CogSolid className="w-6 h-6 mb-1" />
            ) : (
              <Cog6ToothIcon className="w-6 h-6 mb-1" />
            )}
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </div>

      {/* Desktop Floating Buttons - only visible on larger screens */}
      <div className="hidden md:block">
        {/* Task Manager Button */}
        <button
          onClick={onTaskManagerClick}
          className={`fixed left-6 bottom-6 p-4 rounded-full shadow-lg transition-all hover:scale-110 z-40 ${
            activePanel === 'tasks'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700'
          }`}
          aria-label="Task Manager"
        >
          <ClipboardDocumentListIcon className="w-6 h-6" />
        </button>

        {/* AI Coach Button */}
        <button
          onClick={onAICoachClick}
          className={`fixed right-6 bottom-6 p-4 rounded-full shadow-lg transition-all hover:scale-110 z-40 ${
            activePanel === 'ai'
              ? 'bg-purple-600 text-white'
              : 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-gray-700'
          }`}
          aria-label="AI Coach"
        >
          <SparklesIcon className="w-6 h-6" />
        </button>
      </div>
    </>
  );
}