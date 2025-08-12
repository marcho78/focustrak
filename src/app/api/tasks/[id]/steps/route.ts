import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services';

// POST /api/tasks/[id]/steps - Create a new task step
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const { content } = await request.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Step content is required' },
        { status: 400 }
      );
    }

    const step = await TaskService.createTaskStep(taskId, content.trim());
    
    return NextResponse.json({
      success: true,
      data: step
    });
  } catch (error) {
    console.error('Error creating task step:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create task step' },
      { status: 500 }
    );
  }
}
