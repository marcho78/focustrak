import { Pool } from 'pg';

// Create a singleton pool instance
let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      // Improved connection pool settings for better reliability
      max: 20, // Maximum number of connections (increased)
      min: 2, // Minimum number of connections to maintain
      idleTimeoutMillis: 60000, // Keep idle connections longer (60 seconds)
      connectionTimeoutMillis: 10000, // Longer timeout for connecting (10 seconds)
      acquireTimeoutMillis: 10000, // Timeout for acquiring a connection from pool
      statementTimeout: 30000, // Timeout for individual queries (30 seconds)
      query_timeout: 30000, // Alternative query timeout
      keepAlive: true, // Enable TCP keep-alive
      keepAliveInitialDelayMillis: 10000, // Initial delay for keep-alive
    });

    // Handle pool errors with more detailed logging
    pool.on('error', (err) => {
      console.error('❌ Unexpected error on idle client:', {
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
    });
    
    // Log pool connection events in development
    if (process.env.NODE_ENV === 'development') {
      pool.on('connect', () => {
        console.log('🔌 New client connected to database');
      });
      
      pool.on('acquire', () => {
        console.log('📥 Client acquired from pool');
      });
      
      pool.on('release', () => {
        console.log('📤 Client released back to pool');
      });
    }

    // Graceful shutdown
    process.on('SIGINT', () => {
      pool?.end();
    });

    process.on('SIGTERM', () => {
      pool?.end();
    });
  }

  return pool;
}

// Helper function to execute queries with retry logic
export async function query(text: string, params?: any[], maxRetries: number = 3) {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const pool = getDbPool();
      const client = await pool.connect();
      
      try {
        const result = await client.query(text, params);
        return result;
      } finally {
        client.release();
      }
    } catch (error) {
      lastError = error as Error;
      console.error(`Database query attempt ${attempt}/${maxRetries} failed:`, {
        error: lastError.message,
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params ? params.length : 0
      });
      
      // Don't retry on certain types of errors
      if (isNonRetryableError(lastError)) {
        console.error('Non-retryable error detected, not retrying:', lastError.message);
        throw lastError;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 second delay
        console.log(`Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError!;
}

// Check if an error should not be retried
function isNonRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Don't retry on syntax errors, constraint violations, etc.
  return (
    message.includes('syntax error') ||
    message.includes('duplicate key') ||
    message.includes('violates') ||
    message.includes('invalid input') ||
    message.includes('permission denied') ||
    message.includes('authentication failed')
  );
}

// Helper function to execute transactions
export async function transaction(callback: (client: any) => Promise<any>) {
  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Get connection pool statistics
export function getPoolStats() {
  const currentPool = getDbPool();
  return {
    totalCount: currentPool.totalCount,
    idleCount: currentPool.idleCount,
    waitingCount: currentPool.waitingCount,
    timestamp: new Date().toISOString()
  };
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as current_time');
    const stats = getPoolStats();
    console.log('✅ Database connected successfully at:', result.rows[0].current_time);
    console.log('📊 Pool stats:', stats);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('📊 Pool stats at failure:', getPoolStats());
    return false;
  }
}
