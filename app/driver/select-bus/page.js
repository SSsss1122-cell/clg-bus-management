// app/driver/select-bus/page.js
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SelectBus() {
  const [buses, setBuses] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/buses')
      .then(r => r.json())
      .then(d => setBuses(d));
  }, []);

  return (
    <section>
      <h1>Select Bus (Driver)</h1>
      <ul>
        {buses.map(b => (
          <li key={b.id}>
            {b.bus_number} - {b.route_name}
            <button onClick={() => router.push(`/driver/share-location?bus=${b.id}`)}>Choose</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
