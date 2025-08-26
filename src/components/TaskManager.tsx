'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
  PlayIcon,
  TrophyIcon,
  TrashIcon,
  PauseCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PlusIcon,
  PencilIcon
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
  distractions?: Array<{
    id: string;
    content: string;
    createdAt: string;
    handled: boolean;
  }>;
}

interface TaskStep {
  id: string;
  content: string;
  done: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  steps: TaskStep[];
  stats: {
    totalSessions: number;
    completedSessions: number;
    totalFocusTime: number;
    lastSessionDate?: string;
    completionRate: number;
  };
  sessions: HistorySession[];
  lastStopReason?: string;
  progressPercentage: number;
}

interface TaskManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueTask?: (task: TaskItem) => void;
  refresh?: number; // Added refresh prop to trigger task list reload
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

const getTaskStatusInfo = (task: TaskItem) => {
  if (task.status === 'completed') {
    return {
      icon: CheckCircleIcon,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      label: 'Completed'
    };
  }
  
  if (task.progressPercentage === 0) {
    return {
      icon: PlayIcon,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      label: 'Not Started'
    };
  }
  
  return {
    icon: PauseCircleIcon,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    label: 'In Progress'
  };
};

export default function TaskManager({ isOpen, onClose, onContinueTask, refresh }: TaskManagerProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'incomplete' | 'completed'>('incomplete');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSeenRefresh = useRef<number | undefined>(undefined);
  
  // Step management state
  const [newStepInputs, setNewStepInputs] = useState<{[taskId: string]: string}>({});
  const [editingSteps, setEditingSteps] = useState<Set<string>>(new Set());
  const [editStepValues, setEditStepValues] = useState<{[stepId: string]: string}>({});
  const [loadingSteps, setLoadingSteps] = useState<Set<string>>(new Set());
  
  // Pagination state
  const [incompleteTasksLimit, setIncompleteTasksLimit] = useState(10);
  const [completedTasksLimit, setCompletedTasksLimit] = useState(5);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Always fetch tasks when opening, reset pagination
      setIncompleteTasksLimit(10);
      setCompletedTasksLimit(5);
      fetchTasks();
      
      // Check if refresh value has changed since we last saw it
      if (refresh !== undefined && refresh !== lastSeenRefresh.current) {
        lastSeenRefresh.current = refresh;
      }
    }
  }, [isOpen, refresh]);

  // Update tasks when limits change (for Show More functionality)
  useEffect(() => {
    if (isOpen && (incompleteTasksLimit > 10 || completedTasksLimit > 5)) {
      fetchTasks(false); // Don't reset, append new tasks
    }
  }, [incompleteTasksLimit, completedTasksLimit]);

  const fetchTasks = async (reset = true) => {
    if (reset) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      const params = new URLSearchParams({
        incompleteLimit: incompleteTasksLimit.toString(),
        completedLimit: completedTasksLimit.toString()
      });
      
      const response = await fetch(`/api/tasks/all?${params}`);
      const result = await response.json();
      
      if (result.success) {
        if (reset) {
          setTasks(result.data);
        } else {
          // Append new tasks to existing ones
          setTasks(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const newTasks = result.data.filter((t: TaskItem) => !existingIds.has(t.id));
            return [...prev, ...newTasks];
          });
        }
      } else {
        setError(result.error || 'Failed to fetch tasks');
      }
    } catch (err) {
      setError('Failed to fetch tasks');
      console.error('Error fetching tasks:', err);
    } finally {
      if (reset) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
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
        setTasks(prev => prev.filter(task => !selectedTasks.has(task.id)));
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

  const handleContinueTask = (task: TaskItem) => {
    if (onContinueTask) {
      onContinueTask(task);
      onClose();
    }
  };

  // Step management handlers
  const addTaskStep = async (taskId: string) => {
    const content = newStepInputs[taskId]?.trim();
    if (!content) return;

    setLoadingSteps(prev => new Set([...prev, taskId]));
    try {
      const response = await fetch(`/api/tasks/${taskId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      const result = await response.json();
      if (result.success) {
        // Update the task steps in state
        setTasks(prev => prev.map(task => {
          if (task.id === taskId) {
            return { ...task, steps: [...task.steps, result.data] };
          }
          return task;
        }));
        
        // Clear input
        setNewStepInputs(prev => ({ ...prev, [taskId]: '' }));
      } else {
        setError(result.error || 'Failed to add step');
      }
    } catch (err) {
      setError('Failed to add step');
      console.error('Error adding step:', err);
    } finally {
      setLoadingSteps(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  const toggleStepDone = async (taskId: string, stepId: string) => {
    setLoadingSteps(prev => new Set([...prev, stepId]));
    try {
      const response = await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
        method: 'PUT'
      });

      const result = await response.json();
      if (result.success) {
        // Update the step status in state
        setTasks(prev => prev.map(task => {
          if (task.id === taskId) {
            return {
              ...task,
              steps: task.steps.map(step => 
                step.id === stepId ? { ...step, done: !step.done } : step
              )
            };
          }
          return task;
        }));
      } else {
        setError(result.error || 'Failed to update step');
      }
    } catch (err) {
      setError('Failed to update step');
      console.error('Error updating step:', err);
    } finally {
      setLoadingSteps(prev => {
        const newSet = new Set(prev);
        newSet.delete(stepId);
        return newSet;
      });
    }
  };

  const startEditingStep = (stepId: string, currentContent: string) => {
    setEditingSteps(prev => new Set([...prev, stepId]));
    setEditStepValues(prev => ({ ...prev, [stepId]: currentContent }));
  };

  const cancelEditingStep = (stepId: string) => {
    setEditingSteps(prev => {
      const newSet = new Set(prev);
      newSet.delete(stepId);
      return newSet;
    });
    setEditStepValues(prev => {
      const { [stepId]: _, ...rest } = prev;
      return rest;
    });
  };

  const saveStepEdit = async (taskId: string, stepId: string) => {
    const content = editStepValues[stepId]?.trim();
    if (!content) return;

    setLoadingSteps(prev => new Set([...prev, stepId]));
    try {
      const response = await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      const result = await response.json();
      if (result.success) {
        // Update the step content in state
        setTasks(prev => prev.map(task => {
          if (task.id === taskId) {
            return {
              ...task,
              steps: task.steps.map(step => 
                step.id === stepId ? { ...step, content } : step
              )
            };
          }
          return task;
        }));
        
        // Exit edit mode
        cancelEditingStep(stepId);
      } else {
        setError(result.error || 'Failed to update step');
      }
    } catch (err) {
      setError('Failed to update step');
      console.error('Error updating step:', err);
    } finally {
      setLoadingSteps(prev => {
        const newSet = new Set(prev);
        newSet.delete(stepId);
        return newSet;
      });
    }
  };

  const deleteStep = async (taskId: string, stepId: string) => {
    setLoadingSteps(prev => new Set([...prev, stepId]));
    try {
      const response = await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        // Remove the step from state
        setTasks(prev => prev.map(task => {
          if (task.id === taskId) {
            return {
              ...task,
              steps: task.steps.filter(step => step.id !== stepId)
            };
          }
          return task;
        }));
      } else {
        setError(result.error || 'Failed to delete step');
      }
    } catch (err) {
      setError('Failed to delete step');
      console.error('Error deleting step:', err);
    } finally {
      setLoadingSteps(prev => {
        const newSet = new Set(prev);
        newSet.delete(stepId);
        return newSet;
      });
    }
  };

  const incompleteTasks = tasks.filter(task => task.status !== 'completed');
  const completedTasks = tasks.filter(task => task.status === 'completed');
  const displayTasks = activeTab === 'incomplete' ? incompleteTasks : completedTasks;
  
  // Function to load more tasks
  const loadMoreTasks = () => {
    if (activeTab === 'incomplete') {
      setIncompleteTasksLimit(prev => prev + 10);
    } else {
      setCompletedTasksLimit(prev => prev + 5);
    }
    // The useEffect will trigger fetchTasks(false) when limits change
  };
  
  // Determine if we should show "Show More" button
  // We'll show it if we have exactly the limit number of tasks (suggesting there might be more)
  const shouldShowLoadMore = activeTab === 'incomplete' 
    ? incompleteTasks.length >= incompleteTasksLimit
    : completedTasks.length >= completedTasksLimit;

  // Select All functionality
  const toggleSelectAll = () => {
    const currentTaskIds = displayTasks.map(task => task.id);
    const allCurrentSelected = currentTaskIds.every(id => selectedTasks.has(id));
    
    if (allCurrentSelected) {
      // Deselect all current tasks
      setSelectedTasks(prev => {
        const newSet = new Set(prev);
        currentTaskIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all current tasks
      setSelectedTasks(prev => new Set([...prev, ...currentTaskIds]));
    }
  };
  
  // Check if all current tasks are selected
  const currentTaskIds = displayTasks.map(task => task.id);
  const allCurrentSelected = currentTaskIds.length > 0 && currentTaskIds.every(id => selectedTasks.has(id));
  const someCurrentSelected = currentTaskIds.some(id => selectedTasks.has(id));
  const selectedCurrentCount = currentTaskIds.filter(id => selectedTasks.has(id)).length;

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
        <div className="w-screen max-w-lg">
          <div className="h-full flex flex-col bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <TrophyIcon className="w-5 h-5 mr-2" />
                  Task Manager
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
              
              {/* Tab Navigation */}
              <div className="mt-4 flex bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('incomplete')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${
                    activeTab === 'incomplete' 
                      ? 'bg-white text-blue-600' 
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                  Incomplete ({incompleteTasks.length})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${
                    activeTab === 'completed' 
                      ? 'bg-white text-blue-600' 
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <CheckCircleIcon className="w-4 h-4 mr-1" />
                  Completed ({completedTasks.length})
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="p-6 text-center">
                  <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4 text-red-400 opacity-50" />
                  <p className="text-red-600 dark:text-red-400 font-medium mb-2">Unable to Load Tasks</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                  <button 
                    onClick={() => fetchTasks()}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <ArrowPathIcon className="w-4 h-4 mr-2" />
                    Try Again
                  </button>
                </div>
              ) : displayTasks.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <TrophyIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-xl font-medium mb-2 text-gray-700 dark:text-gray-300">
                    {activeTab === 'incomplete' ? 'No tasks yet!' : 'No completed tasks yet'}
                  </p>
                  <p className="text-sm mb-4">
                    {activeTab === 'incomplete' 
                      ? 'Start building your focus habit by creating your first task. Close this panel and use the form on the main page to get started.'
                      : 'Complete your first focus session to see your achievements here!'
                    }
                  </p>
                  {activeTab === 'incomplete' && (
                    <div className="text-xs text-gray-400">
                      <p>💡 Tip: Tasks with steps help you stay focused and make progress visible</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {/* Select All Header */}
                  {displayTasks.length > 0 && (
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-600">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={allCurrentSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someCurrentSelected && !allCurrentSelected;
                          }}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {allCurrentSelected 
                            ? `All ${displayTasks.length} selected`
                            : someCurrentSelected 
                            ? `${selectedCurrentCount} of ${displayTasks.length} selected`
                            : `Select all ${displayTasks.length} tasks`
                          }
                        </span>
                      </div>
                      {someCurrentSelected && (
                        <button
                          onClick={() => setSelectedTasks(new Set())}
                          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        >
                          Clear selection
                        </button>
                      )}
                    </div>
                  )}
                  
                  {displayTasks.map((task) => {
                    const statusInfo = getTaskStatusInfo(task);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <div 
                        key={task.id}
                        className={`rounded-xl overflow-hidden border ${statusInfo.bgColor} ${statusInfo.borderColor}`}
                      >
                        {/* Task Header */}
                        <div className="flex items-center p-4">
                          <input
                            type="checkbox"
                            checked={selectedTasks.has(task.id)}
                            onChange={() => toggleTaskSelection(task.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mr-3"
                          />
                          
                          {/* Clickable area for expansion */}
                          <div 
                            onClick={() => toggleTaskExpansion(task.id)}
                            className="flex-1 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-lg p-2 -m-2 cursor-pointer"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center mb-1">
                                  <StatusIcon className={`w-4 h-4 mr-2 ${statusInfo.color}`} />
                                  <h3 className="font-semibold text-gray-900 dark:text-white text-base truncate">
                                    {task.title}
                                  </h3>
                                </div>
                                
                                {/* Progress Bar for Incomplete Tasks */}
                                {task.status !== 'completed' && task.progressPercentage > 0 && (
                                  <div className="mb-2">
                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                      <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${task.progressPercentage}%` }}
                                      ></div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {Math.round(task.progressPercentage)}% complete
                                    </p>
                                  </div>
                                )}
                                
                                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                  <div className="flex items-center">
                                    <PlayIcon className="w-4 h-4 mr-1" />
                                    {task.stats.totalSessions} sessions
                                  </div>
                                  {task.stats.totalFocusTime > 0 && (
                                    <div className="flex items-center">
                                      <ClockIcon className="w-4 h-4 mr-1" />
                                      {formatDuration(task.stats.totalFocusTime)}
                                    </div>
                                  )}
                                  {task.stats.lastSessionDate && (
                                    <div className="flex items-center">
                                      <CalendarDaysIcon className="w-4 h-4 mr-1" />
                                      {formatDate(task.stats.lastSessionDate)}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Last Stop Reason for Incomplete Tasks */}
                                {task.lastStopReason && task.status !== 'completed' && (
                                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 italic">
                                    Last stopped: {task.lastStopReason}
                                  </p>
                                )}
                              </div>
                              
                              <div className="ml-3 flex-shrink-0 flex items-center space-x-2">
                                {expandedTasks.has(task.id) ? (
                                  <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                                ) : (
                                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Continue Button for Incomplete Tasks - Outside the clickable area */}
                          {task.status !== 'completed' && onContinueTask && (
                            <button
                              onClick={() => handleContinueTask(task)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center ml-2"
                            >
                              <ArrowPathIcon className="w-3 h-3 mr-1" />
                              Continue
                            </button>
                          )}
                        </div>

                        {/* Expanded Content */}
                        {expandedTasks.has(task.id) && (
                          <div className="border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                            {/* Task Steps */}
                            <div className="p-4 border-b border-gray-200 dark:border-gray-600">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Task Steps</h4>
                                {activeTab === 'incomplete' && (
                                  <button
                                    onClick={() => {
                                      const currentInput = newStepInputs[task.id] || '';
                                      if (!currentInput) {
                                        setNewStepInputs(prev => ({ ...prev, [task.id]: '' }));
                                        // Focus the input field
                                        setTimeout(() => {
                                          const input = document.getElementById(`step-input-${task.id}`);
                                          input?.focus();
                                        }, 0);
                                      }
                                    }}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center"
                                  >
                                    <PlusIcon className="w-4 h-4 mr-1" />
                                    Add Step
                                  </button>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                {task.steps.map((step) => (
                                  <div key={step.id} className="flex items-center space-x-2 text-sm group">
                                    <button
                                      onClick={() => toggleStepDone(task.id, step.id)}
                                      disabled={loadingSteps.has(step.id)}
                                      className="flex-shrink-0 hover:scale-110 transition-transform"
                                    >
                                      {step.done ? (
                                        <CheckIcon className="w-4 h-4 text-green-500" />
                                      ) : (
                                        <XMarkIcon className="w-4 h-4 text-gray-400 hover:text-blue-500" />
                                      )}
                                    </button>
                                    
                                    {editingSteps.has(step.id) ? (
                                      <div className="flex-1 flex items-center space-x-2">
                                        <input
                                          type="text"
                                          value={editStepValues[step.id] || ''}
                                          onChange={(e) => setEditStepValues(prev => ({ 
                                            ...prev, 
                                            [step.id]: e.target.value 
                                          }))}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              saveStepEdit(task.id, step.id);
                                            } else if (e.key === 'Escape') {
                                              cancelEditingStep(step.id);
                                            }
                                          }}
                                          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => saveStepEdit(task.id, step.id)}
                                          disabled={loadingSteps.has(step.id)}
                                          className="text-green-600 hover:text-green-800 transition-colors"
                                        >
                                          <CheckIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => cancelEditingStep(step.id)}
                                          className="text-gray-600 hover:text-gray-800 transition-colors"
                                        >
                                          <XMarkIcon className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <span className={`flex-1 ${step.done ? 'text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                                          {step.content}
                                        </span>
                                        {activeTab === 'incomplete' && (
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                            <button
                                              onClick={() => startEditingStep(step.id, step.content)}
                                              className="text-gray-400 hover:text-blue-500 transition-colors"
                                            >
                                              <PencilIcon className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => deleteStep(task.id, step.id)}
                                              disabled={loadingSteps.has(step.id)}
                                              className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                              <TrashIcon className="w-3 h-3" />
                                            </button>
                                          </div>
                                        )}
                                      </>
                                    )}
                                    
                                    {loadingSteps.has(step.id) && (
                                      <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                                    )}
                                  </div>
                                ))}
                                
                                {task.steps.length === 0 && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                                    No steps yet. Add your first step above!
                                  </p>
                                )}
                                
                                {/* Add new step input */}
                                {activeTab === 'incomplete' && newStepInputs[task.id] !== undefined && (
                                  <div className="flex items-center space-x-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <input
                                      id={`step-input-${task.id}`}
                                      type="text"
                                      value={newStepInputs[task.id] || ''}
                                      onChange={(e) => setNewStepInputs(prev => ({ 
                                        ...prev, 
                                        [task.id]: e.target.value 
                                      }))}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          addTaskStep(task.id);
                                        } else if (e.key === 'Escape') {
                                          setNewStepInputs(prev => {
                                            const { [task.id]: _, ...rest } = prev;
                                            return rest;
                                          });
                                        }
                                      }}
                                      placeholder="Enter new step..."
                                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                      onClick={() => addTaskStep(task.id)}
                                      disabled={loadingSteps.has(task.id) || !newStepInputs[task.id]?.trim()}
                                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                                    >
                                      {loadingSteps.has(task.id) ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      ) : (
                                        <>Add</>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setNewStepInputs(prev => {
                                        const { [task.id]: _, ...rest } = prev;
                                        return rest;
                                      })}
                                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                    >
                                      <XMarkIcon className="w-5 h-5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            
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
                                          {session.distractions && session.distractions.length > 0 && (
                                            <div className="mt-2">
                                              <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">
                                                "Not Now" comments ({session.distractions.length}):
                                              </p>
                                              <div className="space-y-1">
                                                {session.distractions.map((distraction) => (
                                                  <p key={distraction.id} className="text-xs text-gray-600 dark:text-gray-400 italic pl-2 border-l-2 border-orange-200 dark:border-orange-700">
                                                    "{distraction.content}"
                                                  </p>
                                                ))}
                                              </div>
                                            </div>
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
                    );
                  })}
                  
                  {/* Show More Button */}
                  {shouldShowLoadMore && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={loadMoreTasks}
                        disabled={isLoadingMore}
                        className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center mx-auto disabled:opacity-50"
                      >
                        {isLoadingMore ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                            Loading...
                          </>
                        ) : (
                          <>
                            Show More
                            <ChevronDownIcon className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
