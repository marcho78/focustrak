/**
 * Next.js instrumentation file
 * Runs once when the server starts
 */

export async function register() {
  // Only run validation on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvironment } = await import('@/lib/env-validation');
    
    try {
      validateEnvironment();
      console.log('🚀 Application starting with validated environment');
    } catch (error) {
      console.error('❌ Environment validation failed:', error);
      // In production, we want to fail fast
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }
}