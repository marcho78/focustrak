const dotenv = require('dotenv');
const { query, testConnection, transaction } = require('../src/lib/db');

// Load environment variables
dotenv.config({ path: '.env.local' });

async function createTables() {
  console.log('📝 Creating database tables...');

  const schema = `
    -- Drop existing tables (in reverse dependency order)
    DROP TABLE IF EXISTS implementation_intentions CASCADE;
    DROP TABLE IF EXISTS streaks CASCADE;
    DROP TABLE IF EXISTS distractions CASCADE;
    DROP TABLE IF EXISTS sessions CASCADE;
    DROP TABLE IF EXISTS task_steps CASCADE;
    DROP TABLE IF EXISTS tasks CASCADE;
    DROP TABLE IF EXISTS users CASCADE;

    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Users table
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      settings JSONB DEFAULT '{}',
      timezone VARCHAR(50) DEFAULT 'UTC'
    );

    -- Tasks table
    CREATE TABLE tasks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, paused
      priority INTEGER DEFAULT 2, -- 1=low, 2=medium, 3=high
      due_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      estimated_sessions INTEGER DEFAULT 1
    );

    -- Task steps (AI-generated micro-steps)
    CREATE TABLE task_steps (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      done BOOLEAN DEFAULT FALSE,
      order_index INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Focus sessions
    CREATE TABLE sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
      started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      ended_at TIMESTAMP WITH TIME ZONE,
      planned_duration INTEGER DEFAULT 1500, -- 25 minutes in seconds
      actual_duration INTEGER,
      status VARCHAR(20) DEFAULT 'active', -- active, completed, skipped, paused
      notes TEXT,
      completed_steps INTEGER DEFAULT 0,
      total_steps INTEGER DEFAULT 0,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Distraction capture during sessions
    CREATE TABLE distractions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      handled BOOLEAN DEFAULT FALSE
    );

    -- Daily streaks tracking
    CREATE TABLE streaks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      started_sessions INTEGER DEFAULT 0,
      completed_sessions INTEGER DEFAULT 0,
      total_focus_time INTEGER DEFAULT 0, -- in seconds
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, date)
    );

    -- Implementation intentions (behavior change feature)
    CREATE TABLE implementation_intentions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      trigger_text TEXT NOT NULL, -- "If I get distracted"
      action_text TEXT NOT NULL, -- "then I will close tab"
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Indexes for performance
    CREATE INDEX idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX idx_tasks_status ON tasks(status);
    CREATE INDEX idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX idx_sessions_started_at ON sessions(started_at);
    CREATE INDEX idx_distractions_session_id ON distractions(session_id);
    CREATE INDEX idx_streaks_user_date ON streaks(user_id, date);
  `;

  await query(schema);
  console.log('✅ Tables created successfully');
}

async function createTriggers() {
  console.log('⚡ Creating database triggers...');

  const triggerSQL = `
    -- Function for streak calculation
    CREATE OR REPLACE FUNCTION update_streak()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO streaks (user_id, date, started_sessions, completed_sessions, total_focus_time)
      VALUES (
        NEW.user_id,
        DATE(NEW.started_at),
        CASE WHEN NEW.status = 'active' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
        COALESCE(NEW.actual_duration, 0)
      )
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        started_sessions = streaks.started_sessions + CASE WHEN NEW.status = 'active' AND OLD.status != 'active' THEN 1 ELSE 0 END,
        completed_sessions = streaks.completed_sessions + CASE WHEN NEW.status = 'completed' AND OLD.status != 'completed' THEN 1 ELSE 0 END,
        total_focus_time = streaks.total_focus_time + CASE WHEN NEW.actual_duration IS NOT NULL AND OLD.actual_duration IS NULL THEN NEW.actual_duration ELSE 0 END;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Drop existing trigger if exists
    DROP TRIGGER IF EXISTS session_streak_trigger ON sessions;

    -- Trigger to automatically update streaks
    CREATE TRIGGER session_streak_trigger
      AFTER INSERT OR UPDATE ON sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_streak();
  `;

  await query(triggerSQL);
  console.log('✅ Triggers created successfully');
}

