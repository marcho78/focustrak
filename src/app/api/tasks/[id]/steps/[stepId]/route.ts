import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services';

// PUT /api/tasks/[id]/steps/[stepId] - Toggle step completion
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { stepId } = await params;
    
    await TaskService.toggleTaskStep(stepId);
    
    return NextResponse.json({
      success: true,
      message: 'Step toggled successfully'
    });
  } catch (error) {
    console.error('Error toggling step:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle step' },
      { status: 500 }
    );
  }
}
