import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { aiRateLimit } from '@/lib/rate-limit';
import { validateTaskTitle, validateTaskDescription } from '@/lib/validation';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a helpful assistant designed to help procrastinators break down overwhelming tasks into manageable, actionable pieces. Your goal is to create just enough steps to make progress without overwhelming the user.

Key principles:
1. Break tasks into 3-5 small, specific, actionable steps
2. Each step should be something that can be completed in 15-30 minutes
3. Use clear, action-oriented language (start with verbs)
4. Make the first step the smallest possible to build momentum
5. Focus on immediate next actions, not long-term planning
6. Avoid overwhelming detail - keep it simple and achievable

Return ONLY a JSON array of strings, where each string is a step. Do not include any other text or formatting.

Example:
["Open the document and read the first paragraph", "Write a simple outline with 3 main points", "Draft the introduction section"]`;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    let user;
    try {
      user = await getAuthenticatedUser();
    } catch (authError) {
      console.log('Unauthorized access attempt to task breakdown API');
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

    const body = await request.json();
    
    // Validate and sanitize inputs
    const titleValidation = validateTaskTitle(body.taskTitle);
    if (!titleValidation.valid) {
      return NextResponse.json(
        { success: false, error: titleValidation.error },
        { status: 400 }
      );
    }
    
    const descriptionValidation = validateTaskDescription(body.taskDescription);
    
    const taskTitle = titleValidation.value;
    const taskDescription = descriptionValidation.value;
    
    console.log('API Request received from user:', user.email, { taskTitle, taskDescription });

    if (!process.env.OPENAI_API_KEY) {
      console.log('Error: OpenAI API key not configured');
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const userPrompt = `Task: ${taskTitle}${taskDescription ? `\nDescription: ${taskDescription}` : ''}

Please break this down into manageable steps.`;
    
    console.log('Calling OpenAI with prompt:', userPrompt);

    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      max_completion_tokens: parseInt(process.env.OPENAI_MAX_COMPLETION_TOKENS || '2000'),
    });

    let response = completion.choices[0]?.message?.content;
    const finishReason = completion.choices[0]?.finish_reason;
    
    console.log('OpenAI response details:', {
      content: response,
      finishReason,
      usage: completion.usage,
      model: completion.model
    });
    
    if (!response || response.trim() === '') {
      console.log('Error: Empty response from OpenAI - model may be overloaded');
      
      // Try with a fallback model if gpt-5-nano fails
      console.log('Attempting with fallback model: gpt-4o-mini');
      
      try {
        const fallbackCompletion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 500,
          temperature: 0.7,
        });
        
        const fallbackResponse = fallbackCompletion.choices[0]?.message?.content;
        console.log('Fallback model response:', fallbackResponse);
        
        if (fallbackResponse) {
          response = fallbackResponse;
        } else {
          return NextResponse.json(
            { success: false, error: 'AI service is currently unavailable. Please try again later or add steps manually.' },
            { status: 503 }
          );
        }
      } catch (fallbackError) {
        console.error('Fallback model also failed:', fallbackError);
        return NextResponse.json(
          { success: false, error: 'AI service is currently unavailable. Please try again later or add steps manually.' },
          { status: 503 }
        );
      }
    }

    try {
      // Parse the JSON response
      const steps = JSON.parse(response);
      
      if (!Array.isArray(steps)) {
        throw new Error('Response is not an array');
      }

      // Validate that all steps are strings
      const validSteps = steps.filter(step => typeof step === 'string' && step.trim().length > 0);
      
      if (validSteps.length === 0) {
        throw new Error('No valid steps found');
      }

      console.log('Returning valid steps:', validSteps);
      return NextResponse.json({
        success: true,
        data: validSteps
      });

    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.error('Raw response:', response);
      
      // Fallback: try to extract steps from non-JSON response
      const lines = response.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^\d+\.?\s*/, '').replace(/^[-*]\s*/, '').trim())
        .filter(line => line.length > 0);

      if (lines.length > 0) {
        return NextResponse.json({
          success: true,
          data: lines.slice(0, 5) // Limit to 5 steps
        });
      }

      return NextResponse.json(
        { success: false, error: 'Failed to parse task breakdown' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in task breakdown:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate task breakdown' },
      { status: 500 }
    );
  }
}
