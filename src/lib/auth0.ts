import { Auth0Client } from '@auth0/nextjs-auth0/server';

// Initialize Auth0 client for server-side usage
export const auth0 = new Auth0Client({
  domain: process.env.AUTH0_ISSUER_BASE_URL!.replace('https://', ''), // Remove https:// prefix
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  secret: process.env.AUTH0_SECRET!,
  appBaseUrl: process.env.AUTH0_BASE_URL!, // Changed from baseURL to appBaseUrl
});