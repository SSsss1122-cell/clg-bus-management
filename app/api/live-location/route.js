// app/api/live-location/route.js
import { supabase } from '../../../lib/supabase';

export async function POST(req) {
  try {
    const body = await req.json();
    const { bus_id, latitude, longitude, speed } = body;
    const { data, error } = await supabase.from('bus_locations').insert([{ bus_id, latitude, longitude, speed }]);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify({ ok: true, inserted: data }), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
}
