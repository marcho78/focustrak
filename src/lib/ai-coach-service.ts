import { userBehaviorService, UserPattern, UserMood } from './user-behavior-service';

export interface CoachContext {
  trigger: 
    | 'task_creation' 
    | 'session_start' 
    | 'mid_session_struggle'
    | 'frequent_pauses'
    | 'break_time'
    | 'session_complete'
    | 'task_abandoned'
    | 'user_question'
    | 'predictive'
    | 'milestone';
  
  taskInfo?: {
    title: string;
    description?: string;
    stepCount: number;
    complexity?: 'simple' | 'moderate' | 'complex';
    steps?: Array<{ id: string; content: string; done: boolean }>;
    completedSteps?: number;
  };
  
  sessionInfo?: {
    duration: number;
    pauseCount: number;
    progress: number;
    timeRemaining?: number;
  };
  
  userMessage?: string; // For conversational mode
  patterns?: UserPattern;
  mood?: UserMood;
  timeContext?: {
    timeOfDay: string;
    hour: number;
    isWeekend: boolean;
  };
}

export interface CoachAdvice {
  message: string;
  type: 'motivation' | 'technique' | 'warning' | 'celebration' | 'tip';
  confidence: number;
  followUp?: string;
  suggestedAction?: {
    label: string;
    action: string;
  };
  source: 'ai' | 'rules' | 'cached';
}

export interface CoachPersonality {
  tone: 'supportive' | 'energetic' | 'calm' | 'direct';
  style: 'friend' | 'mentor' | 'coach' | 'assistant';
  encouragementLevel: 'high' | 'medium' | 'low';
}

class AICoachService {
  private personality: CoachPersonality = {
    tone: 'supportive',
    style: 'coach',
    encouragementLevel: 'medium',
  };

  private conversationHistory: Array<{ role: string; content: string }> = [];
  private cachedResponses: Map<string, CoachAdvice> = new Map();
  private lastAICall: number = 0;
  private readonly AI_COOLDOWN = 5000; // 5 seconds between AI calls

  // Level 1: Basic AI Tips
  async getBasicAdvice(context: CoachContext): Promise<CoachAdvice> {
    // Check cache first
    const cacheKey = this.getCacheKey(context);
    if (this.cachedResponses.has(cacheKey)) {
      const cached = this.cachedResponses.get(cacheKey)!;
      return { ...cached, source: 'cached' };
    }

    // Use rules for simple cases
    const ruleBasedAdvice = this.getRuleBasedAdvice(context);
    if (ruleBasedAdvice && ruleBasedAdvice.confidence > 0.7) {
      return ruleBasedAdvice;
    }

    // Call AI for complex cases
    try {
      const aiAdvice = await this.getAIAdvice(context);
      this.cachedResponses.set(cacheKey, aiAdvice);
      return aiAdvice;
    } catch (error) {
      console.error('AI Coach error:', error);
      return this.getFallbackAdvice(context);
    }
  }

  // Level 2: Conversational Coach
  async askCoach(question: string, context?: Partial<CoachContext>): Promise<CoachAdvice> {
    const fullContext: CoachContext = {
      trigger: 'user_question',
      userMessage: question,
      ...context,
      patterns: userBehaviorService.getUserPatterns(),
      mood: userBehaviorService.detectMood(),
    };

    // Add to conversation history
    this.conversationHistory.push({ role: 'user', content: question });

    const response = await this.getConversationalAdvice(fullContext);
    
    // Keep conversation history limited
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }

