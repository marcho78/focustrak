const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function cleanupDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('🧹 Starting database cleanup...');
    
    // Get all incomplete tasks (not completed)
    const incompleteTasks = await pool.query(`
      SELECT id, title, status FROM tasks 
      WHERE status != 'completed' OR status IS NULL
    `);
    
    console.log(`📋 Found ${incompleteTasks.rows.length} incomplete tasks to clean up:`);
    incompleteTasks.rows.forEach(task => {
      console.log(`  - ${task.title} (${task.status})`);
    });
    
    if (incompleteTasks.rows.length === 0) {
      console.log('✨ Database is already clean!');
      return;
    }
    
    const taskIds = incompleteTasks.rows.map(task => task.id);
    const placeholders = taskIds.map((_, index) => `$${index + 1}`).join(', ');
    
    // Delete in the correct order to respect foreign key constraints
    
    // 1. Delete distractions first
    const distractionsResult = await pool.query(`
      DELETE FROM distractions 
      WHERE session_id IN (
        SELECT id FROM sessions WHERE task_id IN (${placeholders})
      )
    `, taskIds);
    console.log(`🗑️  Deleted ${distractionsResult.rowCount} distractions`);
    
    // 2. Delete sessions
    const sessionsResult = await pool.query(`
      DELETE FROM sessions 
      WHERE task_id IN (${placeholders})
    `, taskIds);
    console.log(`🗑️  Deleted ${sessionsResult.rowCount} sessions`);
    
    // 3. Delete task steps
    const stepsResult = await pool.query(`
      DELETE FROM task_steps 
      WHERE task_id IN (${placeholders})
    `, taskIds);
    console.log(`🗑️  Deleted ${stepsResult.rowCount} task steps`);
    
    // 4. Delete tasks
    const tasksResult = await pool.query(`
      DELETE FROM tasks 
      WHERE id IN (${placeholders})
    `, taskIds);
    console.log(`🗑️  Deleted ${tasksResult.rowCount} tasks`);
    
    console.log('✅ Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await pool.end();
  }
}

// Run the cleanup
cleanupDatabase();
