import focusContent from '@/data/focus-content.json';

interface ContentHistory {
  taskCreation: string[];
  sessionStart: string[];
  breakTime: string[];
}

class FocusContentService {
  private history: ContentHistory = {
    taskCreation: [],
    sessionStart: [],
    breakTime: []
  };
  
  private readonly HISTORY_BUFFER = focusContent.config.repeatBuffer || 20;
  
  /**
   * Get a random motivational line for task creation
   */
  getTaskCreationLine(): string {
    return this.getRandomContent('taskCreation', focusContent.motivationalLines.taskCreation);
  }
  
  /**
   * Get a random motivational line for session start
   */
  getSessionStartLine(): string {
    return this.getRandomContent('sessionStart', focusContent.motivationalLines.sessionStart);
  }
  
  /**
   * Get a random motivational line for break time
   */
  getBreakTimeLine(): string {
    return this.getRandomContent('breakTime', focusContent.motivationalLines.breakTime);
  }
  
  /**
   * Get a productivity tip
   */
  getProductivityTip(): string {
    const tips = focusContent.tips.productivity;
    return tips[Math.floor(Math.random() * tips.length)];
  }
  
  /**
   * Get a focus tip
   */
  getFocusTip(): string {
    const tips = focusContent.tips.focus;
    return tips[Math.floor(Math.random() * tips.length)];
  }
  
  /**
   * Get a procrastination tip
   */
  getProcrastinationTip(): string {
    const tips = focusContent.tips.procrastination;
    return tips[Math.floor(Math.random() * tips.length)];
  }
  
  /**
   * Get a random tip from any category
   */
  getRandomTip(): string {
    const categories = ['productivity', 'focus', 'procrastination'] as const;
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    switch (randomCategory) {
      case 'productivity':
        return this.getProductivityTip();
      case 'focus':
        return this.getFocusTip();
      case 'procrastination':
        return this.getProcrastinationTip();
      default:
        return this.getProductivityTip();
    }
  }
  
  /**
   * Get contextual tip based on user behavior
   */
  getContextualTip(context: keyof typeof focusContent.tips.contextual): string | null {
    const tip = focusContent.tips.contextual[context];
    return tip || null;
  }
  
  /**
   * Get content for break time (mix of motivational lines and tips)
   */
  getBreakContent(): { line: string; tip: string } {
    return {
      line: this.getBreakTimeLine(),
      tip: this.getRandomTip()
    };
  }
  
  /**
   * Helper to get random content without repeats
   */
  private getRandomContent(
    category: keyof ContentHistory, 
    contentArray: string[]
  ): string {
    const history = this.history[category];
    
    // Filter out recently used content
    const available = contentArray.filter(
      content => !history.includes(content)
    );
    
    // If we've used everything recently, reset history
    if (available.length === 0) {
      this.history[category] = [];
      return contentArray[Math.floor(Math.random() * contentArray.length)];
    }
    
    // Get random from available
    const selected = available[Math.floor(Math.random() * available.length)];
    
    // Add to history
    this.history[category].push(selected);
    
    // Keep history buffer size limited
    if (this.history[category].length > this.HISTORY_BUFFER) {
      this.history[category].shift();
    }
    
    return selected;
  }
  
  /**
   * Clear history (useful for testing or reset)
   */
  clearHistory(): void {
    this.history = {
      taskCreation: [],
      sessionStart: [],
      breakTime: []
    };
  }
}

// Export singleton instance
export const focusContentService = new FocusContentService();