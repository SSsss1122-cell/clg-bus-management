// Create this file: app/api/test/route.js
import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.json(
    { 
      message: 'CORS test successful', 
      timestamp: new Date().toISOString(),
      cors: 'Enabled'
    },
    { status: 200 }
  );
  
  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}