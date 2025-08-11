import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
    const { taskIds } = await request.json();
    
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Task IDs are required'
      }, { status: 400 });
    }

    // Create placeholders for the IN clause
    const placeholders = taskIds.map((_, index) => `$${index + 1}`).join(', ');
    
    // Delete task steps first (foreign key constraint)
    await query(
      `DELETE FROM task_steps WHERE task_id IN (${placeholders})`,
      taskIds
    );
    
    // Delete sessions associated with these tasks
    await query(
      `DELETE FROM sessions WHERE task_id IN (${placeholders})`,
      taskIds
    );
    
    // Delete distractions associated with sessions of these tasks
    await query(
      `DELETE FROM distractions WHERE session_id IN (
        SELECT id FROM sessions WHERE task_id IN (${placeholders})
      )`,
      taskIds
    );
    
    // Finally delete the tasks
    const result = await query(
      `DELETE FROM tasks WHERE id IN (${placeholders})`,
      taskIds
    );

    return NextResponse.json({
      success: true,
      message: `${taskIds.length} task(s) deleted successfully`,
      deletedCount: taskIds.length
    });
  } catch (error) {
    console.error('Failed to delete tasks:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete tasks'
    }, { status: 500 });
  }
}
