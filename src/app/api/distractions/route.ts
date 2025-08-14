import { NextRequest, NextResponse } from 'next/server';
import { DistractionService } from '@/lib/services';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

// POST /api/distractions - Create a new distraction
export async function POST(request: NextRequest) {
  try {
    const { sessionId, content } = await request.json();
    
    if (!sessionId || !content) {
      return NextResponse.json(
        { success: false, error: 'Session ID and content are required' },
        { status: 400 }
      );
    }
    
    const user = await getAuthenticatedUser();
    const distraction = await DistractionService.createDistraction(
      user.id, 
      sessionId, 
      content
    );
    
    return NextResponse.json({
      success: true,
      data: distraction
    });
  } catch (error) {
    console.error('Error creating distraction:', error);
    
    // Handle authentication errors specifically
    if (error instanceof Error) {
      if (error.message === 'Not authenticated' || error.message === 'Session expired') {
        return NextResponse.json(
          { success: false, error: 'Please log in to capture distractions' },
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
      { success: false, error: 'Unable to save distraction. Please try again.' },
      { status: 500 }
    );
  }
}
