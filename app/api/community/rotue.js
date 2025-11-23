// app/api/community/route.js
import { supabase } from '../../../lib/supabase';

export async function GET() {
  const { data, error } = await supabase.from('community_messages').select('*').order('created_at', { ascending: true }).limit(200);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
}

export async function POST(req) {
  const { username, message } = await req.json();
  const { data, error } = await supabase.from('community_messages').insert([{ username, message }]);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 201 });
}
