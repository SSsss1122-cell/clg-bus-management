import { supabase } from '@/app/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const studentData = await request.json();
    
    const { data, error } = await supabase
      .from('students')
      .insert([studentData])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}