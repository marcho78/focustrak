import { NextRequest, NextResponse } from 'next/server';
import { TaskService, SessionService } from '@/lib/services';

export async function GET(request: NextRequest) {
  try {
    // For now, using a mock user ID - in a real app, this would come from authentication
    const userId = '204e127b-6daa-4eab-b51c-dae358e081e5';
    
    // Fetch all tasks for the user
    const tasks = await TaskService.getUserTasks(userId);
    
    // Enhance each task with statistics and progress information
    const enhancedTasks = await Promise.all(tasks.map(async (task) => {
      // Get all sessions for this task
      const allSessions = await SessionService.getUserSessions(userId);
      const taskSessions = allSessions.filter(session => session.taskId === task.id);
      
      // Calculate statistics
      const completedSessions = taskSessions.filter(session => session.status === 'completed');
      const totalFocusTime = taskSessions.reduce((total, session) => {
        return total + (session.actualDuration || 0);
      }, 0);
      
      const lastSession = taskSessions.length > 0 
        ? taskSessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0]
        : null;
      
      // Calculate progress percentage based on completed steps
      const completedSteps = task.steps.filter(step => step.done).length;
      const totalSteps = task.steps.length;
      const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
      
      // Get the last stop reason from the most recent session
      let lastStopReason: string | undefined;
      if (lastSession && lastSession.status === 'skipped' && lastSession.notes) {
        // Extract reason from notes (format: "Stopped early: reason")
        const match = lastSession.notes.match(/Stopped early: (.+)/);
        lastStopReason = match ? match[1] : 'Session was stopped early';
      }
      
      // Determine completion rate
      const completionRate = taskSessions.length > 0 
        ? (completedSessions.length / taskSessions.length) * 100 
        : 0;
      
      // Format sessions for frontend consumption
      const formattedSessions = taskSessions.map(session => ({
        id: session.id,
        startedAt: session.startedAt,
        endedAt: session.endedAt || session.startedAt, // fallback for active sessions
        plannedDuration: session.plannedDuration || 1500,
        actualDuration: session.actualDuration || 0,
        status: session.status as 'completed' | 'skipped',
        notes: session.notes || undefined,
        completedSteps: session.completedSteps || 0,
        totalSteps: totalSteps
      }));
      
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        steps: task.steps,
        stats: {
          totalSessions: taskSessions.length,
          completedSessions: completedSessions.length,
          totalFocusTime,
          lastSessionDate: lastSession ? lastSession.startedAt : undefined,
          completionRate: Math.round(completionRate)
        },
        sessions: formattedSessions.sort((a, b) => 
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        ),
        lastStopReason,
        progressPercentage: Math.round(progressPercentage)
      };
    }));
    
    // Sort tasks: incomplete first (by last session date), then completed
    const sortedTasks = enhancedTasks.sort((a, b) => {
      // If one is completed and other isn't, incomplete comes first
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      
      // Both are the same status, sort by last session date (most recent first)
      const aDate = a.stats.lastSessionDate ? new Date(a.stats.lastSessionDate).getTime() : 0;
      const bDate = b.stats.lastSessionDate ? new Date(b.stats.lastSessionDate).getTime() : 0;
      
      return bDate - aDate;
    });
    
    return NextResponse.json({
      success: true,
      data: sortedTasks
    });
  } catch (error) {
    console.error('Error fetching all tasks:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tasks'
      },
      { status: 500 }
    );
  }
}
