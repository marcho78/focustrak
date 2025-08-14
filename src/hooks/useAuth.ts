'use client';

import { useState, useEffect } from 'react';

interface User {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  [key: string]: any;
}

interface UseUserReturn {
  user: User | undefined;
  error: Error | undefined;
  isLoading: boolean;
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else if (response.status === 401) {
          // User is not authenticated
          setUser(undefined);
        } else {
          throw new Error('Failed to fetch user');
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, error, isLoading };
}