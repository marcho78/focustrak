'use client';

import { useUser } from '@/hooks/useAuth';
import LoginButton from '@/components/auth/LoginButton';
import UserProfile from '@/components/auth/UserProfile';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  onOpenSettings?: () => void;
}

export default function Header({ onOpenSettings }: HeaderProps) {
  const { user } = useUser();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and title */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Focus
            </h1>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              Start sooner, stay focused, finish on time
            </span>
          </div>

          {/* Right side - auth and settings */}
          <div className="flex items-center space-x-4">
            {user && onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Settings"
              >
                <Cog6ToothIcon className="w-6 h-6" />
              </button>
            )}
            
            {user && <UserProfile />}
            <LoginButton />
          </div>
        </div>
      </div>
    </header>
  );
}