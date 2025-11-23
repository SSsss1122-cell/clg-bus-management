'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Bus, Play, Square, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function DriverLocationPage() {
  const router = useRouter();
  const [driver, setDriver] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [locationInterval, setLocationInterval] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const driverSession = localStorage.getItem('driverSession');
    if (!driverSession) {
      router.push('/driver/login');
      return;
    }

    const driverData = JSON.parse(driverSession);
    if (!driverData.loggedIn) {
      router.push('/driver/login');
      return;
    }

    setDriver(driverData);
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('driverSession');
    if (locationInterval) {
      clearInterval(locationInterval);
    }
    router.push('/driver/login');
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed: position.coords.speed || 0
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const saveBusLocation = async (busId, location) => {
    try {
      const { error } = await supabase
        .from('bus_locations')
        .insert([
          {
            bus_id: busId,
            latitude: location.latitude,
            longitude: location.longitude,
            speed: location.speed,
            last_updated: new Date().toISOString()
          }
        ]);

      if (error) throw error;
      console.log('Location saved for bus_id:', busId);
    } catch (error) {
      console.error('Error saving location:', error);
      throw error;
    }
  };

  const startLocationSharing = async () => {
    if (!driver) {
      alert('No driver logged in');
      return;
    }

    try {
      const location = await getCurrentLocation();
      await saveBusLocation(driver.bus_id, location);
      setCurrentLocation(location);

      const interval = setInterval(async () => {
        try {
          const newLocation = await getCurrentLocation();
          await saveBusLocation(driver.bus_id, newLocation);
          setCurrentLocation(newLocation);
          console.log('Location updated for bus_id:', driver.bus_id);
        } catch (error) {
          console.error('Error updating location:', error);
        }
      }, 10000);

      setLocationInterval(interval);
      setIsSharing(true);
      alert('Location sharing started! Updating every 10 seconds.');

    } catch (error) {
      console.error('Error starting location sharing:', error);
      alert('Error starting location sharing: ' + error.message);
    }
  };

  const stopLocationSharing = () => {
    if (locationInterval) {
      clearInterval(locationInterval);
      setLocationInterval(null);
    }
    setIsSharing(false);
    alert('Location sharing stopped');
  };

  const formatSpeed = (speed) => {
    if (!speed) return '0 km/h';
    return `${(speed * 3.6).toFixed(1)} km/h`;
  };

  const formatCoordinates = (coord) => {
    return coord ? coord.toFixed(6) : '0.000000';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!driver) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
                <Bus className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Driver Location Sharing</h1>
                <p className="text-xs text-gray-500 -mt-1">Welcome, {driver.driver_name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {isSharing && (
                <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-4 py-2 rounded-lg">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Sharing Live Location</span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Current Bus Information */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Your Bus Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Bus Number</p>
              <p className="text-lg font-bold text-blue-600">Bus {driver.bus_number}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Driver</p>
              <p className="text-lg font-bold text-green-600">{driver.driver_name}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Contact</p>
              <p className="text-lg font-bold text-purple-600">{driver.driver_number}</p>
            </div>
          </div>
        </div>

        {/* Current Location Display */}
        {currentLocation && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <MapPin className="text-green-600 mr-2" size={24} />
              Current Location (Bus ID: {driver.bus_id})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Latitude</p>
                <p className="text-lg font-mono font-bold">{formatCoordinates(currentLocation.latitude)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Longitude</p>
                <p className="text-lg font-mono font-bold">{formatCoordinates(currentLocation.longitude)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Speed</p>
                <p className="text-lg font-bold text-blue-600">{formatSpeed(currentLocation.speed)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        )}

        {/* Location Sharing Controls */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Location Sharing Controls</h2>
          
          {!isSharing ? (
            <button
              onClick={startLocationSharing}
              className="w-full bg-gradient-to-r from-red-500 to-orange-600 text-white py-4 rounded-xl font-semibold hover:from-red-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center"
            >
              <Play size={20} className="mr-2" />
              Start Location Sharing
            </button>
          ) : (
            <button
              onClick={stopLocationSharing}
              className="w-full bg-gradient-to-r from-gray-500 to-gray-700 text-white py-4 rounded-xl font-semibold hover:from-gray-600 hover:to-gray-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center"
            >
              <Square size={20} className="mr-2" />
              Stop Location Sharing
            </button>
          )}

          {isSharing && (
            <div className="mt-4 text-center">
              <div className="flex items-center justify-center text-green-600 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                <span className="font-medium">Live Location Sharing Active</span>
              </div>
              <p className="text-sm text-gray-600">
                Your location is being updated every 10 seconds
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Location data is being stored in bus_locations table with bus_id: {driver.bus_id}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}