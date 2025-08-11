import { NextRequest, NextResponse } from 'next/server';
import { SessionService, getDemoUser } from '@/lib/services';

// GET /api/sessions - Get user's sessions
export async function GET(request: NextRequest) {
  try {
    const user = await getDemoUser();
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
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create a new session
export async function POST(request: NextRequest) {
  try {
    const { taskId } = await request.json();
    
    const user = await getDemoUser();
    const session = await SessionService.createSession(user.id, taskId);
    
    return NextResponse.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
