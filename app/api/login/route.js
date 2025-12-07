// In YOUR local Next.js app: app/api/login/route.js
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { usn, password } = await request.json();
    
    console.log('Login request for:', usn);
    
    // Forward the request to the real API
    const response = await fetch(
      'https://clg-bus-management-efz8l9uax-sssss1122-cells-projects.vercel.app/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usn, password }),
      }
    );
    
    const data = await response.json();
    
    // Return whatever the real API returns
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}