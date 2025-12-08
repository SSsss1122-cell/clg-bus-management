// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export const runtime = 'nodejs';

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

    // 🔍 STEP 1: Check what we're searching for
    const searchUSN = usn.toUpperCase();
    console.log("=== LOGIN ATTEMPT ===");
    console.log("Searching for USN:", searchUSN);
    console.log("Password provided:", password);

    // 🔍 STEP 2: First, let's see ALL students (for debugging)
    const { data: allStudents, error: allError } = await supabase
      .from("students")
      .select("usn, password");
    
    console.log("All students in DB:", allStudents);

    // 🔍 STEP 3: Now try the actual query
    const { data: user, error } = await supabase
      .from("students")
      .select("*")
      .eq("usn", searchUSN)
      .eq("password", password)
      .single();

    console.log("Query error:", error);
    console.log("User found:", user);

    if (error || !user) {
      return jsonResponse(
        { 
          success: false, 
          message: "Invalid credentials",
          // 🔍 DEBUG INFO (remove this in production)
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