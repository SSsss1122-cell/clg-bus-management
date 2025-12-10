// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export const runtime = 'nodejs';

// ========================
// 🔹 GET REQUEST
// ========================
export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const usn = searchParams.get("usn");
  const password = searchParams.get("password");

  if (!usn || !password) {
    return jsonResponse({
      success: false,
      message: "USN and password required"
    }, 400);
  }

  return await handleLogin(usn, password);
}

// ========================
// 🔹 POST REQUEST
// ========================
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (err) {
    return jsonResponse({ success: false, message: "Invalid JSON body" }, 400);
  }

  const { usn, password } = body;

  if (!usn || !password) {
    return jsonResponse({ success: false, message: "USN and password required" }, 400);
  }

  return await handleLogin(usn, password);
}

// ========================
// 🔹 COMMON LOGIN HANDLER
// ========================
async function handleLogin(usn, password) {
  try {
    const searchUSN = usn.toUpperCase();

    // Fetch the user from Supabase
    const { data: user, error } = await supabase
      .from("students")
      .select("*")
      .eq("usn", searchUSN)
      .eq("password", password)
      .single();

    if (error || !user) {
      return jsonResponse({
        success: false,
        message: "Invalid credentials"
      }, 401);
    }

    const { password: removed, ...student } = user;

    return jsonResponse({
      success: true,
      message: "Login successful",
      data: student
    }, 200);

  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Internal server error",
      error: err.message
    }, 500);
  }
}

// ========================
// 🔹 OPTIONS REQUEST
// ========================
export function OPTIONS() {
  return jsonResponse({}, 200);
}

// ========================
// 🔹 RESPONSE FORMATTER
// ========================
function jsonResponse(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // ✅ Allow mobile apps
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
