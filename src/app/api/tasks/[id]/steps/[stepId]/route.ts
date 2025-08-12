import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services';

// PUT /api/tasks/[id]/steps/[stepId] - Toggle step completion or update content
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { stepId } = await params;
    const body = await request.json().catch(() => ({}));
    
    // If content is provided, update the step content
    if (body.content !== undefined) {
      if (typeof body.content !== 'string' || body.content.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Step content is required' },
          { status: 400 }
        );
      }
      await TaskService.updateTaskStep(stepId, body.content.trim());
    } else {
      // Otherwise, toggle the step completion
      await TaskService.toggleTaskStep(stepId);
    }
    
    return NextResponse.json({
      success: true,
      message: body.content ? 'Step updated successfully' : 'Step toggled successfully'
    });
  } catch (error) {
    console.error('Error updating step:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update step' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id]/steps/[stepId] - Delete a task step
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { stepId } = await params;
    
    await TaskService.deleteTaskStep(stepId);
    
    return NextResponse.json({
      success: true,
      message: 'Step deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting step:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete step' },
      { status: 500 }
    );
  }
}
