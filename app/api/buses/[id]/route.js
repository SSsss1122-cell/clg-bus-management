// app/api/buses/[id]/route.js
import { supabase } from '../../../lib/supabase';

export async function GET(req, { params }) {
  const { id } = params;
  // get latest location for bus id
  const { data, error } = await supabase
    .from('bus_locations')
    .select('*')
    .eq('bus_id', id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Return a simple JSON
  return new Response(JSON.stringify(data || {}), { status: 200 });
}
