export interface SessionData {
  sessionId: string;
  taskId: string;
  taskTitle: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  pauseCount: number;
  pauseDurations: number[];
  stepsCompleted: number;
  totalSteps: number;
  completed: boolean;
  abandoned: boolean;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number;
}

export interface UserPattern {
  avgFocusDuration: number;
  avgPauseFrequency: number;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
  totalSessions: number;
  productiveHours: string[];
  commonStruggles: string[];
  preferredBreakLength: number;
  taskTypes: Record<string, number>;
}

export interface UserMood {
  current: 'focused' | 'struggling' | 'distracted' | 'energized' | 'tired';
  confidence: number;
  indicators: string[];
}

class UserBehaviorService {
  private readonly STORAGE_KEY = 'user_behavior_data';
  private readonly PATTERN_KEY = 'user_patterns';
  private currentSession: Partial<SessionData> | null = null;

  // Track session events
  startSession(taskId: string, taskTitle: string, totalSteps: number): void {
    const now = new Date();
    this.currentSession = {
      sessionId: `session_${Date.now()}`,
      taskId,
      taskTitle,
      startTime: now,
      pauseCount: 0,
      pauseDurations: [],
      stepsCompleted: 0,
      totalSteps,
      completed: false,
      abandoned: false,
      timeOfDay: this.getTimeOfDay(now),
      dayOfWeek: now.getDay(),
    };
    
    this.saveCurrentSession();
  }

  pauseSession(): void {
    if (this.currentSession) {
      this.currentSession.pauseCount = (this.currentSession.pauseCount || 0) + 1;
      this.saveCurrentSession();
    }
  }

  resumeSession(pauseDuration: number): void {
    if (this.currentSession) {
      this.currentSession.pauseDurations?.push(pauseDuration);
      this.saveCurrentSession();
    }
  }

  completeStep(): void {
    if (this.currentSession) {
      this.currentSession.stepsCompleted = (this.currentSession.stepsCompleted || 0) + 1;
      this.saveCurrentSession();
    }
  }

