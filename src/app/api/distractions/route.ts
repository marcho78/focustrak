import { NextRequest, NextResponse } from 'next/server';
import { DistractionService, getDemoUser } from '@/lib/services';

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
    
    const user = await getDemoUser();
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
    return NextResponse.json(
      { success: false, error: 'Failed to create distraction' },
      { status: 500 }
    );
  }
}
