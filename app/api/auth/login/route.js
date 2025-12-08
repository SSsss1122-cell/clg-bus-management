import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(req) {
  const origin = req.headers.get('origin') || '*';
  try {
    const { usn, password } = await req.json();

    if (!usn || !password) {
      return NextResponse.json({ success: false, message: 'USN and password required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('usn', usn.toUpperCase())
      .eq('password', password)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    const { password: _, ...student } = data;

    return NextResponse.json({ success: true, message: 'Login successful', data: student }, { status: 200 });

  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