  endSession(completed: boolean, duration: number): void {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      this.currentSession.duration = duration;
      this.currentSession.completed = completed;
      this.currentSession.abandoned = !completed;
      
      this.saveSessionToHistory();
      this.updatePatterns();
      this.currentSession = null;
    }
  }

  // Analyze patterns
  getUserPatterns(): UserPattern {
    const patterns = this.loadPatterns();
    const sessions = this.loadSessions();
    
    if (sessions.length === 0) {
      return this.getDefaultPatterns();
    }

    const completedSessions = sessions.filter(s => s.completed);
    const recentSessions = sessions.slice(-20); // Last 20 sessions

    return {
      avgFocusDuration: this.calculateAvgDuration(completedSessions),
      avgPauseFrequency: this.calculateAvgPauseFrequency(recentSessions),
      completionRate: completedSessions.length / sessions.length,
      currentStreak: this.calculateCurrentStreak(sessions),
      bestStreak: patterns?.bestStreak || 0,
      totalSessions: sessions.length,
      productiveHours: this.findProductiveHours(completedSessions),
      commonStruggles: this.identifyStruggles(sessions),
      preferredBreakLength: patterns?.preferredBreakLength || 300,
      taskTypes: this.analyzeTaskTypes(sessions),
    };
  }

  // Detect current mood/state
  detectMood(): UserMood {
    if (!this.currentSession) {
      return { current: 'focused', confidence: 0.5, indicators: [] };
    }

    const indicators: string[] = [];
    let mood: UserMood['current'] = 'focused';
    let confidence = 0.7;

    const pauseFreq = (this.currentSession.pauseCount || 0) / 
                      ((Date.now() - this.currentSession.startTime!.getTime()) / 60000);

    if (pauseFreq > 0.3) {
      mood = 'struggling';
      indicators.push('frequent_pauses');
      confidence = 0.8;
    } else if (pauseFreq < 0.05) {
      mood = 'energized';
      indicators.push('continuous_focus');
      confidence = 0.85;
    }

    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      if (mood !== 'struggling') mood = 'tired';
      indicators.push('late_night_work');
      confidence = Math.max(confidence, 0.75);
    }

    const completionRatio = (this.currentSession.stepsCompleted || 0) / 
                           (this.currentSession.totalSteps || 1);
    if (completionRatio > 0.7) {
      indicators.push('high_progress');
      if (mood === 'focused') mood = 'energized';
    } else if (completionRatio < 0.2 && this.currentSession.pauseCount! > 2) {
      indicators.push('low_progress');
      mood = 'distracted';
    }

    return { current: mood, confidence, indicators };
  }

  // Get context for AI
  getCurrentContext() {
    const patterns = this.getUserPatterns();
    const mood = this.detectMood();
    const now = new Date();

    return {
      session: this.currentSession,
      patterns,
      mood,
      timeContext: {
        timeOfDay: this.getTimeOfDay(now),
        dayOfWeek: now.getDay(),
        hour: now.getHours(),
        isWeekend: now.getDay() === 0 || now.getDay() === 6,
      },
      recentPerformance: this.getRecentPerformance(),
    };
  }

  // Helper methods
  private getTimeOfDay(date: Date): SessionData['timeOfDay'] {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  private saveCurrentSession(): void {
    if (this.currentSession) {
      localStorage.setItem('current_session', JSON.stringify(this.currentSession));
    }
  }

  private saveSessionToHistory(): void {
    const sessions = this.loadSessions();
    if (this.currentSession) {
      sessions.push(this.currentSession as SessionData);
      // Keep only last 100 sessions
      if (sessions.length > 100) {
        sessions.shift();
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
    }
  }

  private loadSessions(): SessionData[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data).map((s: any) => ({
        ...s,
        startTime: new Date(s.startTime),
        endTime: s.endTime ? new Date(s.endTime) : undefined,
      }));
    } catch {
      return [];
    }
  }

  private loadPatterns(): UserPattern | null {
    const data = localStorage.getItem(this.PATTERN_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private updatePatterns(): void {
    const patterns = this.getUserPatterns();
    localStorage.setItem(this.PATTERN_KEY, JSON.stringify(patterns));
  }

  private calculateAvgDuration(sessions: SessionData[]): number {
    if (sessions.length === 0) return 25;
    const total = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    return Math.round(total / sessions.length / 60); // in minutes
  }

  private calculateAvgPauseFrequency(sessions: SessionData[]): number {
    if (sessions.length === 0) return 0;
    const total = sessions.reduce((sum, s) => sum + s.pauseCount, 0);
    return Math.round((total / sessions.length) * 10) / 10;
  }

  private calculateCurrentStreak(sessions: SessionData[]): number {
    let streak = 0;
    for (let i = sessions.length - 1; i >= 0; i--) {
      if (sessions[i].completed) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  private findProductiveHours(sessions: SessionData[]): string[] {
    const hourSuccess: Record<number, { completed: number; total: number }> = {};
    
    sessions.forEach(s => {
      const hour = s.startTime.getHours();
      if (!hourSuccess[hour]) {
        hourSuccess[hour] = { completed: 0, total: 0 };
      }
      hourSuccess[hour].total++;
      if (s.completed) {
        hourSuccess[hour].completed++;
      }
    });

    const productive = Object.entries(hourSuccess)
      .filter(([_, stats]) => stats.total >= 3 && stats.completed / stats.total >= 0.7)
      .map(([hour]) => {
        const h = parseInt(hour);
        return `${h}:00-${h + 1}:00`;
      });

    return productive;
  }

  private identifyStruggles(sessions: SessionData[]): string[] {
    const struggles: string[] = [];
    const recentSessions = sessions.slice(-10);
    
    const avgPauses = this.calculateAvgPauseFrequency(recentSessions);
    if (avgPauses > 3) struggles.push('frequent_interruptions');
    
    const abandonRate = recentSessions.filter(s => s.abandoned).length / recentSessions.length;
    if (abandonRate > 0.3) struggles.push('task_abandonment');
    
    const shortSessions = recentSessions.filter(s => s.duration < 600).length;
    if (shortSessions > 5) struggles.push('difficulty_maintaining_focus');

    return struggles;
  }

  private analyzeTaskTypes(sessions: SessionData[]): Record<string, number> {
    const types: Record<string, number> = {};
    sessions.forEach(s => {
      const keywords = this.extractTaskKeywords(s.taskTitle);
      keywords.forEach(keyword => {
        types[keyword] = (types[keyword] || 0) + 1;
      });
    });
    return types;
  }

  private extractTaskKeywords(title: string): string[] {
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    return title.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .slice(0, 3);
  }

  private getRecentPerformance() {
    const sessions = this.loadSessions().slice(-5);
    if (sessions.length === 0) return null;

    return {
      completionRate: sessions.filter(s => s.completed).length / sessions.length,
      avgDuration: this.calculateAvgDuration(sessions),
      trend: this.calculateTrend(sessions),
    };
  }

  private calculateTrend(sessions: SessionData[]): 'improving' | 'stable' | 'declining' {
    if (sessions.length < 3) return 'stable';
    
    const firstHalf = sessions.slice(0, Math.floor(sessions.length / 2));
    const secondHalf = sessions.slice(Math.floor(sessions.length / 2));
    
    const firstRate = firstHalf.filter(s => s.completed).length / firstHalf.length;
    const secondRate = secondHalf.filter(s => s.completed).length / secondHalf.length;
    
    if (secondRate > firstRate + 0.2) return 'improving';
    if (secondRate < firstRate - 0.2) return 'declining';
    return 'stable';
  }

  private getDefaultPatterns(): UserPattern {
    return {
      avgFocusDuration: 25,
      avgPauseFrequency: 0,
      completionRate: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalSessions: 0,
      productiveHours: [],
      commonStruggles: [],
      preferredBreakLength: 300,
      taskTypes: {},
    };
  }

  // Clear all data (for privacy/reset)
  clearAllData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.PATTERN_KEY);
    localStorage.removeItem('current_session');
    this.currentSession = null;
  }
}

export const userBehaviorService = new UserBehaviorService();