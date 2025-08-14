import { NextResponse } from 'next/server';
import { testConnection, getPoolStats } from '@/lib/db';

export async function GET() {
  try {
    const isDbHealthy = await testConnection();
    const poolStats = getPoolStats();
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        connected: isDbHealthy,
        status: isDbHealthy ? 'healthy' : 'unhealthy',
        pool: poolStats
      }
    }, {
      status: isDbHealthy ? 200 : 503
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, {
      status: 503
    });
  }
}
