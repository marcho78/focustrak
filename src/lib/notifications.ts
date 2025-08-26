export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  actions?: NotificationAction[];
  data?: any;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';
  
  private constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Check if notifications are supported in the current browser
   */
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    return 'Notification' in window && 
           'serviceWorker' in navigator &&
           'PushManager' in window;
  }

  /**
   * Check if notifications are supported (simpler check for basic notifications)
   */
  isBasicSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window;
  }

  /**
   * Get current permission status
   */
  getPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'default';
    }
    return Notification.permission;
  }

  /**
   * Request notification permission from the user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isBasicSupported()) {
      console.warn('Notifications are not supported in this browser');
      return 'denied';
    }

    try {
      // Modern browsers
      if ('requestPermission' in Notification) {
        const permission = await Notification.requestPermission();
        this.permission = permission;
        return permission;
      }
      
      // Fallback for older browsers
      return new Promise((resolve) => {
        Notification.requestPermission((permission) => {
          this.permission = permission;
          resolve(permission);
        });
      });
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Show a notification
   */
  async showNotification(options: NotificationOptions): Promise<Notification | null> {
    if (!this.isBasicSupported()) {
      console.warn('Notifications are not supported in this browser');
      return null;
    }

    // Check permission
    const permission = this.getPermission();
    
    if (permission !== 'granted') {
      console.warn('Notification permission not granted:', permission);
      return null;
    }

    try {
      // Try to use service worker for better reliability
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        
        // Use service worker notification API if available
        if ('showNotification' in registration) {
          await registration.showNotification(options.title, {
            body: options.body,
            icon: options.icon || '/favicon.ico',
            badge: options.badge || '/favicon.ico',
            tag: options.tag,
            requireInteraction: options.requireInteraction || false,
            silent: options.silent || false,
          });
          return null; // Service worker notifications don't return a Notification object
        }
      }

      // Fallback to basic Notification API
      // Note: Basic Notification API doesn't support actions or some other properties
      const notificationOptions: any = {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        data: options.data || {},
      };
      
      // Only add these if supported (not all browsers support all options)
      if ('requireInteraction' in Notification.prototype) {
        notificationOptions.requireInteraction = options.requireInteraction || false;
      }
      if ('silent' in Notification.prototype) {
        notificationOptions.silent = options.silent || false;
      }
      if ('badge' in Notification.prototype) {
        notificationOptions.badge = options.badge || '/favicon.ico';
      }
      
      const notification = new Notification(options.title, notificationOptions);

      // Auto-close notification after 10 seconds if not requiring interaction
      if (!options.requireInteraction) {
        setTimeout(() => notification.close(), 10000);
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  /**
   * Session-specific notification methods
   */
  async notifySessionStart(taskTitle: string, duration: number): Promise<void> {
    const minutes = Math.floor(duration / 60);
    await this.showNotification({
      title: '🎯 Focus Session Started',
      body: `Working on: ${taskTitle}\nDuration: ${minutes} minutes`,
      tag: 'session-start',
      requireInteraction: false,
    });
  }

  async notifySessionComplete(taskTitle: string, completedSteps: number): Promise<void> {
    await this.showNotification({
      title: '✅ Session Complete!',
      body: `Great work on: ${taskTitle}\nSteps completed: ${completedSteps}`,
      tag: 'session-complete',
      requireInteraction: false, // Changed to false since actions aren't supported in basic API
    });
  }

  async notifyBreakStart(duration: number): Promise<void> {
    const minutes = Math.floor(duration / 60);
    await this.showNotification({
      title: '☕ Break Time!',
      body: `Relax for ${minutes} minutes. You've earned it!`,
      tag: 'break-start',
      requireInteraction: false,
    });
  }

  async notifyBreakComplete(): Promise<void> {
    await this.showNotification({
      title: '⚡ Break Complete',
      body: 'Ready to get back to work?',
      tag: 'break-complete',
      requireInteraction: false, // Changed to false since actions aren't supported in basic API
    });
  }

  async notifyTimeWarning(remainingMinutes: number): Promise<void> {
    await this.showNotification({
      title: '⏰ Time Warning',
      body: `${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} remaining in your session`,
      tag: 'time-warning',
      requireInteraction: false,
      silent: true,
    });
  }

  async notifyStreak(streakCount: number): Promise<void> {
    await this.showNotification({
      title: '🔥 Streak Achievement!',
      body: `You're on a ${streakCount}-session streak! Keep it up!`,
      tag: 'streak',
      requireInteraction: false,
    });
  }

  /**
   * Clear all notifications with a specific tag
   */
  async clearNotifications(tag?: string): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      if ('getNotifications' in registration) {
        const notifications = await registration.getNotifications({ tag });
        notifications.forEach(n => n.close());
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Check and request permission if needed (for settings toggle)
   */
  async enableNotifications(): Promise<boolean> {
    const permission = await this.requestPermission();
    return permission === 'granted';
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Helper function for easy access
export const notify = (options: NotificationOptions) => 
  notificationService.showNotification(options);