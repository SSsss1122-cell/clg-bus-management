// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export const runtime = 'nodejs';

// Add this GET handler
export async function GET(req) {
  return jsonResponse(
    { 
      success: false, 
      message: "Please use POST method to login",
      endpoint: "/api/auth/login",
      method: "POST",
      requiredFields: ["usn", "password"]
    },
    405 // Method Not Allowed
  );
}

export async function POST(req) {
  try {
    let body;

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

function jsonResponse(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export function OPTIONS() {
  return jsonResponse({}, 200);
}