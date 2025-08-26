'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  SparklesIcon, 
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  AdjustmentsHorizontalIcon,
  LightBulbIcon,
} from '@heroicons/react/24/solid';
import { aiCoachService, CoachAdvice } from '@/lib/ai-coach-service';
import { userBehaviorService } from '@/lib/user-behavior-service';

interface AICoachProps {
  isOpen: boolean;
  onClose: () => void;
  taskId?: string;
  taskTitle?: string;
  taskSteps?: Array<{ id: string; content: string; done: boolean }>;
  sessionActive?: boolean;
  onSuggestionApply?: (suggestion: string) => void;
}

export default function AICoach({ 
  isOpen,
  onClose,
  taskId, 
  taskTitle,
  taskSteps = [],
  sessionActive = false,
  onSuggestionApply 
}: AICoachProps) {
  const [advice, setAdvice] = useState<CoachAdvice | null>(null);
  const [chatOpen, setChatOpen] = useState(true); // Always open when modal is visible
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'coach'; message: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [coachEnabled, setCoachEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Level 1: Basic contextual advice
  useEffect(() => {
    if (!coachEnabled || !sessionActive) return;

    const getContextualAdvice = async () => {
      const context = userBehaviorService.getCurrentContext();
      const advice = await aiCoachService.getBasicAdvice({
        trigger: 'session_start',
        taskInfo: taskTitle ? {
          title: taskTitle,
          stepCount: taskSteps.length,
          complexity: taskSteps.length > 5 ? 'complex' : taskSteps.length > 2 ? 'moderate' : 'simple',
          steps: taskSteps,
          completedSteps: taskSteps.filter(s => s.done).length,
        } : undefined,
        patterns: context.patterns,
        mood: context.mood,
        timeContext: context.timeContext,
      });
      
      if (advice.confidence > 0.6) {
        setAdvice(advice);
      }
    };

    getContextualAdvice();
  }, [sessionActive, taskTitle, coachEnabled]);

  // Level 3: Predictive coaching
  useEffect(() => {
    if (!coachEnabled) return;

    const checkPredictive = async () => {
      const predictiveAdvice = await aiCoachService.getPredictiveAdvice();
      if (predictiveAdvice && predictiveAdvice.confidence > 0.7) {
        setAdvice(predictiveAdvice);
      }
    };

    const interval = setInterval(checkPredictive, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [coachEnabled]);

  // Level 2: Conversational interface
  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', message: userMessage }]);
    setIsLoading(true);

    try {
      const response = await aiCoachService.askCoach(userMessage, {
        taskInfo: taskTitle ? {
          title: taskTitle,
          stepCount: taskSteps.length,
          complexity: taskSteps.length > 5 ? 'complex' : taskSteps.length > 2 ? 'moderate' : 'simple',
          steps: taskSteps, // Pass full step details
          completedSteps: taskSteps.filter(s => s.done).length,
        } : undefined,
      });

      setChatHistory(prev => [...prev, { role: 'coach', message: response.message }]);
      
      if (response.suggestedAction) {
        setAdvice(response);
      }
    } catch (error) {
      setChatHistory(prev => [...prev, { 
        role: 'coach', 
        message: "I'm having trouble connecting right now. Try again in a moment." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Handle quick actions
  const handleQuickAction = async (action: string) => {
    const quickPrompts: Record<string, string> = {
      stuck: "I'm feeling stuck on this task",
      tired: "I'm feeling tired and losing focus",
      distracted: "I keep getting distracted",
      motivation: "I need some motivation",
      technique: "Suggest a focus technique for me",
    };

    if (quickPrompts[action]) {
      setChatInput(quickPrompts[action]);
      setChatOpen(true);
      await handleChatSubmit();
    }
  };

  if (!coachEnabled || !isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      {/* Modal Container */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Floating advice display - hide for now in modal */}
        {false && advice && !chatOpen && (
        <div className="fixed bottom-48 right-6 max-w-sm z-40 animate-fade-in-up">
          <div className={`
            p-4 rounded-lg shadow-lg backdrop-blur-sm
            ${advice?.type === 'celebration' ? 'bg-gradient-to-r from-green-500 to-green-600' : ''}
            ${advice?.type === 'warning' ? 'bg-gradient-to-r from-orange-500 to-orange-600' : ''}
            ${advice?.type === 'technique' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : ''}
            ${advice?.type === 'motivation' ? 'bg-gradient-to-r from-purple-500 to-purple-600' : ''}
            ${advice?.type === 'tip' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' : ''}
            text-white
          `}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <SparklesIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium leading-relaxed">
                    {advice?.message}
                  </p>
                  {advice?.suggestedAction && (
                    <button
                      onClick={() => onSuggestionApply?.(advice?.suggestedAction?.action || '')}
                      className="mt-2 text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
                    >
                      {advice?.suggestedAction?.label}
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => setAdvice(null)}
                className="ml-2 text-white/70 hover:text-white"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Chat interface - main modal content */}
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <SparklesIcon className="w-5 h-5" />
              <span className="font-medium">AI Focus Coach</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-white/80 hover:text-white"
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 border-b">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Coach Personality</label>
                  <select
                    className="mt-1 w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500"
                    onChange={(e) => aiCoachService.updatePersonality({ tone: e.target.value as any })}
                  >
                    <option value="supportive">Supportive</option>
                    <option value="energetic">Energetic</option>
                    <option value="calm">Calm</option>
                    <option value="direct">Direct</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    aiCoachService.clearHistory();
                    setChatHistory([]);
                  }}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear Chat History
                </button>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="bg-gray-50 dark:bg-gray-700 p-3 border-b flex space-x-2 overflow-x-auto">
            <button
              onClick={() => handleQuickAction('stuck')}
              className="text-xs bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
            >
              😔 I'm stuck
            </button>
            <button
              onClick={() => handleQuickAction('tired')}
              className="text-xs bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
            >
              😴 Feeling tired
            </button>
            <button
              onClick={() => handleQuickAction('distracted')}
              className="text-xs bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
            >
              🤯 Can't focus
            </button>
            <button
              onClick={() => handleQuickAction('motivation')}
              className="text-xs bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
            >
              💪 Need motivation
            </button>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatHistory.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                <LightBulbIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Hi! I'm your AI focus coach.</p>
                <p className="text-xs mt-2">Ask me anything about staying focused, beating procrastination, or improving productivity.</p>
              </div>
            )}
            
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <p className="text-sm">{msg.message}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleChatSubmit();
              }}
              className="flex space-x-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !chatInput.trim()}
                className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </form>
          </div>
      </div>
    </div>
  );
}