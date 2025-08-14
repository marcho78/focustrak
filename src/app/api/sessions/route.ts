import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/services';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

// GET /api/sessions - Get user's sessions
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const today = searchParams.get('today') === 'true';
    
    const sessions = today 
      ? await SessionService.getTodaysSessions(user.id)
      : await SessionService.getUserSessions(user.id);
    
    return NextResponse.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    
    // Handle authentication errors specifically
    if (error instanceof Error) {
      if (error.message === 'Not authenticated' || error.message === 'Session expired') {
        return NextResponse.json(
          { success: false, error: 'Please log in to view your sessions' },
          { status: 401 }
        );
      }
      
      if (error.message.includes('User not found')) {
        return NextResponse.json(
          { success: false, error: 'Account not found. Please try logging out and back in.' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Unable to load your sessions. Please try again.' },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create a new session
export async function POST(request: NextRequest) {
  try {
    const { taskId } = await request.json();
    
    const user = await getAuthenticatedUser();
    const session = await SessionService.createSession(user.id, taskId);
    
    return NextResponse.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error creating session:', error);
    
    // Handle authentication errors specifically
    if (error instanceof Error) {
      if (error.message === 'Not authenticated' || error.message === 'Session expired') {
        return NextResponse.json(
          { success: false, error: 'Please log in to start a session' },
          { status: 401 }
        );
      }
      
      if (error.message.includes('User not found')) {
        return NextResponse.json(
          { success: false, error: 'Account not found. Please try logging out and back in.' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Unable to create session. Please try again.' },
      { status: 500 }
    );
  }
}
