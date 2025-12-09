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

  return jsonResponse(
    {
      success: true,
      message: "GET request received",
      data: {
        usn: usn || null,
        password: password || null
      }
    },
    200
  );
}

// ========================
// 🔹 POST REQUEST
// ========================
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

    const searchUSN = usn.toUpperCase();

    // Check all students (debug)
    const { data: allStudents } = await supabase
      .from("students")
      .select("usn, password");

    // Actual login query
    const { data: user, error } = await supabase
      .from("students")
      .select("*")
      .eq("usn", searchUSN)
      .eq("password", password)
      .single();

    if (error || !user) {
      return jsonResponse(
        {
          success: false,
          message: "Invalid credentials",
          debug: {
            searchedUSN: searchUSN,
            searchedPassword: password,
            totalStudentsInDB: allStudents?.length || 0,
            error: error?.message
          }
        },
        401
      );
    }

    const { password: removed, ...student } = user;

    return jsonResponse(
      { success: true, message: "Login successful", data: student },
      200
    );

  } catch (err) {
    return jsonResponse(
      { success: false, message: "Internal server error", error: err.message },
      500
    );
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
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
