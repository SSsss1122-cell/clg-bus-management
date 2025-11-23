// app/api/notices/route.js
import { supabase } from '../../../lib/supabase';

export async function GET() {
  const { data, error } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
}

export async function POST(req) {
  const { title, description, pdf_url } = await req.json();
  const { data, error } = await supabase.from('notices').insert([{ title, description, pdf_url }]);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 201 });
}
