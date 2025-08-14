import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default async function middleware(request: NextRequest) {
  // List of public routes that don't require authentication
  const publicRoutes = [
    '/api/auth', // Auth0 routes must be public
    '/_next',    // Next.js internal routes
    '/favicon',  // Favicon
  ];
  
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );
  
  // For now, allow all requests through
  // We'll progressively protect routes as we update them
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};