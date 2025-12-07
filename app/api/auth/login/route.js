import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// OPTIONS (preflight) request
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// POST request
export async function POST(req) {
  try {
    // Parse JSON body
    const body = await req.json();  
    const { usn, password } = body;

    if (!usn || !password) {
      return new NextResponse(
        JSON.stringify({ success: false, message: "USN and password required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Query Supabase
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("usn", usn.toUpperCase())
      .eq("password", password)
      .single();

    if (error || !data) {
      return new NextResponse(
        JSON.stringify({ success: false, message: "Invalid credentials" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { password: _, ...student } = data;

    return new NextResponse(
      JSON.stringify({ success: true, message: "Login successful", data: student }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new NextResponse(
      JSON.stringify({ success: false, message: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
