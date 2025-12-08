// proxy.ts
import type { NextRequest } from 'next/server';

export const config = {
  matcher: '/api/:path*',
};

export async function proxy(request: NextRequest) {
  const backend = "https://clg-bus-management-gsic.vercel.app";
  const targetUrl = `${backend}${request.nextUrl.pathname}${request.nextUrl.search}`;
  
  console.log(`\n🌐 PROXY: ${request.method} ${request.url}`);
  console.log(`   ↪️  Target: ${targetUrl}`);
  
  // Get request body
  let body: string | null = null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text();
    console.log(`   📦 Body: ${body}`);
  }
  
  try {
    // Prepare headers
    const headers = new Headers(request.headers);
    
    // Remove headers that might cause issues
    headers.delete('host');
    headers.delete('origin');
    headers.delete('referer');
    
    // Ensure content-type
    if (body && !headers.get('content-type')) {
      headers.set('content-type', 'application/json');
    }
    
    console.log(`   📋 Headers sent:`, Object.fromEntries(headers.entries()));
    
    // Make the fetch request
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: body,
      // Add duplex for Node.js 18+ if there's a body
      ...(body ? { duplex: 'half' as any } : {})
    });
    
    // Get response text
    const responseText = await response.text();
    
    console.log(`   ✅ Response Status: ${response.status} ${response.statusText}`);
    console.log(`   📄 Response Preview: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
    
    // Return the response
    return new Response(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    
  } catch (error: any) {
    console.log(`   ❌ Fetch Error: ${error.message}`);
    
    // If fetch fails, return a helpful error
    return new Response(JSON.stringify({
      success: false,
      message: 'Backend request failed',
      error: error.message,
      debug: {
        targetUrl,
        method: request.method,
        hasBody: !!body
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}