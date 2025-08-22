/**
 * Utility functions for handling hydration mismatches and client-side rendering
 */

import React from 'react';

/**
 * Safe way to check if code is running on the client side
 */
export const isClientSide = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * Safe way to check if code is running on the server side
 */
export const isServerSide = (): boolean => {
  return typeof window === 'undefined';
};

/**
 * Get a value that's safe for hydration - returns serverValue during SSR and clientValue after hydration
 */
export const getHydrationSafeValue = <T,>(serverValue: T, clientValue: T): T => {
  if (isServerSide()) {
    return serverValue;
  }
  return clientValue;
};

import { useEffect, useState } from 'react';

/**
 * Hook to safely handle client-side only operations
 */

export const useClientSide = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
};

/**
 * Component props for hydration-safe rendering
 */
export interface HydrationSafeProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  suppressHydrationWarning?: boolean;
}

/**
 * Higher-order component that makes any component hydration-safe
 */
export function withHydrationSafety<P extends object>(
  Component: React.ComponentType<P>
) {
  return function HydrationSafeComponent(props: P) {
    const isClient = useClientSide();
    
    if (!isClient) {
      return null;
    }
    
    return <Component {...props} />;
  };
}
