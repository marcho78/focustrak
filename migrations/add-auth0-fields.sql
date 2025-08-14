-- Migration: Add Auth0 fields to users table
-- Run this migration to support proper authentication

-- Add Auth0 fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth0_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS picture TEXT;

-- Create index for Auth0 ID lookups
CREATE INDEX IF NOT EXISTS idx_users_auth0_id ON users(auth0_id);

-- Update existing demo user to have an auth0_id (optional - for backward compatibility)
-- UPDATE users SET auth0_id = 'demo-user-auth0-id' WHERE email = 'demo@focusapp.com';
