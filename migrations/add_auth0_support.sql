-- Add Auth0 support to users table
-- This migration adds auth0_id field to link Auth0 users with our database

-- Add auth0_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth0_id VARCHAR(255) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth0_id ON users(auth0_id);

-- Make email optional since Auth0 provides it
ALTER TABLE users 
ALTER COLUMN email DROP NOT NULL;

-- Add name field from Auth0 profile
ALTER TABLE users
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Add picture URL from Auth0 profile
ALTER TABLE users
ADD COLUMN IF NOT EXISTS picture VARCHAR(500);

-- Update settings to be JSONB for better querying (if not already)
ALTER TABLE users 
ALTER COLUMN settings TYPE JSONB USING settings::JSONB;

-- Set default settings if null
UPDATE users 
SET settings = '{}'::JSONB 
WHERE settings IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.auth0_id IS 'Auth0 user ID (sub claim from JWT)';
COMMENT ON COLUMN users.name IS 'User display name from Auth0 profile';
COMMENT ON COLUMN users.picture IS 'User avatar URL from Auth0 profile';