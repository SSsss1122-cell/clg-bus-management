// app/api/auth/login/route.js
import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

// OPTIONS handler for CORS preflight - THIS IS CRITICAL
export async function OPTIONS(request) {
  const origin = request.headers.get('origin') || '*';
  
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400', // 24 hours
      'Vary': 'Origin', // Important for caching
    },
  });
}

// POST handler
export async function POST(request) {
  const origin = request.headers.get('origin') || '*';
  
  try {
    const { usn, password } = await request.json();

    console.log('🔐 API Login request:', { usn });

    if (!usn || !password) {
      return NextResponse.json(
        { success: false, message: "USN and password required" },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Content-Type': 'application/json',
          }
        }
      );
    }

    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("usn", usn.toUpperCase())
      .eq("password", password)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        {
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Content-Type': 'application/json',
          }
        }
      );
    }

    const { password: _, ...student } = data;

    return NextResponse.json(
      { 
        success: true, 
        message: "Login successful", 
        data: student 
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Content-Type': 'application/json',
        }
      }
    );

  } catch (err) {
    console.error('🔥 Login route error:', err);
    const origin = request.headers.get('origin') || '*';
    
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Content-Type': 'application/json',
        }
      }
    );
  }
}