'use client';

import { useUser } from '@/hooks/useAuth';
import { UserCircleIcon } from '@heroicons/react/24/outline';

export default function UserProfile() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3">
      {user.picture ? (
        <img
          src={user.picture}
          alt={user.name || 'User'}
          className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-700"
        />
      ) : (
        <UserCircleIcon className="w-10 h-10 text-gray-400" />
      )}
      <div className="hidden md:block">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {user.name || user.email}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {user.email}
        </p>
      </div>
    </div>
  );
}