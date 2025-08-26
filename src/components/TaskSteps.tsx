'use client';

import React, { useState } from 'react';
import { TaskStep } from '@/types';
import { 
  CheckCircleIcon, 
  CircleStackIcon, 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

interface TaskStepsProps {
  steps: TaskStep[];
  onToggleStep: (stepId: string) => void;
  onAddStep?: (content: string) => void;
  onEditStep?: (stepId: string, content: string) => void;
  onDeleteStep?: (stepId: string) => void;
  onGenerateSteps?: () => void;
  readonly?: boolean;
  taskId?: string;
  taskTitle?: string;
  taskDescription?: string;
  isGeneratingSteps?: boolean;
}

export default function TaskSteps({ 
  steps, 
  onToggleStep, 
  onAddStep, 
  onEditStep, 
  onDeleteStep, 
  onGenerateSteps,
  readonly = false, 
  taskId,
  taskTitle,
  taskDescription,
  isGeneratingSteps = false
}: TaskStepsProps) {
  const [newStepInput, setNewStepInput] = useState('');
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepValue, setEditingStepValue] = useState('');
  
  const completedSteps = steps.filter(step => step.done).length;
  const nextStep = steps.find(step => !step.done);

  const handleAddStep = () => {
    if (!newStepInput.trim() || !onAddStep) return;
    onAddStep(newStepInput.trim());
    setNewStepInput('');
  };

  const startEditingStep = (step: TaskStep) => {
    setEditingStepId(step.id);
    setEditingStepValue(step.content);
  };

  const cancelEditingStep = () => {
    setEditingStepId(null);
    setEditingStepValue('');
  };

  const saveEditingStep = () => {
    if (!editingStepValue.trim() || !onEditStep || !editingStepId) return;
    onEditStep(editingStepId, editingStepValue.trim());
    cancelEditingStep();
  };

  const handleDeleteStep = (stepId: string) => {
    if (!onDeleteStep) return;
    onDeleteStep(stepId);
  };

  return (
    <div className="w-full">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <CircleStackIcon className="w-4 h-4 mr-2" />
          <span>Progress: {completedSteps}/{steps.length} steps</span>
        </div>
        <div className="text-sm text-gray-500">
          {steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0}% complete
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${steps.length > 0 ? (completedSteps / steps.length) * 100 : 0}%` }}
        />
      </div>

      {/* Current/next step highlight */}
      {nextStep && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
            Next step:
          </div>
          <div className="text-blue-700 dark:text-blue-300">
            {nextStep.content}
          </div>
          {!readonly && (
            <button
              onClick={() => onToggleStep(nextStep.id)}
              className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
            >
              ✓ Mark as complete
            </button>
          )}
        </div>
      )}

      {/* All steps list */}
      <div className="space-y-2 mb-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center p-3 rounded-lg transition-all group ${
              step.done
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : step === nextStep
                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <button
              onClick={() => !readonly && onToggleStep(step.id)}
              disabled={readonly}
              className={`mr-3 transition-colors ${
                readonly ? 'cursor-default' : 'cursor-pointer hover:scale-105'
              }`}
            >
              {step.done ? (
                <CheckCircleIconSolid className="w-5 h-5 text-green-500" />
              ) : (
                <CheckCircleIcon className="w-5 h-5 text-gray-400 hover:text-blue-500" />
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
                      saveEditingStep();
                    } else if (e.key === 'Escape') {
                      cancelEditingStep();
                    }
                  }}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={saveEditingStep}
                  className="text-green-600 hover:text-green-800 transition-colors"
                >
                  <CheckCircleIconSolid className="w-4 h-4" />
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
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <span className="text-xs font-medium text-gray-500 mr-2">
                      Step {index + 1}
                    </span>
                    {step === nextStep && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-sm ${
                      step.done
                        ? 'text-green-700 dark:text-green-300 line-through'
                        : step === nextStep
                        ? 'text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {step.content}
                  </div>
                </div>
                
                {!readonly && (onEditStep || onDeleteStep) && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                    {onEditStep && (
                      <button
                        onClick={() => startEditingStep(step)}
                        className="text-gray-400 hover:text-blue-500 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    {onDeleteStep && (
                      <button
                        onClick={() => handleDeleteStep(step.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new step - Show during active sessions */}
      {!readonly && onAddStep && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="text"
              value={newStepInput}
              onChange={(e) => setNewStepInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddStep();
                }
              }}
              placeholder="Add a new step..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddStep}
                disabled={!newStepInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center flex-1 sm:flex-initial justify-center"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add
              </button>
              {/* Generate Next Steps button - only show if there are completed steps */}
              {onGenerateSteps && steps.some(step => step.done) && (
                <button
                  onClick={onGenerateSteps}
                  disabled={isGeneratingSteps}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center flex-1 sm:flex-initial justify-center whitespace-nowrap"
                >
                  <SparklesIcon className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">{isGeneratingSteps ? 'Generating...' : 'Generate Next Steps'}</span>
                  <span className="sm:hidden">{isGeneratingSteps ? '...' : 'Generate'}</span>
                </button>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            💡 Break down your task further as you work or use AI to generate next steps based on completed ones
          </div>
        </div>
      )}

      {/* Empty state for no steps */}
      {steps.length === 0 && !readonly && onAddStep && (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <CircleStackIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No steps yet. Add your first step above!</p>
        </div>
      )}

      {/* Completion celebration */}
      {completedSteps === steps.length && steps.length > 0 && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
          <div className="text-2xl mb-2">🎉</div>
          <div className="text-green-800 dark:text-green-200 font-semibold">
            All steps completed!
          </div>
          <div className="text-sm text-green-600 dark:text-green-400 mt-1">
            Great job breaking this task down and following through!
          </div>
        </div>
      )}
    </div>
  );
}
