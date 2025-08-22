import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData, isValidSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    // Get encrypted session
    const session = await getIronSession<SessionData>(cookies(), sessionOptions);
    
    // Check if session exists and is valid
    if (!session.user || !isValidSession(session)) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(session.user);
  } catch (error) {
    console.error('Failed to get user session:', error);
    return NextResponse.json(
      { error: 'Failed to get user session' },
      { status: 500 }
    );
  }
}