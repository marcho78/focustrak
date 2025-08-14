'use client';

// In Auth0 Next.js SDK v4, client authentication is handled differently
// The UserProvider/Auth0Provider is no longer needed as auth is handled server-side
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}