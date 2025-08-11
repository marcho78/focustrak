'use client';

import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { StopIcon } from '@heroicons/react/24/solid';

interface StopReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmStop: (reason?: string) => void;
}

export default function StopReasonModal({
  isOpen,
  onClose,
  onConfirmStop,
}: StopReasonModalProps) {
  const [reason, setReason] = useState('');
  const [selectedQuickReason, setSelectedQuickReason] = useState('');

  const quickReasons = [
    'Need to take a break',
    'Got interrupted by someone',
    'Task is harder than expected',
    'Feeling distracted today',
    'Emergency came up',
    'Lost motivation',
  ];

  const handleStop = () => {
    const finalReason = reason.trim() || selectedQuickReason;
    onConfirmStop(finalReason);
    setReason('');
    setSelectedQuickReason('');
  };

  const handleQuickReasonSelect = (quickReason: string) => {
    setSelectedQuickReason(quickReason);
    setReason(''); // Clear custom reason if selecting quick reason
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Stop Focus Session?
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                You still have time remaining. Mind sharing why?
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Quick reasons */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Common reasons:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {quickReasons.map((quickReason) => (
                  <button
                    key={quickReason}
                    onClick={() => handleQuickReasonSelect(quickReason)}
                    className={`p-3 text-sm text-left rounded-lg border transition-colors ${
                      selectedQuickReason === quickReason
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {quickReason}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom reason */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Or write your own:
              </p>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setSelectedQuickReason(''); // Clear quick reason if typing custom
                }}
                placeholder="What's pulling you away from focus? (optional)"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                rows={3}
              />
            </div>

            {/* Action buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleStop}
                className="flex-1 flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <StopIcon className="w-5 h-5 mr-2" />
                Stop Session
              </button>
              
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Keep Going
              </button>
            </div>

            {/* Encouragement */}
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                💪 <strong>Remember:</strong> Even stopping early is progress! You showed up and tried.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
