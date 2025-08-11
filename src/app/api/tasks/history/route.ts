import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get completed tasks with their associated sessions
    const tasksResult = await query(`
      SELECT 
        t.id as task_id,
        t.title as task_title,
        t.description as task_description,
        t.status as task_status,
        t.created_at as task_created_at,
        t.updated_at as task_updated_at,
        COUNT(s.id) as total_sessions,
        COUNT(CASE WHEN s.status = 'completed' THEN 1 ELSE NULL END) as completed_sessions,
        COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.actual_duration ELSE 0 END), 0) as total_focus_time,
        MAX(s.ended_at) as last_session_date
      FROM tasks t
      LEFT JOIN sessions s ON t.id = s.task_id
      WHERE t.status = 'completed'
      GROUP BY t.id, t.title, t.description, t.status, t.created_at, t.updated_at
      HAVING COUNT(s.id) > 0
      ORDER BY COALESCE(MAX(s.ended_at), t.updated_at) DESC
      LIMIT 50
    `);
    
    const tasks = tasksResult.rows;
    
    // Get detailed sessions and steps for each task
    const tasksWithSessions = await Promise.all(
      tasks.map(async (task) => {
        const sessionsResult = await query(
          `SELECT 
            s.id,
            s.started_at,
            s.ended_at,
            s.planned_duration,
            s.actual_duration,
            s.status,
            s.notes,
            s.completed_steps,
            s.total_steps
          FROM sessions s
          WHERE s.task_id = $1
          AND s.status IN ('completed', 'skipped')
          ORDER BY s.started_at DESC`,
          [task.task_id]
        );
        
        // Get task steps
        const stepsResult = await query(
          `SELECT 
            ts.id,
            ts.content,
            ts.done,
            ts.order_index,
            ts.created_at,
            ts.updated_at
          FROM task_steps ts
          WHERE ts.task_id = $1
          ORDER BY ts.order_index`,
          [task.task_id]
        );
        
        return {
          id: task.task_id,
          title: task.task_title,
          description: task.task_description,
          status: task.task_status,
          createdAt: task.task_created_at,
          updatedAt: task.task_updated_at,
          steps: stepsResult.rows.map(step => ({
            id: step.id,
            content: step.content,
            done: step.done,
            orderIndex: step.order_index,
            createdAt: step.created_at,
            updatedAt: step.updated_at
          })),
          stats: {
            totalSessions: parseInt(task.total_sessions),
            completedSessions: parseInt(task.completed_sessions),
            totalFocusTime: parseInt(task.total_focus_time) || 0,
            lastSessionDate: task.last_session_date
          },
          sessions: sessionsResult.rows.map(session => ({
            id: session.id,
            startedAt: session.started_at,
            endedAt: session.ended_at,
            plannedDuration: session.planned_duration,
            actualDuration: session.actual_duration,
            status: session.status,
            notes: session.notes,
            completedSteps: session.completed_steps || 0,
            totalSteps: session.total_steps || 0
          }))
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: tasksWithSessions
    });
  } catch (error) {
    console.error('Failed to fetch task history:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch task history'
    }, { status: 500 });
  }
}
