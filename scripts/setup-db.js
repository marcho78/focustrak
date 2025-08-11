const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('🚀 Starting database setup...');
    
    // Test connection first
    const testResult = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully at:', testResult.rows[0].current_time);

    // Add updated_at column to sessions table if it doesn't exist
    console.log('🔧 Adding updated_at column to sessions table...');
    
    try {
      await pool.query('ALTER TABLE sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
      console.log('✅ Added updated_at column to sessions table');
    } catch (error) {
      if (error.code === '42701') {
        console.log('ℹ️ Column updated_at already exists in sessions table');
      } else {
        throw error;
      }
    }

    // Verify the sessions table structure
    console.log('🔍 Verifying sessions table structure...');
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' 
      ORDER BY ordinal_position
    `);
    
    console.log('Sessions table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    console.log('');
    console.log('🎉 Database setup completed successfully!');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
