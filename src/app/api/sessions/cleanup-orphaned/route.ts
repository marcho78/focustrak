import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { query } from '@/lib/db';

// POST /api/sessions/cleanup-orphaned - Clean up orphaned active sessions
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    // Find sessions that have been active for longer than reasonable (e.g., 2 hours)
    // This catches sessions where the user closed their browser without proper cleanup
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 2); // 2 hours ago
    
    const orphanedSessionsResult = await query(
      `SELECT id, started_at, planned_duration FROM sessions 
       WHERE user_id = $1 
       AND status = 'active' 
       AND started_at < $2`,
      [user.id, cutoffTime.toISOString()]
    );
    
    const orphanedSessions = orphanedSessionsResult.rows;
    
    if (orphanedSessions.length === 0) {
      return NextResponse.json({
        success: true,
        data: { cleanedUp: 0, sessions: [] }
      });
    }
    
    // Update all orphaned sessions to 'skipped' status
    const sessionIds = orphanedSessions.map(s => s.id);
    
    // Calculate estimated actual duration for each session
    // Assume they worked for at least some portion of their planned session
    const updatePromises = orphanedSessions.map(async (session) => {
      const sessionStart = new Date(session.started_at);
      const plannedDuration = session.planned_duration || 1500;
      
      // Estimate they worked for 30-50% of planned duration before abandoning
      // This is more realistic than 0 time or full time
      const estimatedDuration = Math.floor(plannedDuration * 0.4);
      
      return query(
        `UPDATE sessions 
         SET status = 'skipped',
             ended_at = $1,
             actual_duration = $2,
             notes = 'Session automatically cleaned up - likely abandoned due to browser close'
         WHERE id = $3`,
        [cutoffTime.toISOString(), estimatedDuration, session.id]
      );
    });
    
    await Promise.all(updatePromises);
    
    console.log(`🧹 Cleaned up ${orphanedSessions.length} orphaned sessions for user ${user.id}`);
    
    return NextResponse.json({
      success: true,
      data: { 
        cleanedUp: orphanedSessions.length,
        sessions: orphanedSessions.map(s => ({
          id: s.id,
          startedAt: s.started_at,
          plannedDuration: s.planned_duration
        }))
      }
    });
    
  } catch (error) {
    console.error('Error cleaning up orphaned sessions:', error);
    
    // Handle authentication errors specifically
    if (error instanceof Error) {
      if (error.message === 'Not authenticated' || error.message === 'Session expired') {
        return NextResponse.json(
          { success: false, error: 'Please log in to cleanup sessions' },
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
      { success: false, error: 'Unable to cleanup sessions. Please try again.' },
      { status: 500 }
    );
  }
}
