// app/buses/page.js
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default async function BusesPage() {
  const { data: buses } = await supabase.from('buses').select('*').order('id');
  return (
    <section>
      <h1>Buses</h1>
      <div>
        {buses?.map(b => (
          <div key={b.id} style={{ padding: '8px', background: '#fff', marginBottom: 8 }}>
            <strong>{b.bus_number}</strong>
            <div>{b.route_name}</div>
            <Link href={`/buses/${b.id}`}>Track live</Link>
          </div>
        ))}
      </div>
    </section>
  );
}
