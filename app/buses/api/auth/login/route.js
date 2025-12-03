// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import bcrypt from 'bcryptjs'; // or use crypto

export async function POST(req) {
  try {
    const { usn, password } = await req.json();

    if (!usn || !password) {
      return NextResponse.json({ 
        success: false, 
        message: 'USN and password are required' 
      }, { status: 400 });
    }

    // First, get the student by USN
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('usn', usn.toUpperCase())
      .single();

    if (error || !student) {
      // Use generic message to avoid revealing if user exists
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid credentials' 
      }, { status: 401 });
    }

    // Compare hashed password
    const isPasswordValid = await bcrypt.compare(password, student.password_hash);
    
    if (!isPasswordValid) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid credentials' 
      }, { status: 401 });
    }

    // Remove password hash from response
    const { password_hash, ...studentWithoutPassword } = student;

    return NextResponse.json({ 
      success: true, 
      message: 'Login successful', 
      data: studentWithoutPassword 
    });

  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}