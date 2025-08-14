'use client';

import { ReactNode, useEffect, useState } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * ClientOnly component that only renders children on the client side.
 * This prevents hydration mismatches caused by browser extensions like Grammarly
 * that modify the DOM after server-side rendering.
 * 
 * Use this component to wrap any content that might be affected by browser extensions
 * or other client-side modifications.
 */
export default function ClientOnly({ children, fallback }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
