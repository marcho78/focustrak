import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth0_session');
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    try {
      const sessionData = JSON.parse(sessionCookie.value);
      
      // Check if session is expired
      if (sessionData.expiresAt && sessionData.expiresAt < Date.now()) {
        return NextResponse.json(
          { error: 'Session expired' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(sessionData.user);
    } catch (error) {
      console.error('Failed to parse session:', error);
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Failed to get user session:', error);
    return NextResponse.json(
      { error: 'Failed to get user session' },
      { status: 500 }
    );
  }
}