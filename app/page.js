// app/page.js
import { supabase } from './lib/supabase';
import ClientHome from './client-home';


export default async function Home() {
  // Fetch buses with their latest locations
  const { data: buses, error } = await supabase
    .from('buses')
    .select(`
      *,
      bus_locations (
        latitude,
        longitude,
        updated_at
      )
    `)
    .limit(6);

  if (error) {
    console.error('Error fetching buses:', error);
  }

  // Process bus data to get latest location for each bus
  const busesWithLocations = buses?.map(bus => {
    const latestLocation = bus.bus_locations && bus.bus_locations.length > 0 
      ? bus.bus_locations.reduce((latest, current) => 
          new Date(current.updated_at) > new Date(latest.updated_at) ? current : latest
        )
      : null;

    return {
      ...bus,
      coordinates: latestLocation ? {
        lat: latestLocation.latitude,
        lng: latestLocation.longitude
      } : null
    };
  }) || [];

  return <ClientHome busesWithLocations={busesWithLocations} />;
}