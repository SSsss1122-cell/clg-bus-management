// app/buses/[id]/page.js
'use client';
import { useState, useEffect } from 'react';


export default function BusLive({ params }) {
  const { id } = params;
  const [location, setLocation] = useState(null);

  useEffect(() => {
    // polling every 5s to keep it simple
    let mounted = true;
    async function fetchLocation() {
      const res = await fetch(`/api/buses/${id}`);
      const data = await res.json();
      if (mounted) setLocation(data);
    }
    fetchLocation();
    const iv = setInterval(fetchLocation, 5000);
    return () => { mounted = false; clearInterval(iv); };
  }, [id]);

  return (
    <section>
      <h1>Live: Bus {id}</h1>
      {location ? (
        <MapView center={[location.latitude, location.longitude]} marker={[location.latitude, location.longitude]} />
      ) : (
        <p>Loading location...</p>
      )}
    </section>
  );
}
