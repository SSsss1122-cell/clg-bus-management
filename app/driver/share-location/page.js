// app/driver/share-location/page.js
'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ShareLocation() {
  const params = useSearchParams();
  const busId = params.get('bus') || '';
  const [watchId, setWatchId] = useState(null);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (!busId) return;
    if (!('geolocation' in navigator)) {
      setStatus('geolocation-not-supported');
      return;
    }
    const id = navigator.geolocation.watchPosition(async (pos) => {
      const payload = {
        bus_id: Number(busId),
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        speed: pos.coords.speed ?? 0
      };
      await fetch('/api/live-location', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setStatus('sending');
    }, (err) => {
      console.error(err);
      setStatus('error');
    }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 });

    setWatchId(id);
    return () => {
      navigator.geolocation.clearWatch(id);
    };
  }, [busId]);

  return (
    <section>
      <h1>Share Location</h1>
      <div>Bus ID: {busId}</div>
      <div>Status: {status}</div>
      <p>Driver's location is being sent every time the geolocation updates.</p>
    </section>
  );
}
