/**
 * Input validation and sanitization utilities
 */

// Sanitize string input - remove dangerous characters
export function sanitizeString(input: unknown, maxLength = 1000): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove null bytes, control characters, and trim
  return input
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim()
    .slice(0, maxLength); // Enforce max length
}

// Validate and sanitize task title
export function validateTaskTitle(title: unknown): { valid: boolean; value: string; error?: string } {
  const sanitized = sanitizeString(title, 200);
  
  if (!sanitized) {
    return { valid: false, value: '', error: 'Task title is required' };
  }
  
  if (sanitized.length < 2) {
    return { valid: false, value: sanitized, error: 'Task title must be at least 2 characters' };
  }
  
  // Check for potential injection attempts
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /SELECT.*FROM/i,
    /DROP.*TABLE/i,
    /INSERT.*INTO/i,
    /DELETE.*FROM/i,
    /UPDATE.*SET/i,
    /--/,
    /\/\*/,
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(sanitized))) {
    return { valid: false, value: sanitized, error: 'Invalid characters in task title' };
  }
  
  return { valid: true, value: sanitized };
}

// Validate task description
export function validateTaskDescription(description: unknown): { valid: boolean; value: string } {
  const sanitized = sanitizeString(description, 2000);
  return { valid: true, value: sanitized };
}

// Validate array of steps
export function validateSteps(steps: unknown): { valid: boolean; value: string[]; error?: string } {
  if (!Array.isArray(steps)) {
    return { valid: false, value: [], error: 'Steps must be an array' };
  }
  
  if (steps.length > 20) {
    return { valid: false, value: [], error: 'Too many steps (max 20)' };
  }
  
  const sanitizedSteps = steps
    .filter(step => typeof step === 'string')
    .map(step => sanitizeString(step, 500))
    .filter(step => step.length > 0);
  
  return { valid: true, value: sanitizedSteps };
}

// Validate email
export function validateEmail(email: unknown): { valid: boolean; value: string; error?: string } {
  const sanitized = sanitizeString(email, 254);
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return { valid: false, value: sanitized, error: 'Invalid email format' };
  }
  
  return { valid: true, value: sanitized.toLowerCase() };
}

// Validate UUID
export function validateUUID(uuid: unknown): { valid: boolean; value: string; error?: string } {
  const sanitized = sanitizeString(uuid, 36);
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sanitized)) {
    return { valid: false, value: sanitized, error: 'Invalid UUID format' };
  }
  
  return { valid: true, value: sanitized.toLowerCase() };
}

// Validate integer within range
export function validateInteger(
  value: unknown, 
  min: number, 
  max: number
): { valid: boolean; value: number; error?: string } {
  const num = Number(value);
  
  if (isNaN(num) || !Number.isInteger(num)) {
    return { valid: false, value: 0, error: 'Must be an integer' };
  }
  
  if (num < min || num > max) {
    return { valid: false, value: num, error: `Must be between ${min} and ${max}` };
  }
  
  return { valid: true, value: num };
}