async function populateSampleData() {
  console.log('🌱 Populating sample data...');

  await transaction(async (client: any) => {
    // Create sample user
    const userResult = await client.query(`
      INSERT INTO users (email, settings, timezone)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [
      'demo@focusapp.com',
      JSON.stringify({
        defaultSessionDuration: 1500,
        soundEnabled: true,
        notificationsEnabled: true,
        theme: 'light',
        breakDuration: 300,
        longBreakDuration: 900,
        autoStartBreaks: false
      }),
      'America/New_York'
    ]);

    const userId = userResult.rows[0].id;
    console.log('👤 Created demo user:', userId);

    // Create sample tasks
    const tasks = [
      {
        title: 'Write project proposal',
        description: 'Draft the quarterly project proposal for the new features',
        priority: 3,
        due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        estimated_sessions: 3
      },
      {
        title: 'Review code submissions',
        description: 'Review and provide feedback on team code submissions',
        priority: 2,
        estimated_sessions: 2
      },
      {
        title: 'Study React patterns',
        description: 'Learn advanced React patterns and best practices',
        priority: 1,
        estimated_sessions: 5
      },
      {
        title: 'Organize desk and workspace',
        description: 'Clean and organize the home office for better productivity',
        priority: 1,
        estimated_sessions: 1
      }
    ];

    const taskIds = [];
    for (const task of tasks) {
      const taskResult = await client.query(`
        INSERT INTO tasks (user_id, title, description, priority, due_at, estimated_sessions)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [userId, task.title, task.description, task.priority, task.due_at, task.estimated_sessions]);
      
      taskIds.push(taskResult.rows[0].id);
    }

    console.log('📋 Created', taskIds.length, 'sample tasks');

    // Create task steps for each task
    const taskSteps = [
      // Write project proposal
      [
        'Research project requirements and scope',
        'Create outline with key sections',
        'Write first draft of introduction',
        'Draft technical implementation plan',
        'Review and refine the proposal'
      ],
      // Review code submissions
      [
        'Set up development environment',
        'Review first submission for logic errors',
        'Check code style and formatting',
        'Test functionality and edge cases',
        'Provide constructive feedback'
      ],
      // Study React patterns
      [
        'Find high-quality learning resources',
        'Read about component composition patterns',
        'Practice with render props pattern',
        'Implement higher-order components',
        'Build sample project using new patterns'
      ],
      // Organize desk
      [
        'Clear all items from desk surface',
        'Sort items into keep/donate/trash piles',
        'Clean desk surface thoroughly',
        'Organize remaining items in proper places',
        'Set up optimal workspace layout'
      ]
    ];

    for (let i = 0; i < taskIds.length; i++) {
      const taskId = taskIds[i];
      const steps = taskSteps[i];
      
      for (let j = 0; j < steps.length; j++) {
        await client.query(`
          INSERT INTO task_steps (task_id, content, order_index)
          VALUES ($1, $2, $3)
        `, [taskId, steps[j], j]);
      }
    }

    console.log('📝 Created task steps for all tasks');

    // Create sample sessions (some completed, some in progress)
    const sessions = [
      {
        task_id: taskIds[0],
        started_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        ended_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000), // +25 minutes
        actual_duration: 1500,
        status: 'completed',
        completed_steps: 2,
        total_steps: 5
      },
      {
        task_id: taskIds[1],
        started_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        ended_at: new Date(Date.now() - 24 * 60 * 60 * 1000 + 20 * 60 * 1000), // +20 minutes
        actual_duration: 1200,
        status: 'completed',
        completed_steps: 1,
        total_steps: 5
      },
      {
        task_id: taskIds[2],
        started_at: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        ended_at: new Date(Date.now() - 35 * 60 * 1000), // +25 minutes
        actual_duration: 1500,
        status: 'completed',
        completed_steps: 1,
        total_steps: 5
      }
    ];

    const sessionIds = [];
    for (const session of sessions) {
      const sessionResult = await client.query(`
        INSERT INTO sessions (user_id, task_id, started_at, ended_at, actual_duration, status, completed_steps, total_steps)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        userId,
        session.task_id,
        session.started_at,
        session.ended_at,
        session.actual_duration,
        session.status,
        session.completed_steps,
        session.total_steps
      ]);
      
      sessionIds.push(sessionResult.rows[0].id);
    }

    console.log('⏱️ Created', sessionIds.length, 'sample sessions');

    // Create sample distractions
    const distractions = [
      { session_id: sessionIds[0], content: 'Check email about meeting tomorrow' },
      { session_id: sessionIds[0], content: 'Remember to call dentist for appointment' },
      { session_id: sessionIds[1], content: 'Look up restaurant for dinner plans' },
      { session_id: sessionIds[2], content: 'Check weather forecast for weekend' },
      { session_id: sessionIds[2], content: 'Reply to text message from friend' }
    ];

    for (const distraction of distractions) {
      await client.query(`
        INSERT INTO distractions (user_id, session_id, content, handled)
        VALUES ($1, $2, $3, $4)
      `, [userId, distraction.session_id, distraction.content, Math.random() > 0.5]);
    }

    console.log('💭 Created', distractions.length, 'sample distractions');

    // Create sample implementation intentions
    const intentions = [
      {
        trigger_text: 'If I get distracted by social media',
        action_text: 'then I will close the tab and write down the thought'
      },
      {
        trigger_text: 'If I feel overwhelmed by the task size',
        action_text: 'then I will break it into smaller 2-minute actions'
      },
      {
        trigger_text: 'If I want to check my phone',
        action_text: 'then I will put it in another room for 10 minutes'
      }
    ];

    for (const intention of intentions) {
      await client.query(`
        INSERT INTO implementation_intentions (user_id, trigger_text, action_text)
        VALUES ($1, $2, $3)
      `, [userId, intention.trigger_text, intention.action_text]);
    }

    console.log('🎯 Created', intentions.length, 'implementation intentions');

    console.log('✅ Sample data population completed!');
    return userId;
  });
}

async function main() {
  try {
    console.log('🚀 Starting database setup...');
    
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }

    // Set up database
    await createTables();
    await createTriggers();
    await populateSampleData();

    console.log('');
    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log('- ✅ Database tables created');
    console.log('- ✅ Triggers and functions set up');
    console.log('- ✅ Sample user created (demo@focusapp.com)');
    console.log('- ✅ 4 sample tasks with steps');
    console.log('- ✅ 3 completed focus sessions');
    console.log('- ✅ Sample distractions and intentions');
    console.log('');
    console.log('🔗 Your database is ready to use!');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
main();
