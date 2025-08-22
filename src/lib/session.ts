import { SessionOptions } from 'iron-session';

export interface SessionData {
  user?: {
    sub: string;
    email: string;
    name: string;
    picture?: string;
  };
  accessToken?: string;
  idToken?: string;
  expiresAt?: number;
}

// Ensure AUTH0_SECRET is set - critical for security
// Allow a development default ONLY for localhost
const isDevelopment = process.env.NODE_ENV === 'development';
const isLocalhost = process.env.AUTH0_BASE_URL?.includes('localhost');

if (!process.env.AUTH0_SECRET && !(isDevelopment && isLocalhost)) {
  throw new Error('AUTH0_SECRET environment variable is required for session encryption');
}

// Use a development-only secret for localhost
const sessionSecret = process.env.AUTH0_SECRET || 
  (isDevelopment && isLocalhost ? 'b7e0f8c9d2a1e5f3c6b9a4d7e2f5c8b1a3d6e9f2c5b8a1d4e7f0c3b6a9d2e5f8' : '');

export const sessionOptions: SessionOptions = {
  password: sessionSecret,
  cookieName: 'focustrak_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  },
};

// Helper to validate session
export function isValidSession(session: SessionData): boolean {
  if (!session.user || !session.expiresAt) {
    return false;
  }
  
  // Check if session has expired
  if (Date.now() > session.expiresAt) {
    return false;
  }
  
  return true;
}

// Helper to check if session needs refresh (within 5 minutes of expiry)
export function shouldRefreshSession(session: SessionData): boolean {
  if (!session.expiresAt) {
    return true;
  }
  
  const fiveMinutes = 5 * 60 * 1000;
  const timeUntilExpiry = session.expiresAt - Date.now();
  
  return timeUntilExpiry < fiveMinutes;
}

// Helper to extend session expiration
export async function extendSession(session: SessionData): Promise<void> {
  if (session.expiresAt) {
    // Extend by 24 hours
    session.expiresAt = Date.now() + (24 * 60 * 60 * 1000);
    await (session as any).save();
  }
}