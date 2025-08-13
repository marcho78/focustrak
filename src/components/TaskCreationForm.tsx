'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskStep } from '@/types';
import ValidationModal from '@/components/ValidationModal';
import { 
  PlayIcon, 
  PlusIcon, 
  CheckIcon, 
  XMarkIcon, 
  PencilIcon, 
  TrashIcon,
  SparklesIcon
} from '@heroicons/react/24/solid';

interface TaskCreationFormProps {
  task?: Task;
  onStart: (task: Task) => void;
  onUpdateTask?: (task: Task) => void;
  isLoading?: boolean;
  disabled?: boolean;
}


export default function TaskCreationForm({
  task: existingTask,
  onStart,
  onUpdateTask,
  isLoading = false,
  disabled = false,
}: TaskCreationFormProps) {
  const [taskTitle, setTaskTitle] = useState(existingTask?.title || '');
  const [taskDescription, setTaskDescription] = useState(existingTask?.description || '');
  const [steps, setSteps] = useState<TaskStep[]>(existingTask?.steps || []);
  const [newStepInput, setNewStepInput] = useState('');
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepValue, setEditingStepValue] = useState('');
  const [showForm, setShowForm] = useState(!existingTask);
  const [useAiBreakdown, setUseAiBreakdown] = useState(false);
  const [isGeneratingSteps, setIsGeneratingSteps] = useState(false);
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    title: '',
    message: ''
  });


  const createTask = (customSteps?: TaskStep[]): Task => {
    return {
      id: existingTask?.id || `temp-${Date.now()}`,
      userId: 'current-user',
      title: taskTitle.trim(),
      description: taskDescription.trim() || undefined,
      status: 'pending',
      priority: 2,
      createdAt: existingTask?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedSessions: 1,
      totalTimeSpent: existingTask?.totalTimeSpent || 0,
      steps: customSteps || steps,
    };
  };

  const handleStart = async () => {
    if (!taskTitle.trim()) return;
    
    // Check if we need steps
    let stepsToUse = steps;
    
    // If AI breakdown is enabled and we don't have steps yet, generate them first
    if (useAiBreakdown && steps.length === 0) {
      const generatedSteps = await handleGenerateAiSteps();
      
      if (!generatedSteps || generatedSteps.length === 0) {
        // If AI generation failed, don't start (handleGenerateAiSteps shows its own error)
        return;
      }
      stepsToUse = generatedSteps;
    } else if (!useAiBreakdown && steps.length === 0) {
      // If AI is not enabled, require at least one manual step
      setValidationModal({
        isOpen: true,
        title: 'No Steps Added',
        message: 'Please add at least one step to your task before starting.'
      });
      return;
    }
    
    // Create and start the task with the appropriate steps
    const task = createTask(stepsToUse);
    onStart(task);
  };

  const handleAddStep = () => {
    if (!newStepInput.trim()) return;
    
    const newStep: TaskStep = {
      id: `temp-step-${Date.now()}`,
      taskId: existingTask?.id || 'temp',
      content: newStepInput.trim(),
      done: false,
      orderIndex: steps.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updatedSteps = [...steps, newStep];
    setSteps(updatedSteps);
    setNewStepInput('');

    // Update existing task if provided
    if (existingTask && onUpdateTask) {
      const updatedTask = { ...existingTask, steps: updatedSteps };
      onUpdateTask(updatedTask);
    }
  };

  const handleDeleteStep = (stepId: string) => {
    const updatedSteps = steps.filter(step => step.id !== stepId);
    setSteps(updatedSteps);

    if (existingTask && onUpdateTask) {
      const updatedTask = { ...existingTask, steps: updatedSteps };
      onUpdateTask(updatedTask);
    }
  };

  const handleEditStep = (stepId: string, newContent: string) => {
    const updatedSteps = steps.map(step =>
      step.id === stepId ? { ...step, content: newContent.trim() } : step
    );
    setSteps(updatedSteps);
    setEditingStepId(null);
    setEditingStepValue('');

    if (existingTask && onUpdateTask) {
      const updatedTask = { ...existingTask, steps: updatedSteps };
      onUpdateTask(updatedTask);
    }
  };

  const handleToggleStepDone = (stepId: string) => {
    const updatedSteps = steps.map(step =>
      step.id === stepId ? { ...step, done: !step.done } : step
    );
    setSteps(updatedSteps);

    if (existingTask && onUpdateTask) {
      const updatedTask = { ...existingTask, steps: updatedSteps };
      onUpdateTask(updatedTask);
    }
  };

  const startEditingStep = (step: TaskStep) => {
    setEditingStepId(step.id);
    setEditingStepValue(step.content);
  };

  const cancelEditingStep = () => {
    setEditingStepId(null);
    setEditingStepValue('');
  };


  const handleGenerateAiSteps = async (): Promise<TaskStep[] | null> => {
    if (!taskTitle.trim()) return null;
    
    setIsGeneratingSteps(true);
    try {
      const response = await fetch('/api/tasks/breakdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskTitle: taskTitle,
          taskDescription: taskDescription || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI breakdown');
      }

      const data = await response.json();
      const aiSteps: string[] = data.data;
      
      const generatedSteps: TaskStep[] = aiSteps.map((content, index) => ({
        id: `temp-step-${Date.now()}-${index}`,
        taskId: existingTask?.id || 'temp',
        content,
        done: false,
        orderIndex: steps.length + index,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const updatedSteps = [...steps, ...generatedSteps];
      setSteps(updatedSteps);

      if (existingTask && onUpdateTask) {
        const updatedTask = { ...existingTask, steps: updatedSteps };
        onUpdateTask(updatedTask);
      }
      
      return generatedSteps;
    } catch (error) {
      console.error('Error generating AI steps:', error);
      // Show error to user
      setValidationModal({
        isOpen: true,
        title: 'AI Generation Failed',
        message: 'Unable to generate task breakdown at this time. The AI service may be experiencing high load. Please try again in a moment or add steps manually.'
      });
      return null;
    } finally {
      setIsGeneratingSteps(false);
    }
  };

  // Quick start view for existing task
  if (existingTask && !showForm) {
    return (
      <div className="flex flex-col items-center space-y-6 w-full max-w-md mx-auto">
        {/* Main Start Button */}
        <button
          onClick={handleStart}
          disabled={disabled || isLoading}
          className={`relative w-full h-24 rounded-2xl shadow-lg transition-all duration-200 flex items-center justify-center text-2xl font-semibold ${
            !disabled && !isLoading
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-xl transform hover:scale-105'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-3"></div>
              Starting...
            </div>
          ) : (
            <div className="flex items-center">
              <PlayIcon className="w-8 h-8 mr-3" />
              Start: {existingTask.title}
            </div>
          )}
          
          {!disabled && !isLoading && (
            <div className="absolute inset-0 rounded-2xl bg-blue-600 opacity-30 animate-pulse"></div>
          )}
        </button>

        {/* Task Preview */}
        <div className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Current Task
            </h3>
            <button
              onClick={() => setShowForm(true)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-2">{existingTask.title}</p>
          
          {steps.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Steps ({steps.filter(s => s.done).length}/{steps.length} complete):
              </p>
              {steps.slice(0, 3).map((step) => (
                <div
                  key={step.id}
                  className={`text-sm flex items-center ${
                    step.done
                      ? 'text-gray-500 line-through'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${
                    step.done ? 'bg-green-500' : 'bg-blue-500'
                  }`}></span>
                  {step.content}
                </div>
              ))}
              {steps.length > 3 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ...and {steps.length - 3} more steps
                </p>
              )}
            </div>
          )}
        </div>

        {/* New Task Button */}
        <button
          onClick={() => {
            setTaskTitle('');
            setTaskDescription('');
            setSteps([]);
            setShowForm(true);
          }}
          disabled={disabled || isLoading}
          className="flex items-center px-6 py-3 text-gray-600 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 hover:text-gray-700 dark:hover:border-gray-500 dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create New Task
        </button>
      </div>
    );
  }

  // Task creation/editing form
  return (
    <div className="flex flex-col space-y-6 w-full max-w-lg mx-auto">
      {/* Task Title Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          What do you want to work on?
        </label>
        <input
          type="text"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          placeholder="Enter your task..."
          className="w-full px-4 py-3 text-lg rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          autoFocus={!existingTask}
        />
      </div>

      {/* Task Description Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description (optional)
        </label>
        <textarea
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          placeholder="Add more details..."
          rows={2}
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none"
        />
      </div>

      {/* AI Breakdown Toggle */}
      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <div className="flex items-center">
            <input
              id="ai-breakdown"
              type="checkbox"
              checked={useAiBreakdown}
              onChange={(e) => {
                setUseAiBreakdown(e.target.checked);
                if (!e.target.checked && steps.length > 0) {
                  // Clear existing steps when disabling AI breakdown
                  setSteps([]);
                }
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label htmlFor="ai-breakdown" className="block text-sm font-medium text-blue-900 dark:text-blue-100 cursor-pointer">
              <SparklesIcon className="w-4 h-4 inline mr-1" />
              AI-Powered Task Breakdown
            </label>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Let AI analyze your task and create 3-5 actionable steps designed to help you overcome procrastination and build momentum.
            </p>
          </div>
        </div>
      </div>

      {/* Steps Section */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900 dark:text-white">Task Steps</h3>
          {steps.length === 0 && taskTitle.trim() && useAiBreakdown && (
            <button
              onClick={handleGenerateAiSteps}
              disabled={isGeneratingSteps}
              className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50"
            >
              {isGeneratingSteps ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4 mr-1" />
                  Generate AI Steps
                </>
              )}
            </button>
          )}
        </div>

        {/* Existing Steps */}
        <div className="space-y-2 mb-3">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center space-x-2 p-2 bg-white dark:bg-gray-700 rounded-lg group">
              <button
                onClick={() => handleToggleStepDone(step.id)}
                className="flex-shrink-0 hover:scale-110 transition-transform"
              >
                {step.done ? (
                  <CheckIcon className="w-4 h-4 text-green-500" />
                ) : (
                  <XMarkIcon className="w-4 h-4 text-gray-400 hover:text-blue-500" />
                )}
              </button>
              
              {editingStepId === step.id ? (
                <div className="flex-1 flex items-center space-x-2">
                  <input
                    type="text"
                    value={editingStepValue}
                    onChange={(e) => setEditingStepValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleEditStep(step.id, editingStepValue);
                      } else if (e.key === 'Escape') {
                        cancelEditingStep();
                      }
                    }}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={() => handleEditStep(step.id, editingStepValue)}
                    className="text-green-600 hover:text-green-800 transition-colors"
                  >
                    <CheckIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelEditingStep}
                    className="text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className={`flex-1 text-sm ${
                    step.done ? 'text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {step.content}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                    <button
                      onClick={() => startEditingStep(step)}
                      className="text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <PencilIcon className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteStep(step.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add New Step */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newStepInput}
            onChange={(e) => setNewStepInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddStep();
              }
            }}
            placeholder="Add a step..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddStep}
            disabled={!newStepInput.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>

        {steps.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-3">
            {useAiBreakdown 
              ? '🤖 Click "Generate AI Steps" above to get AI-powered task breakdown'
              : '✨ Enable AI breakdown above or add steps manually'
            }
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={handleStart}
          disabled={!taskTitle.trim() || isLoading || disabled || isGeneratingSteps}
          className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isLoading || isGeneratingSteps ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              {isGeneratingSteps ? 'Generating Steps...' : 'Starting...'}
            </>
          ) : (
            <>
              <PlayIcon className="w-5 h-5 mr-2" />
              Start Focus Session
            </>
          )}
        </button>
        
        {existingTask && (
          <button
            onClick={() => setShowForm(false)}
            className="px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Help Text */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        <p>🎯 Start your {Math.floor((25 * 60) / 60)}-minute focus session</p>
        <p className="mt-1">✨ Break tasks into small, actionable steps for better focus</p>
      </div>

      {/* Validation Modal */}
      <ValidationModal
        isOpen={validationModal.isOpen}
        onClose={() => setValidationModal({ ...validationModal, isOpen: false })}
        title={validationModal.title}
        message={validationModal.message}
      />
    </div>
  );
}
