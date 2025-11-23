// app/api/buses/route.js
import { supabase } from '../../../lib/supabase';

export async function GET(req) {
  const { data, error } = await supabase.from('buses').select('*').order('id');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
}
