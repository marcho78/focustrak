/**
 * Environment variable validation
 * Ensures all required environment variables are set on application startup
 */

export interface RequiredEnvVars {
  // Database
  DATABASE_URL: string;
  
  // Auth0
  AUTH0_SECRET: string;
  AUTH0_BASE_URL: string;
  AUTH0_ISSUER_BASE_URL: string;
  AUTH0_CLIENT_ID: string;
  AUTH0_CLIENT_SECRET: string;
  
  // OpenAI
  OPENAI_API_KEY: string;
}

export interface OptionalEnvVars {
  // Database SSL
  DATABASE_SSL_CERT?: string;
  
  // OpenAI
  OPENAI_MAX_COMPLETION_TOKENS?: string;
  
  // App
  NEXT_PUBLIC_APP_NAME?: string;
  NEXT_PUBLIC_APP_VERSION?: string;
  NEXT_PUBLIC_APP_URL?: string;
  
  // Auth0 URLs
  AUTH0_REDIRECT_URI?: string;
  AUTH0_POST_LOGOUT_REDIRECT_URI?: string;
}

class EnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentError';
  }
}

/**
 * Validates that all required environment variables are set
 * Call this on application startup
 */
export function validateEnvironment(): void {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isLocalhost = process.env.AUTH0_BASE_URL?.includes('localhost');
  const isDevLocalhost = isDevelopment && isLocalhost;
  
  // In development on localhost, AUTH0_SECRET is optional
  const requiredVars: (keyof RequiredEnvVars)[] = [
    'DATABASE_URL',
    ...(isDevLocalhost ? [] : ['AUTH0_SECRET'] as (keyof RequiredEnvVars)[]),
    'AUTH0_BASE_URL',
    'AUTH0_ISSUER_BASE_URL',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET',
    'OPENAI_API_KEY',
  ];
  
  const missing: string[] = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    throw new EnvironmentError(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file or deployment environment variables.'
    );
  }
  
  // Warn about development mode
  if (isDevLocalhost && !process.env.AUTH0_SECRET) {
    console.warn('⚠️  Running in development mode without AUTH0_SECRET - using default secret');
    console.warn('⚠️  This is ONLY acceptable for localhost development');
  }
  
  // Validate URL formats
  try {
    new URL(process.env.DATABASE_URL!);
  } catch {
    throw new EnvironmentError('DATABASE_URL is not a valid URL');
  }
  
  try {
    new URL(process.env.AUTH0_BASE_URL!);
  } catch {
    throw new EnvironmentError('AUTH0_BASE_URL is not a valid URL');
  }
  
  try {
    new URL(process.env.AUTH0_ISSUER_BASE_URL!);
  } catch {
    throw new EnvironmentError('AUTH0_ISSUER_BASE_URL is not a valid URL');
  }
  
  // Validate AUTH0_SECRET length (must be at least 32 characters)
  if (process.env.AUTH0_SECRET!.length < 32) {
    throw new EnvironmentError('AUTH0_SECRET must be at least 32 characters long');
  }
  
  // Validate OpenAI API key format
  if (!process.env.OPENAI_API_KEY!.startsWith('sk-')) {
    console.warn('⚠️ OPENAI_API_KEY does not start with "sk-" - may be invalid');
  }
  
  // Log successful validation
  console.log('✅ Environment variables validated successfully');
}

/**
 * Get typed environment variables
 */
export function getEnv(): RequiredEnvVars & OptionalEnvVars {
  return {
    // Required
    DATABASE_URL: process.env.DATABASE_URL!,
    AUTH0_SECRET: process.env.AUTH0_SECRET!,
    AUTH0_BASE_URL: process.env.AUTH0_BASE_URL!,
    AUTH0_ISSUER_BASE_URL: process.env.AUTH0_ISSUER_BASE_URL!,
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID!,
    AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET!,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    
    // Optional
    DATABASE_SSL_CERT: process.env.DATABASE_SSL_CERT,
    OPENAI_MAX_COMPLETION_TOKENS: process.env.OPENAI_MAX_COMPLETION_TOKENS,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    AUTH0_REDIRECT_URI: process.env.AUTH0_REDIRECT_URI,
    AUTH0_POST_LOGOUT_REDIRECT_URI: process.env.AUTH0_POST_LOGOUT_REDIRECT_URI,
  };
}