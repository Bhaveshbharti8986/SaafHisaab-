// frontend/middleware.js
import { NextResponse } from 'next/server';

export async function middleware(request) {
  const url = new URL(request.url);

  // 1. Intercept any request that goes to /api
  if (url.pathname.startsWith('/api')) {
    const backendUrl = process.env.VITE_BACKEND_URL;

    // Fallback error if you forgot to add the environment variable in Vercel
    if (!backendUrl) {
      return new Response(
        JSON.stringify({ error: "System Configuration Error: VITE_BACKEND_URL is missing in Vercel Dashboard Settings." }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }

    // 2. Format the real target URL securely
    const cleanBackendUrl = backendUrl.replace(/\/$/, '');
    const targetPath = url.pathname + url.search;
    
    // Rewrites '/api/users' to 'https://your-backend.com' (or whatever path matching your server uses)
    const targetUrl = `${cleanBackendUrl}${targetPath}`;

    // 3. Inform Vercel to route the request transparently behind the scenes
    return NextResponse.rewrite(new URL(targetUrl));
  }
}