    return response;
  }

  // Level 3: Predictive Coaching
  async getPredictiveAdvice(): Promise<CoachAdvice | null> {
    const context = userBehaviorService.getCurrentContext();
    const patterns = context.patterns;
    const mood = context.mood;

    // Predict potential issues
    const predictions = this.predictIssues(patterns, mood);
    
    if (predictions.length === 0) {
      return null;
    }

    const highestPriorityPrediction = predictions[0];
    const predictiveContext: CoachContext = {
      trigger: 'predictive',
      patterns,
      mood,
      timeContext: context.timeContext,
    };

    const advice = await this.getAIAdvice(predictiveContext, highestPriorityPrediction);
    return advice;
  }

  // Level 4: Personalized Learning
  async getPersonalizedAdvice(context: CoachContext): Promise<CoachAdvice> {
    // Load user preferences and past interactions
    const userProfile = this.loadUserProfile();
    const effectiveStrategies = this.getEffectiveStrategies(userProfile);
    
    // Adapt personality based on user preferences
    this.adaptPersonality(userProfile);
    
    // Get AI advice with personalization
    const personalizedContext = {
      ...context,
      userProfile,
      effectiveStrategies,
      personality: this.personality,
    };

    const advice = await this.getAIAdvice(personalizedContext);
    
    // Learn from this interaction
    this.updateUserProfile(context, advice);
    
    return advice;
  }

  // Core AI interaction
  private async getAIAdvice(
    context: CoachContext, 
    additionalContext?: string
  ): Promise<CoachAdvice> {
    // Rate limiting
    const now = Date.now();
    if (now - this.lastAICall < this.AI_COOLDOWN) {
      return this.getRuleBasedAdvice(context) || this.getFallbackAdvice(context);
    }
    this.lastAICall = now;

    const prompt = this.buildPrompt(context, additionalContext);
    
    try {
      const response = await fetch('/api/coach/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context }),
      });

      if (!response.ok) {
        throw new Error('AI service unavailable');
      }

      const data = await response.json();
      return this.parseAIResponse(data, context);
    } catch (error) {
      console.error('AI advice error:', error);
      return this.getFallbackAdvice(context);
    }
  }

  private async getConversationalAdvice(context: CoachContext): Promise<CoachAdvice> {
    const conversationContext = this.conversationHistory.map(h => 
      `${h.role}: ${h.content}`
    ).join('\n');

    const prompt = `
You are a supportive focus coach having a conversation with a user.

Previous conversation:
${conversationContext}

Current context:
- User patterns: ${JSON.stringify(context.patterns)}
- Current mood: ${context.mood?.current}
- Time: ${context.timeContext?.timeOfDay}

User asks: "${context.userMessage}"

Provide a helpful, concise response (2-3 sentences max). Be conversational and supportive.
`;

    const response = await this.getAIAdvice(context, prompt);
    this.conversationHistory.push({ role: 'assistant', content: response.message });
    return response;
  }

  private buildPrompt(context: CoachContext, additionalContext?: string): string {
    const { trigger, taskInfo, sessionInfo, patterns, mood, timeContext } = context;
    
    let prompt = `You are an expert focus and productivity coach with a ${this.personality.tone} tone and ${this.personality.style} style.

Context:
- Trigger: ${trigger}
${taskInfo ? `- Task: "${taskInfo.title}" with ${taskInfo.stepCount} steps (${taskInfo.complexity} complexity)` : ''}
${taskInfo?.steps ? `- Task breakdown:\n${taskInfo.steps.map((s, i) => `  ${i + 1}. ${s.done ? '✓' : '○'} ${s.content}`).join('\n')}` : ''}
${taskInfo?.completedSteps !== undefined ? `- Progress: ${taskInfo.completedSteps}/${taskInfo.stepCount} steps completed` : ''}
${sessionInfo ? `- Session: ${sessionInfo.duration}min, ${sessionInfo.pauseCount} pauses, ${sessionInfo.progress}% complete` : ''}
${patterns ? `- User typically focuses for ${patterns.avgFocusDuration}min with ${patterns.avgPauseFrequency} pauses per session` : ''}
${patterns ? `- Completion rate: ${(patterns.completionRate * 100).toFixed(0)}%, Current streak: ${patterns.currentStreak}` : ''}
${mood ? `- Current mood: ${mood.current} (${mood.indicators.join(', ')})` : ''}
${timeContext ? `- Time: ${timeContext.timeOfDay} (${timeContext.hour}:00)${timeContext.isWeekend ? ', weekend' : ''}` : ''}

${additionalContext || ''}

Provide a brief (1-2 sentences), actionable, and encouraging tip that directly addresses the current situation.
Focus on practical advice that can be implemented immediately.
${this.personality.encouragementLevel === 'high' ? 'Be very encouraging and positive.' : ''}
${this.personality.encouragementLevel === 'low' ? 'Be direct and practical without excessive encouragement.' : ''}
`;

    return prompt;
  }

  private parseAIResponse(data: any, context: CoachContext): CoachAdvice {
    // Parse the AI response and structure it
    const message = data.message || data.text || 'Stay focused and keep going!';
    
    // Determine type based on context and content
    let type: CoachAdvice['type'] = 'tip';
    if (context.trigger === 'milestone' || context.trigger === 'session_complete') {
      type = 'celebration';
    } else if (context.trigger === 'task_abandoned') {
      type = 'motivation';
    } else if (message.toLowerCase().includes('try') || message.toLowerCase().includes('technique')) {
      type = 'technique';
    }

    return {
      message,
      type,
      confidence: data.confidence || 0.8,
      source: 'ai',
      followUp: data.followUp,
      suggestedAction: data.suggestedAction,
    };
  }

  private getRuleBasedAdvice(context: CoachContext): CoachAdvice | null {
    const { trigger, patterns, mood, timeContext } = context;
    
    // Simple rule-based responses for common scenarios
    if (trigger === 'frequent_pauses' && patterns?.avgPauseFrequency && patterns.avgPauseFrequency > 3) {
      return {
        message: "Try the 2-minute rule: commit to just 2 more minutes of focus. Often that's all you need to regain momentum.",
        type: 'technique',
        confidence: 0.8,
        source: 'rules',
      };
    }

    if (mood?.current === 'tired' && timeContext?.hour && timeContext.hour >= 22) {
      return {
        message: "Working tired often means redoing tomorrow. Consider wrapping up and starting fresh in the morning.",
        type: 'warning',
        confidence: 0.75,
        source: 'rules',
      };
    }

    if (trigger === 'milestone' && patterns?.currentStreak && patterns.currentStreak % 5 === 0) {
      return {
        message: `${patterns.currentStreak} sessions in a row! You're building an unstoppable focus habit. 🎯`,
        type: 'celebration',
        confidence: 0.9,
        source: 'rules',
      };
    }

    return null;
  }

  private getFallbackAdvice(context: CoachContext): CoachAdvice {
    const fallbacks: Record<CoachContext['trigger'], string> = {
      task_creation: "Break it down into the smallest possible first step. Starting is the hardest part.",
      session_start: "Deep breath. One step at a time. You've got this.",
      mid_session_struggle: "It's okay to struggle. Progress isn't always smooth. Keep going.",
      frequent_pauses: "Short bursts of focus are still progress. Try for just one more minute.",
      break_time: "Rest is productive. Your brain is processing what you've learned.",
      session_complete: "Well done! Every completed session builds your focus muscle.",
      task_abandoned: "Not every session goes as planned. What matters is showing up again.",
      user_question: "Stay focused on your current task. You can do this!",
      predictive: "You're doing great. Keep up the momentum!",
      milestone: "Congratulations on your progress! Keep building on this success.",
    };

    return {
      message: fallbacks[context.trigger],
      type: 'motivation',
      confidence: 0.5,
      source: 'rules',
    };
  }

  private predictIssues(patterns: UserPattern, mood: UserMood): string[] {
    const predictions: string[] = [];

    // Predict based on patterns
    if (patterns.avgPauseFrequency > 4) {
      predictions.push('User likely to struggle with focus - suggest shorter sessions');
    }

    if (patterns.completionRate < 0.5 && patterns.totalSessions > 10) {
      predictions.push('User has low completion rate - suggest simpler task breakdown');
    }

    if (mood.current === 'struggling' && mood.indicators.includes('frequent_pauses')) {
      predictions.push('User showing signs of frustration - offer encouragement and techniques');
    }

    const hour = new Date().getHours();
    if (hour >= 14 && hour <= 16 && patterns.productiveHours.length > 0) {
      const isAfternoonSlump = !patterns.productiveHours.some(h => h.includes('14:') || h.includes('15:'));
      if (isAfternoonSlump) {
        predictions.push('Afternoon energy dip detected - suggest energizing break activity');
      }
    }

    return predictions;
  }

  private getCacheKey(context: CoachContext): string {
    const key = `${context.trigger}_${context.mood?.current}_${context.timeContext?.timeOfDay}`;
    return key;
  }

  private loadUserProfile(): any {
    const stored = localStorage.getItem('ai_coach_profile');
    if (!stored) {
      return {
        preferredTone: 'supportive',
        effectiveStrategies: [],
        interactions: [],
        preferences: {},
      };
    }
    return JSON.parse(stored);
  }

  private getEffectiveStrategies(profile: any): string[] {
    return profile.effectiveStrategies || [];
  }

  private adaptPersonality(profile: any): void {
    if (profile.preferredTone) {
      this.personality.tone = profile.preferredTone;
    }
    if (profile.preferredStyle) {
      this.personality.style = profile.preferredStyle;
    }
    if (profile.encouragementLevel) {
      this.personality.encouragementLevel = profile.encouragementLevel;
    }
  }

  private updateUserProfile(context: CoachContext, advice: CoachAdvice): void {
    const profile = this.loadUserProfile();
    
    // Track interaction
    profile.interactions.push({
      timestamp: Date.now(),
      trigger: context.trigger,
      mood: context.mood?.current,
      adviceType: advice.type,
    });

    // Keep only last 50 interactions
    if (profile.interactions.length > 50) {
      profile.interactions = profile.interactions.slice(-50);
    }

    localStorage.setItem('ai_coach_profile', JSON.stringify(profile));
  }

  // Settings management
  updatePersonality(settings: Partial<CoachPersonality>): void {
    this.personality = { ...this.personality, ...settings };
    const profile = this.loadUserProfile();
    profile.preferredTone = this.personality.tone;
    profile.preferredStyle = this.personality.style;
    profile.encouragementLevel = this.personality.encouragementLevel;
    localStorage.setItem('ai_coach_profile', JSON.stringify(profile));
  }

  clearHistory(): void {
    this.conversationHistory = [];
    this.cachedResponses.clear();
  }
}

export const aiCoachService = new AICoachService();