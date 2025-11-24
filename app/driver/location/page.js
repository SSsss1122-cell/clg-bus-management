'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Bus, Play, Square, LogOut, Navigation, Gauge, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function DriverLocationPage() {
  const router = useRouter();
  const [driver, setDriver] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [locationInterval, setLocationInterval] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const calculateSpeed = (speedMps) => {
    // Convert m/s to km/h and ensure it's never negative
    return Math.max(0, (speedMps * 3.6));
  };

  const saveBusLocation = async (busId, location) => {
    try {
      const speedKmh = calculateSpeed(location.speed);
      
      const { error } = await supabase
        .from('bus_locations')
        .upsert([
          {
            bus_id: busId,
            latitude: location.latitude,
            longitude: location.longitude,
            speed: speedKmh, // Store in km/h
            last_updated: new Date().toISOString()
          }
        ]);

      if (error) throw error;
      console.log('Location saved for bus_id:', busId);
      return true;
    } catch (error) {
      console.error('Error saving location:', error);
      throw error;
    }
  };

  const updateLocation = async () => {
    if (!driver) return;

    setIsUpdating(true);
    try {
      const location = await getCurrentLocation();
      await saveBusLocation(driver.bus_id, location);
      setCurrentLocation(location);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error updating location:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const startLocationSharing = async () => {
    if (!driver) {
      alert('No driver logged in');
      return;
    }

    try {
      await updateLocation();

      const interval = setInterval(async () => {
        await updateLocation();
      }, 10000);

      setLocationInterval(interval);
      setIsSharing(true);

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
  };

  const formatSpeed = (speed) => {
    if (!speed) return '0 km/h';
    return `${speed.toFixed(1)} km/h`;
  };

  const formatCoordinates = (coord) => {
    return coord ? coord.toFixed(6) : '0.000000';
  };

  const getSpeedColor = (speed) => {
    if (!speed || speed < 20) return 'text-green-600';
    if (speed < 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSpeedStatus = (speed) => {
    if (!speed || speed < 5) return 'Stopped';
    if (speed < 20) return 'Slow';
    if (speed < 40) return 'Moderate';
    return 'Fast';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Checking authentication...</p>
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
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg">
                <Bus className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Live Location Tracker</h1>
                <p className="text-sm text-gray-600">Welcome back, {driver.driver_name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {isSharing && (
                <div className="flex items-center space-x-3 bg-green-100 text-green-800 px-4 py-3 rounded-xl border border-green-200">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-semibold">Sharing Live</span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-all duration-200 shadow-sm"
              >
                <LogOut size={18} />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Bus Information Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <Bus className="text-blue-600 mr-3" size={28} />
            Bus Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
              <p className="text-sm text-blue-600 font-medium mb-2">Bus Number</p>
              <p className="text-2xl font-bold text-blue-700">Bus {driver.bus_number}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200">
              <p className="text-sm text-green-600 font-medium mb-2">Driver Name</p>
              <p className="text-2xl font-bold text-green-700">{driver.driver_name}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
              <p className="text-sm text-purple-600 font-medium mb-2">Contact Number</p>
              <p className="text-2xl font-bold text-purple-700">{driver.driver_number}</p>
            </div>
          </div>
        </div>

        {/* Current Location Display */}
        {currentLocation && (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <Navigation className="text-green-600 mr-3" size={28} />
                Current Location
              </h2>
              <button
                onClick={updateLocation}
                disabled={isUpdating}
                className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-xl hover:bg-blue-200 transition-all disabled:opacity-50"
              >
                <RefreshCw size={18} className={isUpdating ? 'animate-spin' : ''} />
                <span>{isUpdating ? 'Updating...' : 'Refresh'}</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <p className="text-sm text-gray-600 font-medium mb-2">Latitude</p>
                <p className="text-xl font-mono font-bold text-gray-800">
                  {formatCoordinates(currentLocation.latitude)}
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <p className="text-sm text-gray-600 font-medium mb-2">Longitude</p>
                <p className="text-xl font-mono font-bold text-gray-800">
                  {formatCoordinates(currentLocation.longitude)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200">
                <p className="text-sm text-orange-600 font-medium mb-2 flex items-center">
                  <Gauge size={16} className="mr-1" />
                  Current Speed
                </p>
                <p className={`text-2xl font-bold ${getSpeedColor(calculateSpeed(currentLocation.speed))}`}>
                  {formatSpeed(calculateSpeed(currentLocation.speed))}
                </p>
                <p className="text-sm text-orange-600 mt-1">
                  Status: {getSpeedStatus(calculateSpeed(currentLocation.speed))}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200">
                <p className="text-sm text-green-600 font-medium mb-2">Last Updated</p>
                <p className="text-lg font-bold text-green-700">
                  {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {lastUpdate ? lastUpdate.toLocaleDateString() : 'No updates yet'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Location Sharing Controls */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Location Sharing</h2>
          <p className="text-gray-600 mb-8">Start or stop sharing your bus location with passengers</p>
          
          <div className="flex flex-col space-y-6">
            {!isSharing ? (
              <button
                onClick={startLocationSharing}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-6 rounded-2xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center"
              >
                <Play size={24} className="mr-3" fill="white" />
                Start Location Sharing
              </button>
            ) : (
              <button
                onClick={stopLocationSharing}
                className="w-full bg-gradient-to-r from-red-500 to-orange-600 text-white py-6 rounded-2xl font-bold text-lg hover:from-red-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center"
              >
                <Square size={24} className="mr-3" />
                Stop Location Sharing
              </button>
            )}

            {isSharing && (
              <div className="text-center p-6 bg-green-50 rounded-2xl border border-green-200">
                <div className="flex items-center justify-center space-x-3 text-green-700 mb-3">
                  <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-semibold text-lg">Live Location Sharing Active</span>
                </div>
                <p className="text-green-600 mb-2">
                  Your location is automatically updated every 10 seconds
                </p>
                <p className="text-sm text-green-500">
                  Speed is automatically calculated and stored in km/h
                </p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white/80 p-3 rounded-lg">
                    <p className="font-medium">Update Frequency</p>
                    <p className="text-green-600">Every 10 seconds</p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-lg">
                    <p className="font-medium">Speed Unit</p>
                    <p className="text-green-600">Kilometers per hour</p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-lg">
                    <p className="font-medium">Bus ID</p>
                    <p className="text-green-600">{driver.bus_id}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="mt-8 bg-blue-50/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-200">
          <h3 className="text-lg font-bold text-blue-800 mb-3">💡 Quick Tips</h3>
          <ul className="text-blue-700 space-y-2 text-sm">
            <li>• Make sure location services are enabled on your device</li>
            <li>• Keep the app open while sharing location for best accuracy</li>
            <li>• Speed is automatically calculated and stored in km/h</li>
            <li>• Location updates automatically every 10 seconds when active</li>
          </ul>
        </div>
      </div>
    </div>
  );
}