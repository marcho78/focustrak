import { cookies } from 'next/headers';
import { query } from './db';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData, isValidSession } from './session';

export interface AuthenticatedUser {
  id: string;
  auth0Id: string;
  email: string;
  name?: string;
  picture?: string;
  settings: any;
  timezone: string;
}

/**
 * Get the authenticated user from the encrypted session cookie
 * Returns the user data or throws an error if not authenticated
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  // Get encrypted session
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  
  // Check if session exists and is valid
  if (!session.user || !isValidSession(session)) {
    throw new Error('Not authenticated');
  }
  
  const { sub: auth0Id } = session.user;
  
  // Get user from database with retry logic
  let userResult;
  try {
    userResult = await query(
      'SELECT * FROM users WHERE auth0_id = $1',
      [auth0Id],
      3 // Max 3 retries for auth queries
    );
  } catch (dbError) {
    console.error('Database error in getAuthenticatedUser:', dbError);
    throw new Error('Unable to verify authentication. Please try again.');
  }
  
  if (userResult.rows.length === 0) {
    throw new Error('User not found in database. Please try logging out and back in.');
  }
  
  const user = userResult.rows[0];
  
  return {
    id: user.id,
    auth0Id: user.auth0_id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    settings: user.settings,
    timezone: user.timezone
  };
}

/**
 * Try to get the authenticated user, returning null if not authenticated
 * Use this when authentication is optional
 */
export async function tryGetAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    return await getAuthenticatedUser();
  } catch (error) {
    return null;
  }
}
