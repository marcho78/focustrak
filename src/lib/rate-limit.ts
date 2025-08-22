import { NextRequest } from 'next/server';
import { securityMonitor, getClientIp } from './security-monitor';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  uniqueTokenPerInterval?: number; // Number of unique tokens per interval
  interval?: number; // Time window in milliseconds
}

export function rateLimit(config: RateLimitConfig = {}) {
  const {
    uniqueTokenPerInterval = 10, // 10 requests
    interval = 60 * 1000, // per minute
  } = config;

  return async function checkRateLimit(
    request: NextRequest,
    identifier?: string
  ): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    // Use IP address or provided identifier
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    const key = identifier || ip;
    
    const now = Date.now();
    const resetTime = now + interval;

    // Get or create rate limit entry
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: resetTime,
      };
    }

    const entry = store[key];
    entry.count++;

    const remaining = Math.max(0, uniqueTokenPerInterval - entry.count);
    const success = entry.count <= uniqueTokenPerInterval;

    // Log rate limit hit if exceeded
    if (!success) {
      const clientIp = getClientIp(request);
      securityMonitor.logEvent({
        type: 'rate_limit',
        ip: clientIp,
        path: request.url,
        timestamp: Date.now(),
        details: { 
          identifier: key,
          limit: uniqueTokenPerInterval,
          count: entry.count 
        }
      });
    }

    return {
      success,
      limit: uniqueTokenPerInterval,
      remaining,
      reset: entry.resetTime,
    };
  };
}

// Pre-configured rate limiters for different endpoints
export const apiRateLimit = rateLimit({
  uniqueTokenPerInterval: 20, // 20 requests per minute for general API
  interval: 60 * 1000,
});

export const aiRateLimit = rateLimit({
  uniqueTokenPerInterval: 5, // 5 AI requests per minute (expensive operations)
  interval: 60 * 1000,
});

export const authRateLimit = rateLimit({
  uniqueTokenPerInterval: 5, // 5 auth attempts per minute
  interval: 60 * 1000,
});