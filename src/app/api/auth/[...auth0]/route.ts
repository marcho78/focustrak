import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';

// Simple auth route handlers for Auth0
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  
  // Handle different auth routes
  if (pathname.endsWith('/login')) {
    // Redirect to Auth0 login
    const state = crypto.randomUUID();
    
    // Store state in cookie for CSRF protection
    const cookieStore = await cookies();
    cookieStore.set('auth0_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/'
    });
    
    // Dynamically determine the redirect URL based on the current host
    const host = req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;
    
    const authUrl = `https://${process.env.AUTH0_ISSUER_BASE_URL!.replace('https://', '')}/authorize?` + 
      new URLSearchParams({
        response_type: 'code',
        client_id: process.env.AUTH0_CLIENT_ID!,
        redirect_uri: `${baseUrl}/api/auth/callback`,
        scope: 'openid profile email',
        state: state,
        prompt: 'select_account', // Force Google to show account selection
      });
    return NextResponse.redirect(authUrl);
  }
  
  if (pathname.endsWith('/logout')) {
    // Dynamically determine the return URL based on the current host
    const host = req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;
    
    // Clear session and redirect to Auth0 logout
    const response = NextResponse.redirect(
      `https://${process.env.AUTH0_ISSUER_BASE_URL!.replace('https://', '')}/v2/logout?` + 
      new URLSearchParams({
        client_id: process.env.AUTH0_CLIENT_ID!,
        returnTo: baseUrl,
      })
    );
    
    // Clear encrypted session
    const session = await getIronSession<SessionData>(cookies(), sessionOptions);
    session.destroy();
    
    // Clear other auth cookies
    response.cookies.delete('auth0_state');
    return response;
  }
  
  if (pathname.endsWith('/callback')) {
    // Handle Auth0 callback
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    
    if (!code) {
      return NextResponse.json({ error: 'No authorization code received' }, { status: 400 });
    }
    
    // Verify state for CSRF protection
    const cookieStore = await cookies();
    const storedState = cookieStore.get('auth0_state')?.value;
    
    if (!storedState || storedState !== state) {
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 });
    }
    
    try {
      // Dynamically determine the redirect URL based on the current host
      const host = req.headers.get('host');
      const protocol = req.headers.get('x-forwarded-proto') || 'http';
      const baseUrl = `${protocol}://${host}`;
      
      // Exchange code for tokens
      const tokenResponse = await fetch(`https://${process.env.AUTH0_ISSUER_BASE_URL!.replace('https://', '')}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: process.env.AUTH0_CLIENT_ID!,
          client_secret: process.env.AUTH0_CLIENT_SECRET!,
          code: code,
          redirect_uri: `${baseUrl}/api/auth/callback`,
        }),
      });
      
      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', await tokenResponse.text());
        return NextResponse.json({ error: 'Failed to exchange code for tokens' }, { status: 500 });
      }
      
      const tokens = await tokenResponse.json();
      
      // Get user info
      const userResponse = await fetch(`https://${process.env.AUTH0_ISSUER_BASE_URL!.replace('https://', '')}/userinfo`, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });
      
      if (!userResponse.ok) {
        console.error('Failed to get user info:', await userResponse.text());
        return NextResponse.json({ error: 'Failed to get user info' }, { status: 500 });
      }
      
      const user = await userResponse.json();
      
      // Create encrypted session
      const session = await getIronSession<SessionData>(cookies(), sessionOptions);
      
      // Store session data (automatically encrypted by iron-session)
      session.user = {
        sub: user.sub,
        email: user.email,
        name: user.name,
        picture: user.picture,
      };
      session.accessToken = tokens.access_token;
      session.idToken = tokens.id_token;
      session.expiresAt = Date.now() + (tokens.expires_in * 1000);
      
      await session.save();
      
      // Create response and clear state cookie
      const response = NextResponse.redirect(new URL('/', req.url));
      response.cookies.delete('auth0_state');
      
      // Trigger user sync after successful login
      // This will happen client-side
      
      return response;
    } catch (error) {
      console.error('Callback error:', error);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }
  }
  
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST(req: NextRequest) {
  return GET(req);
}