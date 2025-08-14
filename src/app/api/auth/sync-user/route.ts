import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get session from cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth0_session');
    
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie.value);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }
    
    const { sub: auth0Id, email, name, picture } = sessionData.user;

    // Check if user exists
    const existingUser = await query(
      'SELECT * FROM users WHERE auth0_id = $1',
      [auth0Id]
    );

    let userId;
    
    if (existingUser.rows.length > 0) {
      // Update existing user
      const updateResult = await query(
        `UPDATE users 
         SET email = $1, name = $2, picture = $3, updated_at = NOW()
         WHERE auth0_id = $4
         RETURNING id`,
        [email, name, picture, auth0Id]
      );
      userId = updateResult.rows[0].id;
    } else {
      // Create new user
      const defaultSettings = {
        defaultSessionDuration: 1500, // 25 minutes
        breakDuration: 300, // 5 minutes
        longBreakDuration: 900, // 15 minutes
        soundEnabled: true,
        notificationsEnabled: true,
        theme: 'system',
        autoStartBreaks: false
      };

      const insertResult = await query(
        `INSERT INTO users (auth0_id, email, name, picture, settings, timezone)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          auth0Id,
          email,
          name,
          picture,
          JSON.stringify(defaultSettings),
          Intl.DateTimeFormat().resolvedOptions().timeZone
        ]
      );
      userId = insertResult.rows[0].id;
    }

    // Get the complete user record
    const userResult = await query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        auth0Id: user.auth0_id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        settings: user.settings,
        timezone: user.timezone,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    console.error('Failed to sync user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync user' },
      { status: 500 }
    );
  }
}