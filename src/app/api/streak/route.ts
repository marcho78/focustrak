import { NextRequest, NextResponse } from 'next/server';
import { StreakService } from '@/lib/services';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

// GET /api/streak - Get user's streak information
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    const [streak, todaysStats] = await Promise.all([
      StreakService.getUserStreak(user.id),
      StreakService.getTodaysStats(user.id)
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        streak,
        today: todaysStats
      }
    });
  } catch (error) {
    console.error('Error fetching streak:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch streak' },
      { status: 500 }
    );
  }
}
