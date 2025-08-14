'use client';

import { useUser } from '@/hooks/useAuth';
import Link from 'next/link';

export default function LoginButton() {
  const { user, error, isLoading } = useUser();

  if (isLoading) {
    return (
      <button disabled className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed">
        Loading...
      </button>
    );
  }

  if (error) {
    return <div className="text-red-600">Error: {error.message}</div>;
  }

  if (user) {
    return (
      <Link
        href="/api/auth/logout"
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Logout
      </Link>
    );
  }

  return (
    <Link
      href="/api/auth/login"
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      Login
    </Link>
  );
}