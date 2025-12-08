// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// Force JSON runtime (prevents HTML error responses)
export const runtime = 'nodejs';

export async function POST(req) {
  try {
    let body;

    // Parse request body safely
    try {
      body = await req.json();
    } catch (err) {
      return jsonResponse(
        { success: false, message: "Invalid JSON body" },
        400
      );
    }

    const { usn, password } = body;

    if (!usn || !password) {
      return jsonResponse(
        { success: false, message: "USN and password required" },
        400
      );
    }

    // Supabase query
    const { data: user, error } = await supabase
      .from("students")
      .select("*")
      .eq("usn", usn.toUpperCase())
      .eq("password", password)
      .single();

    if (error || !user) {
      return jsonResponse(
        { success: false, message: "Invalid credentials" },
        401
      );
    }

    // Remove password before sending response
    const { password: removed, ...student } = user;

    return jsonResponse(
      { success: true, message: "Login successful", data: student },
      200
    );

  } catch (err) {
    console.error("Fatal Login Error:", err);
    return jsonResponse(
      { success: false, message: "Internal server error", error: err.message },
      500
    );
  }
}

// CORS + JSON Response Helper
function jsonResponse(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// OPTIONS (for CORS)
export function OPTIONS() {
  return jsonResponse({}, 200);
}
