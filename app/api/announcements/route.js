// app/api/announcements/route.js
import { supabase } from '../../lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data || []), { status: 200 });
}