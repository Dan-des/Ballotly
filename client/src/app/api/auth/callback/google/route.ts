import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // User denied Google OAuth consent
  if (error || !code) {
    const reason = error === 'access_denied' ? 'access_denied' : 'missing_code';
    return NextResponse.redirect(new URL(`/login?error=${reason}`, req.nextUrl.origin));
  }

  try {
    // Step 1: Exchange authorization code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('[Google OAuth] Token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', req.nextUrl.origin));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Step 2: Fetch Google user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      console.error('[Google OAuth] Profile fetch failed:', await profileRes.text());
      return NextResponse.redirect(new URL('/login?error=profile_fetch_failed', req.nextUrl.origin));
    }

    const profile = await profileRes.json();

    // Step 3: Send user data to backend — creates or logs in user
    const backendRes = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: profile.name,
        email: profile.email,
        googleId: profile.id,
      }),
    });

    if (!backendRes.ok) {
      console.error('[Google OAuth] Backend auth failed');
      return NextResponse.redirect(new URL('/login?error=backend_auth_failed', req.nextUrl.origin));
    }

    const authData = await backendRes.json();

    // Step 4: Pass token and user to client via redirect with encoded query params
    // The client-side login page reads these and stores them in localStorage
    const redirectUrl = new URL('/dashboard', req.nextUrl.origin);
    redirectUrl.searchParams.set('token', authData.token);
    redirectUrl.searchParams.set('user', JSON.stringify(authData.user));

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error('[Google OAuth Callback Error]', err);
    return NextResponse.redirect(new URL('/login?error=server_error', req.nextUrl.origin));
  }
}
