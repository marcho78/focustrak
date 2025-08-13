import { query } from './db';
import { Task, TaskStep, Session, Distraction, Streak, User, TaskStatus, SessionStatus } from '@/types';

// User Services
export class UserService {
  static async createUser(email: string, settings = {}): Promise<User> {
    const result = await query(
      `INSERT INTO users (email, settings) VALUES ($1, $2) RETURNING *`,
      [email, JSON.stringify(settings)]
    );
    return this.mapUserFromDb(result.rows[0]);
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const result = await query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    return result.rows.length > 0 ? this.mapUserFromDb(result.rows[0]) : null;
  }

  static async getUserById(id: string): Promise<User | null> {
    const result = await query(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );
    return result.rows.length > 0 ? this.mapUserFromDb(result.rows[0]) : null;
  }

  private static mapUserFromDb(row: any): User {
    return {
      id: row.id,
      email: row.email,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      settings: row.settings,
      timezone: row.timezone
    };
  }
}

// Task Services
export class TaskService {
  static async createTask(userId: string, title: string, description?: string): Promise<Task> {
    const result = await query(
      `INSERT INTO tasks (user_id, title, description) VALUES ($1, $2, $3) RETURNING *`,
      [userId, title, description]
    );
    const task = this.mapTaskFromDb(result.rows[0]);
    task.steps = []; // Initialize empty steps
    return task;
  }

