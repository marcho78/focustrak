import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: taskId } = params;
    const body = await request.json();
    const { status, completedAt } = body;
    
    // Update task status
    await query(
      `UPDATE tasks 
       SET status = $1, updated_at = $2
       WHERE id = $3`,
      [status, completedAt || new Date().toISOString(), taskId]
    );

    // Get updated task with steps
    const taskResult = await query(
      `SELECT * FROM tasks WHERE id = $1`,
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Task not found'
      }, { status: 404 });
    }

    const task = taskResult.rows[0];

    // Get task steps
    const stepsResult = await query(
      `SELECT * FROM task_steps 
       WHERE task_id = $1 
       ORDER BY order_index`,
      [taskId]
    );

    const taskWithSteps = {
      id: task.id,
      userId: task.user_id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueAt: task.due_at,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      estimatedSessions: task.estimated_sessions,
      steps: stepsResult.rows.map(step => ({
        id: step.id,
        taskId: step.task_id,
        content: step.content,
        done: step.done,
        orderIndex: step.order_index,
        createdAt: step.created_at,
        updatedAt: step.updated_at
      }))
    };

    return NextResponse.json({
      success: true,
      data: taskWithSteps
    });
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update task'
    }, { status: 500 });
  }
}
