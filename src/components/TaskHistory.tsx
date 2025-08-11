'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
  PlayIcon,
  TrophyIcon,
  TrashIcon
} from '@heroicons/react/24/solid';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface HistorySession {
  id: string;
  startedAt: string;
  endedAt: string;
  plannedDuration: number;
  actualDuration: number;
  status: 'completed' | 'skipped';
  notes?: string;
  completedSteps: number;
  totalSteps: number;
}

interface TaskStep {
  id: string;
  content: string;
  done: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

interface TaskHistoryItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  steps: TaskStep[];
  stats: {
    totalSessions: number;
    completedSessions: number;
    totalFocusTime: number;
    lastSessionDate: string;
  };
  sessions: HistorySession[];
}

interface TaskHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper functions
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }
};

const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export default function TaskHistory({ isOpen, onClose }: TaskHistoryProps) {
  const [taskHistory, setTaskHistory] = useState<TaskHistoryItem[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTaskHistory();
    }
  }, [isOpen]);

  const fetchTaskHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tasks/history');
      const result = await response.json();
      
      if (result.success) {
        setTaskHistory(result.data);
      } else {
        setError(result.error || 'Failed to fetch task history');
      }
    } catch (err) {
      setError('Failed to fetch task history');
      console.error('Error fetching task history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const deleteSelectedTasks = async () => {
    if (selectedTasks.size === 0) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch('/api/tasks/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: Array.from(selectedTasks) })
      });
      
      const result = await response.json();
      if (result.success) {
        // Remove deleted tasks from state
        setTaskHistory(prev => prev.filter(task => !selectedTasks.has(task.id)));
        setSelectedTasks(new Set());
        setExpandedTasks(new Set());
      } else {
        setError(result.error || 'Failed to delete tasks');
      }
    } catch (err) {
      setError('Failed to delete tasks');
      console.error('Error deleting tasks:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md">
          <div className="h-full flex flex-col bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <TrophyIcon className="w-5 h-5 mr-2" />
                  Task History
                </h2>
                <div className="flex items-center space-x-2">
                  {selectedTasks.size > 0 && (
                    <button
                      onClick={deleteSelectedTasks}
                      disabled={isDeleting}
                      className="bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                      <TrashIcon className="w-4 h-4 mr-1" />
                      {isDeleting ? 'Deleting...' : `Delete (${selectedTasks.size})`}
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="p-4 text-center">
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                  <button 
                    onClick={fetchTaskHistory}
                    className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : taskHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <TrophyIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No completed tasks yet</p>
                  <p className="text-sm">Complete your first focus session to see your history here!</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {taskHistory.map((task) => (
                    <div 
                      key={task.id}
                      className="bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600"
                    >
                      {/* Task Header */}
                      <div className="flex items-center p-4">
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.id)}
                          onChange={() => toggleTaskSelection(task.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mr-3"
                        />
                        <button
                          onClick={() => toggleTaskExpansion(task.id)}
                          className="flex-1 text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors rounded-lg p-2 -m-2"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-1 truncate">
                                {task.title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center">
                                  <PlayIcon className="w-4 h-4 mr-1" />
                                  {task.stats.completedSessions} sessions
                                </div>
                                <div className="flex items-center">
                                  <ClockIcon className="w-4 h-4 mr-1" />
                                  {formatDuration(task.stats.totalFocusTime)}
                                </div>
                                <div className="flex items-center">
                                  <CalendarDaysIcon className="w-4 h-4 mr-1" />
                                  {formatDate(task.stats.lastSessionDate)}
                                </div>
                              </div>
                            </div>
                            <div className="ml-3 flex-shrink-0">
                              {expandedTasks.has(task.id) ? (
                                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </button>
                      </div>

                      {/* Expanded Content */}
                      {expandedTasks.has(task.id) && (
                        <div className="border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                          {/* Task Steps */}
                          {task.steps && task.steps.length > 0 && (
                            <div className="p-4 border-b border-gray-200 dark:border-gray-600">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Task Steps</h4>
                              <div className="space-y-2">
                                {task.steps.map((step) => (
                                  <div key={step.id} className="flex items-center space-x-2 text-sm">
                                    <div className="flex-shrink-0">
                                      {step.done ? (
                                        <CheckIcon className="w-4 h-4 text-green-500" />
                                      ) : (
                                        <XMarkIcon className="w-4 h-4 text-gray-400" />
                                      )}
                                    </div>
                                    <span className={`flex-1 ${step.done ? 'text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                                      {step.content}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Sessions */}
                          <div className="p-4">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Focus Sessions</h4>
                            <div className="space-y-3">
                              {task.sessions.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                  No sessions found
                                </p>
                              ) : (
                                task.sessions.map((session) => (
                                  <div 
                                    key={session.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="flex-shrink-0">
                                        {session.status === 'completed' ? (
                                          <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                        ) : (
                                          <XCircleIcon className="w-5 h-5 text-orange-500" />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center space-x-2 text-sm">
                                          <span className="font-medium text-gray-900 dark:text-white">
                                            {formatTime(session.startedAt)}
                                          </span>
                                          <span className="text-gray-500 dark:text-gray-400">
                                            {formatDate(session.startedAt)}
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-600 dark:text-gray-400">
                                          <span>
                                            {formatDuration(session.actualDuration || 0)}
                                          </span>
                                          {session.totalSteps > 0 && (
                                            <span>
                                              {session.completedSteps}/{session.totalSteps} steps
                                            </span>
                                          )}
                                        </div>
                                        {session.notes && (
                                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {session.notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
