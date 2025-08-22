/**
 * Secure logging utility
 * Sanitizes sensitive information from logs
 */

// Patterns to detect sensitive data
const SENSITIVE_PATTERNS = [
  /sk-[A-Za-z0-9]{48}/gi,  // OpenAI API keys
  /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/gi,  // Bearer tokens
  /password['":\s]*['"]\S+['"]/gi,  // Passwords in various formats
  /client_secret['":\s]*['"]\S+['"]/gi,  // Client secrets
  /api[_-]?key['":\s]*['"]\S+['"]/gi,  // API keys
  /auth[_-]?token['":\s]*['"]\S+['"]/gi,  // Auth tokens
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,  // Email addresses
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,  // Credit card numbers
  /postgresql:\/\/[^@]+@/g,  // Database connection strings
];

// Fields to redact from objects
const SENSITIVE_FIELDS = new Set([
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'client_secret',
  'CLIENT_SECRET',
  'AUTH0_SECRET',
  'OPENAI_API_KEY',
  'DATABASE_URL',
  'authorization',
  'cookie',
  'set-cookie',
]);

/**
 * Sanitize a string by replacing sensitive patterns
 */
function sanitizeString(str: string): string {
  let sanitized = str;
  
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  
  return sanitized;
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH_EXCEEDED]';
  }
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: sanitizeString(obj.message),
      stack: process.env.NODE_ENV === 'development' ? sanitizeString(obj.stack || '') : '[STACK_HIDDEN]',
    };
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Check if field should be redacted
      if (SENSITIVE_FIELDS.has(key) || SENSITIVE_FIELDS.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(value, depth + 1);
      }
    }
    
    return sanitized;
  }
  
  return '[UNKNOWN_TYPE]';
}

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Secure logger class
 */
export class SecureLogger {
  private context: string;
  
  constructor(context: string) {
    this.context = context;
  }
  
  private log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const sanitizedData = data ? sanitizeObject(data) : undefined;
    
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message: sanitizeString(message),
      ...(sanitizedData && { data: sanitizedData }),
    };
    
    // In production, you might want to send to a logging service
    if (process.env.NODE_ENV === 'production') {
      // Only log warnings and errors in production
      if (level === LogLevel.WARN || level === LogLevel.ERROR) {
        console.log(JSON.stringify(logEntry));
      }
    } else {
      // In development, use colored console output
      const colorMap = {
        [LogLevel.DEBUG]: '\x1b[36m', // Cyan
        [LogLevel.INFO]: '\x1b[32m',  // Green
        [LogLevel.WARN]: '\x1b[33m',  // Yellow
        [LogLevel.ERROR]: '\x1b[31m', // Red
      };
      
      const color = colorMap[level];
      const reset = '\x1b[0m';
      
      console.log(
        `${color}[${timestamp}] [${level}] [${this.context}]${reset}`,
        message,
        sanitizedData || ''
      );
    }
  }
  
  debug(message: string, data?: any) {
    if (process.env.NODE_ENV !== 'production') {
      this.log(LogLevel.DEBUG, message, data);
    }
  }
  
  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }
  
  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }
  
  error(message: string, error?: any) {
    this.log(LogLevel.ERROR, message, error);
  }
}

/**
 * Create a logger instance for a specific context
 */
export function createLogger(context: string): SecureLogger {
  return new SecureLogger(context);
}