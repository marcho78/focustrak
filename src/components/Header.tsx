'use client';

import { useUser } from '@/hooks/useAuth';
import LoginButton from '@/components/auth/LoginButton';
import UserProfile from '@/components/auth/UserProfile';
import { Cog6ToothIcon, BellIcon, BellSlashIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid';
import { useSettings } from '@/hooks/useSettings';
import { useEffect, useState } from 'react';
import { notificationService } from '@/lib/notifications';

interface HeaderProps {
  onOpenSettings?: () => void;
}

export default function Header({ onOpenSettings }: HeaderProps) {
  const { user } = useUser();
  const { settings } = useSettings();
  const [notificationStatus, setNotificationStatus] = useState<'enabled' | 'disabled' | 'blocked'>('disabled');

  useEffect(() => {
    // Check notification status
    if (!notificationService.isBasicSupported()) {
      setNotificationStatus('disabled');
    } else if (settings.notificationsEnabled) {
      const permission = notificationService.getPermission();
      if (permission === 'granted') {
        setNotificationStatus('enabled');
      } else if (permission === 'denied') {
        setNotificationStatus('blocked');
      } else {
        setNotificationStatus('disabled');
      }
    } else {
      setNotificationStatus('disabled');
    }
  }, [settings.notificationsEnabled]);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and title */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold">
              <span className="text-blue-600 dark:text-blue-400">Focus</span>
              <span className="text-green-600 dark:text-green-400">Trak</span>
            </h1>
            <span className="ml-4 text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
              Start sooner, stay focused, finish on time
            </span>
          </div>

          {/* Right side - auth and settings */}
          <div className="flex items-center space-x-4">
            {/* Notification Status Indicator */}
            {user && (
              <button
                onClick={onOpenSettings}
                className="relative p-2 group"
                title={
                  notificationStatus === 'enabled' 
                    ? 'Notifications enabled' 
                    : notificationStatus === 'blocked'
                    ? 'Notifications blocked - Click to fix'
                    : 'Notifications disabled'
                }
              >
                {notificationStatus === 'enabled' ? (
                  <BellIconSolid className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : notificationStatus === 'blocked' ? (
                  <div className="relative">
                    <BellSlashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                  </div>
                ) : (
                  <BellSlashIcon className="w-5 h-5 text-gray-400 dark:text-gray-600" />
                )}
                
                {/* Tooltip */}
                <div className="absolute right-0 mt-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  {notificationStatus === 'enabled' 
                    ? '🔔 Notifications ON' 
                    : notificationStatus === 'blocked'
                    ? '⚠️ Blocked in browser'
                    : '🔕 Notifications OFF'}
                </div>
              </button>
            )}
            
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