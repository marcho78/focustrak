import { NextRequest, NextResponse } from 'next/server';
import { TaskService, getDemoUser } from '@/lib/services';
import { TaskStatus } from '@/types';

// GET /api/tasks - Get user's tasks
export async function GET(request: NextRequest) {
  try {
    // For now, use demo user
    const user = await getDemoUser();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as TaskStatus | null;
    
    const tasks = await TaskService.getUserTasks(user.id, status);
    
    return NextResponse.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const { title, description, steps } = await request.json();
    
    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }
    
    // For now, use demo user
    const user = await getDemoUser();
    
    // Create the task
    const task = await TaskService.createTask(user.id, title, description);
    
    // Create task steps if provided
    if (steps && steps.length > 0) {
      const createdSteps = await TaskService.createTaskSteps(task.id, steps);
      task.steps = createdSteps;
    }
    
    return NextResponse.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