  static async getTaskById(id: string, includeSteps = true): Promise<Task | null> {
    const result = await query(
      `SELECT * FROM tasks WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) return null;
    
    const task = this.mapTaskFromDb(result.rows[0]);
    
    if (includeSteps) {
      task.steps = await this.getTaskSteps(id);
    }
    
    return task;
  }

  static async getUserTasks(userId: string, status?: TaskStatus): Promise<Task[]> {
    const whereClause = status ? 'WHERE user_id = $1 AND status = $2' : 'WHERE user_id = $1';
    const params = status ? [userId, status] : [userId];
    
    const result = await query(
      `SELECT * FROM tasks ${whereClause} ORDER BY created_at DESC`,
      params
    );
    
    const tasks = result.rows.map(row => this.mapTaskFromDb(row));
    
    // Get steps for each task
    for (const task of tasks) {
      task.steps = await this.getTaskSteps(task.id);
    }
    
    return tasks;
  }

  static async updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
    await query(
      `UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id]
    );
  }

  static async getTaskSteps(taskId: string): Promise<TaskStep[]> {
    const result = await query(
      `SELECT * FROM task_steps WHERE task_id = $1 ORDER BY order_index`,
      [taskId]
    );
    
    return result.rows.map(row => this.mapTaskStepFromDb(row));
  }

  static async createTaskSteps(taskId: string, steps: string[]): Promise<TaskStep[]> {
    const createdSteps: TaskStep[] = [];
    
    for (let i = 0; i < steps.length; i++) {
      const result = await query(
        `INSERT INTO task_steps (task_id, content, order_index) VALUES ($1, $2, $3) RETURNING *`,
        [taskId, steps[i], i]
      );
      createdSteps.push(this.mapTaskStepFromDb(result.rows[0]));
    }
    
    return createdSteps;
  }

  static async toggleTaskStep(stepId: string): Promise<void> {
    await query(
      `UPDATE task_steps SET done = NOT done, updated_at = NOW() WHERE id = $1`,
      [stepId]
    );
  }

  static async createTaskStep(taskId: string, content: string): Promise<TaskStep> {
    // Get the next order index
    const orderResult = await query(
      `SELECT COALESCE(MAX(order_index), -1) + 1 as next_order FROM task_steps WHERE task_id = $1`,
      [taskId]
    );
    const nextOrder = orderResult.rows[0].next_order;

    const result = await query(
      `INSERT INTO task_steps (task_id, content, order_index) VALUES ($1, $2, $3) RETURNING *`,
      [taskId, content, nextOrder]
    );
    
    return this.mapTaskStepFromDb(result.rows[0]);
  }

  static async deleteTaskStep(stepId: string): Promise<void> {
    await query(
      `DELETE FROM task_steps WHERE id = $1`,
      [stepId]
    );
  }

  static async updateTaskStep(stepId: string, content: string): Promise<void> {
    await query(
      `UPDATE task_steps SET content = $1, updated_at = NOW() WHERE id = $2`,
      [content, stepId]
    );
  }

  private static mapTaskFromDb(row: any): Task {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      dueAt: row.due_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      estimatedSessions: row.estimated_sessions,
      totalTimeSpent: row.total_time_spent || 0,
      steps: [] // Will be populated separately
    };
  }

  private static mapTaskStepFromDb(row: any): TaskStep {
    return {
      id: row.id,
      taskId: row.task_id,
      content: row.content,
      done: row.done,
      orderIndex: row.order_index,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

// Session Services
export class SessionService {
  static async createSession(userId: string, taskId?: string): Promise<Session> {
    const result = await query(
      `INSERT INTO sessions (user_id, task_id) VALUES ($1, $2) RETURNING *`,
      [userId, taskId]
    );
    return this.mapSessionFromDb(result.rows[0]);
  }

  static async getSessionById(id: string): Promise<Session | null> {
    const result = await query(
      `SELECT s.*, t.title as task_title FROM sessions s 
       LEFT JOIN tasks t ON s.task_id = t.id 
       WHERE s.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) return null;
    
    const session = this.mapSessionFromDb(result.rows[0]);
    session.distractions = await this.getSessionDistractions(id);
    
    return session;
  }

  static async updateSession(
    id: string, 
    updates: Partial<{
      endedAt: string;
      actualDuration: number;
      status: SessionStatus;
      completedSteps: number;
      notes: string;
    }>
  ): Promise<void> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey = key === 'endedAt' ? 'ended_at' : 
                     key === 'actualDuration' ? 'actual_duration' : 
                     key === 'completedSteps' ? 'completed_steps' : key;
        fields.push(`${dbKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length > 0) {
      fields.push('updated_at = NOW()');
      const sql = `UPDATE sessions SET ${fields.join(', ')} WHERE id = $${paramIndex}`;
      values.push(id);
      await query(sql, values);
    }
  }

  static async getUserSessions(userId: string, limit = 50): Promise<Session[]> {
    const result = await query(
      `SELECT s.*, t.title as task_title FROM sessions s 
       LEFT JOIN tasks t ON s.task_id = t.id 
       WHERE s.user_id = $1 
       ORDER BY s.started_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    
    return result.rows.map(row => this.mapSessionFromDb(row));
  }

  static async getTodaysSessions(userId: string): Promise<Session[]> {
    const result = await query(
      `SELECT s.*, t.title as task_title FROM sessions s 
       LEFT JOIN tasks t ON s.task_id = t.id 
       WHERE s.user_id = $1 AND DATE(s.started_at) = CURRENT_DATE 
       ORDER BY s.started_at DESC`,
      [userId]
    );
    
    return result.rows.map(row => this.mapSessionFromDb(row));
  }

  static async getSessionDistractions(sessionId: string): Promise<Distraction[]> {
    const result = await query(
      `SELECT * FROM distractions WHERE session_id = $1 ORDER BY created_at`,
      [sessionId]
    );
    
    return result.rows.map(row => this.mapDistractionFromDb(row));
  }

  private static mapSessionFromDb(row: any): Session {
    return {
      id: row.id,
      userId: row.user_id,
      taskId: row.task_id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      plannedDuration: row.planned_duration,
      actualDuration: row.actual_duration,
      status: row.status,
      notes: row.notes,
      completedSteps: row.completed_steps,
      totalSteps: row.total_steps,
      distractions: [] // Will be populated separately if needed
    };
  }

  private static mapDistractionFromDb(row: any): Distraction {
    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      content: row.content,
      createdAt: row.created_at,
      handled: row.handled
    };
  }
}

// Distraction Services
export class DistractionService {
  static async createDistraction(userId: string, sessionId: string, content: string): Promise<Distraction> {
    const result = await query(
      `INSERT INTO distractions (user_id, session_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [userId, sessionId, content]
    );
    return this.mapDistractionFromDb(result.rows[0]);
  }

  static async markDistractionHandled(id: string): Promise<void> {
    await query(
      `UPDATE distractions SET handled = true WHERE id = $1`,
      [id]
    );
  }

  private static mapDistractionFromDb(row: any): Distraction {
    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      content: row.content,
      createdAt: row.created_at,
      handled: row.handled
    };
  }
}

// Streak Services
export class StreakService {
  static async getUserStreak(userId: string): Promise<number> {
    const result = await query(
      `SELECT date FROM streaks 
       WHERE user_id = $1 AND started_sessions > 0 
       ORDER BY date DESC`,
      [userId]
    );
    
    if (result.rows.length === 0) return 0;
    
    let streak = 0;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (const row of result.rows) {
      const streakDate = new Date(row.date);
      streakDate.setHours(0, 0, 0, 0);
      
      // Check if this date is consecutive
      const expectedDate = new Date(currentDate);
      expectedDate.setDate(expectedDate.getDate() - streak);
      
      if (streakDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  static async getTodaysStats(userId: string): Promise<{ startedSessions: number; completedSessions: number; totalFocusTime: number }> {
    const result = await query(
      `SELECT started_sessions, completed_sessions, total_focus_time 
       FROM streaks 
       WHERE user_id = $1 AND date = CURRENT_DATE`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return { startedSessions: 0, completedSessions: 0, totalFocusTime: 0 };
    }
    
    const row = result.rows[0];
    return {
      startedSessions: row.started_sessions,
      completedSessions: row.completed_sessions,
      totalFocusTime: row.total_focus_time
    };
  }
}

// Demo user helper
export const DEMO_USER_EMAIL = 'demo@focusapp.com';

export async function getDemoUser(): Promise<User> {
  let user = await UserService.getUserByEmail(DEMO_USER_EMAIL);
  
  if (!user) {
    // Create demo user if doesn't exist
    user = await UserService.createUser(DEMO_USER_EMAIL, {
      defaultSessionDuration: 1500,
      soundEnabled: true,
      notificationsEnabled: true,
      theme: 'light'
    });
  }
  
  return user;
}
