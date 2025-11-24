import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request) {
  try {
    const { usn, password } = await request.json();

    if (!usn || !password) {
      return NextResponse.json(
        { success: false, message: 'USN and password are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('usn', usn.toUpperCase())
      .eq('password', password)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, message: 'Invalid USN or password' },
          { status: 401 }
        );
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { success: false, message: 'Invalid USN or password' },
        { status: 401 }
      );
    }

    // Return student data without password
    const { password: _, ...studentWithoutPassword } = data;

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: studentWithoutPassword  // 👈 FIXED: Changed from 'student' to 'data'
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}