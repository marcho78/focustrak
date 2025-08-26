import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, context } = await request.json();

    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Return a fallback response if no API key
      return NextResponse.json({
        message: getFallbackMessage(context),
        confidence: 0.5,
        source: 'fallback'
      });
    }

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using the more cost-effective model
        messages: [
          {
            role: 'system',
            content: 'You are a supportive focus and productivity coach. Provide brief, actionable, and encouraging advice. Keep responses to 1-2 sentences maximum.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      console.error('OpenAI API error:', await openAIResponse.text());
      throw new Error('OpenAI API error');
    }

    const data = await openAIResponse.json();
    const message = data.choices[0]?.message?.content || getFallbackMessage(context);

    // Analyze the response to add metadata
    const analysis = analyzeResponse(message, context);

    return NextResponse.json({
      message,
      confidence: 0.9,
      source: 'ai',
      ...analysis,
    });
  } catch (error) {
    console.error('Coach API error:', error);
    
    // Return fallback advice on error
    return NextResponse.json({
      message: getFallbackMessage(undefined),
      confidence: 0.5,
      source: 'fallback',
    });
  }
}

function getFallbackMessage(context: any): string {
  const trigger = context?.trigger;
  
  const fallbacks: Record<string, string> = {
    task_creation: "Great start! Break your task into small, manageable steps.",
    session_start: "Focus on one step at a time. You've got this!",
    mid_session_struggle: "It's okay to pause. Take a deep breath and continue when ready.",
    frequent_pauses: "Try working for just 2 more minutes. Small progress is still progress.",
    break_time: "Well deserved! Rest your mind and come back refreshed.",
    session_complete: "Excellent work! Every session builds your focus muscle.",
    task_abandoned: "It happens. What matters is trying again.",
    user_question: "Stay focused and trust the process.",
    predictive: "You're on the right track. Keep going!",
    milestone: "Amazing progress! Celebrate this achievement.",
  };

  return fallbacks[trigger] || "Stay focused and keep making progress!";
}

function analyzeResponse(message: string, context: any): any {
  const analysis: any = {};
  
  // Check if response suggests an action
  if (message.includes('Try') || message.includes('Consider') || message.includes('Start')) {
    analysis.suggestedAction = {
      label: 'Try Suggestion',
      action: 'apply_technique',
    };
  }

  // Determine if follow-up might be helpful
  if (context?.trigger === 'mid_session_struggle' || context?.trigger === 'frequent_pauses') {
    analysis.followUp = "How are you feeling now? Need different advice?";
  }

  return analysis;
}