import { supabase } from '@/app/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { usn, password } = await request.json();
    
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('usn', usn.toUpperCase())
      .eq('password', password)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Invalid USN or password' }, { status: 401 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}