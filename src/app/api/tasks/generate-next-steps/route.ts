import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { aiRateLimit } from '@/lib/rate-limit';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a helpful assistant that generates next steps for tasks based on what has already been completed. Your goal is to suggest logical follow-up actions that build on the completed work.

Key principles:
1. Generate 2-4 next steps based on the completed steps
2. Each step should be something that can be completed in 15-30 minutes
3. Steps should logically follow from what was already done
4. Use clear, action-oriented language (start with verbs)
5. Focus on immediate next actions, not long-term planning
6. Consider the overall task context when suggesting steps

Return ONLY a JSON array of strings, where each string is a step. Do not include any other text or formatting.`;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    let user;
    try {
      user = await getAuthenticatedUser();
    } catch (authError) {
      console.log('Unauthorized access attempt to generate-next-steps API');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimitResult = await aiRateLimit(request, user.email);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many requests. Please wait before trying again.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
          }
        }
      );
    }

    const { taskTitle, taskDescription, completedSteps, remainingSteps } = await request.json();
    console.log('Generate next steps request from user:', user.email, { 
      taskTitle, 
      completedStepsCount: completedSteps?.length,
      remainingStepsCount: remainingSteps?.length 
    });

    if (!taskTitle) {
      return NextResponse.json(
        { success: false, error: 'Task title is required' },
        { status: 400 }
      );
    }

    if (!completedSteps || completedSteps.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one completed step is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const userPrompt = `Task: ${taskTitle}
${taskDescription ? `Description: ${taskDescription}` : ''}

Completed steps:
${completedSteps.map((step: string, index: number) => `${index + 1}. ${step}`).join('\n')}

${remainingSteps && remainingSteps.length > 0 ? `Current remaining steps (for context, but generate new ones):
${remainingSteps.map((step: string, index: number) => `${index + 1}. ${step}`).join('\n')}` : ''}

Based on what has been completed, generate 2-4 logical next steps to continue making progress on this task.`;
    
    console.log('Calling OpenAI with prompt for next steps');

    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      max_completion_tokens: parseInt(process.env.OPENAI_MAX_COMPLETION_TOKENS || '2000'),
    });

    const response = completion.choices[0]?.message?.content;
    console.log('OpenAI raw response for next steps:', response);
    
    if (!response) {
      return NextResponse.json(
        { success: false, error: 'No response from OpenAI' },
        { status: 500 }
      );
    }

    try {
      const steps = JSON.parse(response);
      
      if (!Array.isArray(steps)) {
        throw new Error('Response is not an array');
      }

      const validSteps = steps.filter(step => typeof step === 'string' && step.trim().length > 0);
      
      if (validSteps.length === 0) {
        throw new Error('No valid steps found');
      }

      console.log('Returning generated next steps:', validSteps);
      return NextResponse.json({
        success: true,
        data: validSteps
      });

    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      
      const lines = response.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^\d+\.?\s*/, '').replace(/^[-*]\s*/, '').trim())
        .filter(line => line.length > 0);

      if (lines.length > 0) {
        return NextResponse.json({
          success: true,
          data: lines.slice(0, 4)
        });
      }

      return NextResponse.json(
        { success: false, error: 'Failed to parse next steps' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error generating next steps:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate next steps' },
      { status: 500 }
    );
  }
}