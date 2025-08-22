import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData, isValidSession } from '@/lib/session';
import { securityMonitor, getClientIp } from '@/lib/security-monitor';

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIp = getClientIp(request);
  
  // Check if IP should be blocked
  if (securityMonitor.shouldBlock(clientIp)) {
    securityMonitor.logEvent({
      type: 'suspicious_pattern',
      ip: clientIp,
      path: pathname,
      timestamp: Date.now(),
      details: { reason: 'IP blocked due to suspicious activity' }
    });
    
    return NextResponse.json(
      { error: 'Too many failed attempts. Please try again later.' },
      { status: 429 }
    );
  }
  
  // List of public routes that don't require authentication
  const publicRoutes = [
    '/api/auth',     // Auth0 routes must be public
    '/_next',        // Next.js internal routes
    '/favicon',      // Favicon
    '/focustrak',    // Logo and static assets
    '/',             // Home page can be viewed without auth
  ];
  
  // List of routes that require authentication
  const protectedRoutes = [
    '/api/tasks',    // All task-related APIs
    '/api/users',    // User management APIs
    '/api/sessions', // Session management APIs
  ];
  
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Check authentication for protected routes
  if (isProtectedRoute) {
    try {
      // Get session from cookies
      const session = await getIronSession<SessionData>(
        request.cookies as any,
        sessionOptions
      );
      
      // Validate session
      if (!session.user || !isValidSession(session)) {
        // Log auth failure
        securityMonitor.logEvent({
          type: 'auth_failure',
          ip: clientIp,
          path: pathname,
          timestamp: Date.now(),
          details: { reason: 'Invalid or missing session' }
        });
        
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    } catch (error) {
      console.error('Middleware auth check failed:', error);
      
      // Log auth failure
      securityMonitor.logEvent({
        type: 'auth_failure',
        ip: clientIp,
        path: pathname,
        timestamp: Date.now(),
        details: { reason: 'Session validation error', error: error instanceof Error ? error.message : 'Unknown error' }
      });
      
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};