import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  CheckCircleIcon,
  FireIcon,
  ClockIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

interface SessionCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueTask?: () => void;
  sessionDuration: number; // in seconds
  completedSteps?: number;
  totalSteps?: number;
  streak?: number;
  taskTitle?: string;
  isTaskComplete?: boolean;
}

export default function SessionCompleteModal({
  isOpen,
  onClose,
  onContinueTask,
  sessionDuration,
  completedSteps = 0,
  totalSteps = 0,
  streak = 0,
  taskTitle,
  isTaskComplete
}: SessionCompleteModalProps) {
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const isFullyComplete = isTaskComplete || (totalSteps > 0 && completedSteps === totalSteps);
  const remainingSteps = totalSteps - completedSteps;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    {isFullyComplete ? (
                      <CheckCircleIcon className="h-8 w-8 text-green-500 mr-3" />
                    ) : (
                      <ExclamationTriangleIcon className="h-8 w-8 text-orange-500 mr-3" />
                    )}
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      {isFullyComplete ? 'Task Complete! 🎉' : 'Time\'s Up! ⏰'}
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4">
                  {isFullyComplete ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-green-800">
                        🎉 Excellent work! You completed your task and focused for {formatDuration(sessionDuration)}.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-orange-800">
                        ⏰ Your focus session is complete ({formatDuration(sessionDuration)}), but you still have {remainingSteps} step{remainingSteps !== 1 ? 's' : ''} remaining.
                      </p>
                    </div>
                  )}

                  {taskTitle && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Task Worked On:</h4>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                        {taskTitle}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {totalSteps > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                        <CheckCircleIcon className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                        <p className="text-sm font-medium text-blue-900">
                          {completedSteps}/{totalSteps}
                        </p>
                        <p className="text-xs text-blue-700">Steps Completed</p>
                      </div>
                    )}

                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                      <FireIcon className="h-6 w-6 text-orange-500 mx-auto mb-1" />
                      <p className="text-sm font-medium text-orange-900">
                        {streak} Day{streak !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-orange-700">Current Streak</p>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                      <ClockIcon className="h-6 w-6 text-purple-500 mx-auto mb-1" />
                      <p className="text-sm font-medium text-purple-900">
                        {formatDuration(sessionDuration)}
                      </p>
                      <p className="text-xs text-purple-700">Focus Time</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  {!isFullyComplete && onContinueTask ? (
                    <div className="space-y-3">
                      <button
                        type="button"
                        className="w-full inline-flex justify-center items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
                        onClick={onContinueTask}
                      >
                        <PlayIcon className="h-4 w-4 mr-2" />
                        Continue Task ({remainingSteps} steps left)
                      </button>
                      <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 transition-colors"
                        onClick={onClose}
                      >
                        Take a Break
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 transition-colors"
                      onClick={onClose}
                    >
                      Awesome! 🎉
                    </button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
