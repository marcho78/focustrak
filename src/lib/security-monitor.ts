/**
 * Security monitoring for tracking suspicious activities
 */

import { createLogger } from './logger';

const logger = createLogger('SecurityMonitor');

interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit' | 'invalid_input' | 'suspicious_pattern';
  ip: string;
  path: string;
  timestamp: number;
  details?: any;
}

class SecurityMonitor {
  private events: Map<string, SecurityEvent[]> = new Map();
  private readonly MAX_EVENTS_PER_IP = 100;
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  
  constructor() {
    // Cleanup old events periodically
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }
  
  /**
   * Log a security event
   */
  logEvent(event: SecurityEvent) {
    const key = event.ip;
    const events = this.events.get(key) || [];
    
    events.push(event);
    
    // Keep only recent events
    if (events.length > this.MAX_EVENTS_PER_IP) {
      events.shift();
    }
    
    this.events.set(key, events);
    
    // Check for suspicious patterns
    this.checkSuspiciousActivity(event.ip);
    
    // Log the event
    logger.warn('Security event', {
      type: event.type,
      ip: event.ip,
      path: event.path,
      details: event.details
    });
  }
  
  /**
   * Check if an IP has suspicious activity
   */
  checkSuspiciousActivity(ip: string): boolean {
    const events = this.events.get(ip) || [];
    const recentEvents = events.filter(
      e => e.timestamp > Date.now() - 5 * 60 * 1000 // Last 5 minutes
    );
    
    // Suspicious patterns
    const authFailures = recentEvents.filter(e => e.type === 'auth_failure').length;
    const rateLimits = recentEvents.filter(e => e.type === 'rate_limit').length;
    
    if (authFailures > 5) {
      logger.error('Multiple auth failures detected', { ip, count: authFailures });
      return true;
    }
    
    if (rateLimits > 10) {
      logger.error('Excessive rate limit hits', { ip, count: rateLimits });
      return true;
    }
    
    return false;
  }
  
  /**
   * Get security stats for an IP
   */
  getStats(ip: string) {
    const events = this.events.get(ip) || [];
    const last24h = events.filter(
      e => e.timestamp > Date.now() - 24 * 60 * 60 * 1000
    );
    
    return {
      total: events.length,
      last24h: last24h.length,
      byType: {
        auth_failure: last24h.filter(e => e.type === 'auth_failure').length,
        rate_limit: last24h.filter(e => e.type === 'rate_limit').length,
        invalid_input: last24h.filter(e => e.type === 'invalid_input').length,
        suspicious_pattern: last24h.filter(e => e.type === 'suspicious_pattern').length,
      }
    };
  }
  
  /**
   * Check if IP should be blocked
   */
  shouldBlock(ip: string): boolean {
    const stats = this.getStats(ip);
    
    // Block if too many auth failures
    if (stats.byType.auth_failure > 10) return true;
    
    // Block if too many rate limits
    if (stats.byType.rate_limit > 50) return true;
    
    // Block if suspicious patterns detected
    if (stats.byType.suspicious_pattern > 5) return true;
    
    return false;
  }
  
  /**
   * Cleanup old events
   */
  private cleanup() {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [ip, events] of this.events.entries()) {
      const filtered = events.filter(e => e.timestamp > cutoff);
      
      if (filtered.length === 0) {
        this.events.delete(ip);
      } else {
        this.events.set(ip, filtered);
      }
    }
    
    logger.info('Security monitor cleanup completed', { 
      ipsTracked: this.events.size 
    });
  }
}

// Export singleton instance
export const securityMonitor = new SecurityMonitor();

/**
 * Helper to extract IP from request
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}