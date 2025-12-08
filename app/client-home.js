'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  MapPin, Navigation, Menu, Bell, Megaphone, Info, User, 
  BookOpen, Hash, Phone, Mail, Users, LogIn, AlertTriangle, 
  X, ChevronLeft, MessageSquare, Home, Shield, Clock,
  Download, AlertCircle, CheckCircle, ExternalLink, Lock, Eye, EyeOff
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Current app version (hardcoded for now, will be compared with DB)
const CURRENT_APP_VERSION = "2.1.0";

// Bus Card Component
function BusCard({ bus, index, coordinates, isLoggedIn, onTrackBus }) {
  const busImages = ["/images/bus1.png", "/images/bus2.png"];
  const imageSrc = busImages[index % busImages.length];

  const [currentStop, setCurrentStop] = useState(null);
  const [nextStop, setNextStop] = useState(null);
  const [busCoordinates, setBusCoordinates] = useState(coordinates);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    async function loadStopInfo() {
      if (!bus?.id) return;

      const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
      
      const { data: location } = await supabase
        .from("bus_locations")
        .select("*")
        .eq("bus_id", bus.id)
        .gte("updated_at", tenSecondsAgo)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const isLocationRecent = location && (new Date() - new Date(location.updated_at)) < 10000;
      
      if (isLocationRecent) {
        setBusCoordinates({
          lat: location.latitude,
          lng: location.longitude,
        });
        setIsLive(true);

        const { data: stops } = await supabase
          .from("bus_stops")
          .select("*")
          .eq("bus_id", bus.id)
          .order("sequence", { ascending: true });

        if (!stops?.length) return;

        let nearestStop = null;
        let smallestDistance = Infinity;

        stops.forEach((stop) => {
          const distance =
            Math.pow(stop.latitude - location.latitude, 2) +
            Math.pow(stop.longitude - location.longitude, 2);

          if (distance < smallestDistance) {
            smallestDistance = distance;
            nearestStop = stop;
          }
        });

        setCurrentStop(nearestStop);

        if (nearestStop) {
          const currentIndex = stops.findIndex((s) => s.id === nearestStop.id);
          setNextStop(stops[currentIndex + 1] || null);
        }
      } else {
        setBusCoordinates(null);
        setIsLive(false);
        setCurrentStop(null);
        setNextStop(null);
      }
    }

    loadStopInfo();
    
    const interval = setInterval(loadStopInfo, 5000);
    
    return () => clearInterval(interval);
  }, [bus, coordinates]);

  const handleTrackBus = () => {
    if (!isLoggedIn) {
      showToast('Please login first to track buses', 'warning');
      return;
    }

    if (!busCoordinates) {
      showToast('No location data available for this bus', 'warning');
      return;
    }

    onTrackBus(bus, busCoordinates);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-blue-400 hover:transform hover:scale-[1.02] shadow-sm w-full group">
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full h-full relative flex items-center justify-center p-4">
          <img
            src={imageSrc}
            alt={`Bus ${bus.bus_number} - ${bus.route_name}`}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110 drop-shadow-lg"
            onError={(e) => {
              e.target.style.display = "none";
              const fallback = e.target.parentElement.querySelector(".fallback-overlay");
              if (fallback) fallback.classList.remove("hidden");
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center hidden fallback-overlay">
            <div className="text-white text-center">
              <div className="text-5xl font-bold mb-3 animate-bounce">🚌</div>
            </div>
          </div>
        </div>
        
        <div className="absolute top-3 right-3">
          <div className={`flex items-center text-white text-xs backdrop-blur-md px-3 py-2 rounded-full border border-white/30 shadow-lg transition-all duration-300 ${
            isLive ? 'bg-green-500/90' : 'bg-gray-500/90'
          }`}>
            <div className={`w-2 h-2 bg-white rounded-full mr-2 ${isLive ? 'animate-pulse' : ''}`}></div>
            {isLive ? 'Live' : 'Offline'}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-3 border border-blue-100">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">🚌</span>
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Bus {bus.bus_number}</p>
                  <p className="text-xs text-blue-600 font-medium">{bus.route_name}</p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                isLive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {isLive ? 'Active' : 'Inactive'}
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2 border-t border-blue-200">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                <User size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{bus.driver_name || "Driver Not Assigned"}</p>
                <p className="text-xs text-gray-600 truncate">Contact: {bus.driver_number || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 flex items-center">
              <MapPin size={14} className="mr-2" />
              Current Stop:
            </span>
            <span className="font-semibold text-gray-800 text-right text-xs max-w-[120px] truncate">
              {currentStop?.stop_name || "Not Started"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 flex items-center">
              <Clock size={14} className="mr-2" />
              Next Stop:
            </span>
            <span className="font-semibold text-blue-600 text-xs max-w-[120px] truncate">
              {nextStop?.stop_name || "Route End"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Status:</span>
            <span className={`font-semibold ${isLive ? 'text-green-600' : 'text-red-600'}`}>
              {isLive ? 'Live Tracking' : 'Bus Not Active'}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={handleTrackBus}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg text-center hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group/btn"
            disabled={!isLive || !isLoggedIn}
          >
            <div className="flex items-center justify-center">
              <MapPin size={16} className="mr-2 group-hover/btn:animate-bounce" />
              <span className="font-semibold">
                {!isLoggedIn ? 'Login to Track' : isLive ? 'Track Bus Live' : 'Bus Not Active'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientHome({ busesWithLocations }) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isAndroidWebView, setIsAndroidWebView] = useState(false);
  
  // Version state
  const [appVersion, setAppVersion] = useState(CURRENT_APP_VERSION);
  const [latestVersion, setLatestVersion] = useState(null);
  const [updateData, setUpdateData] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdateRequired, setIsUpdateRequired] = useState(false);

  // Toast notification function
  const showToast = (message, type = 'info') => {
    const toastContainer = document.querySelector('.toast-container') || (() => {
      const container = document.createElement('div');
      container.className = 'toast-container fixed top-4 right-4 z-[1000] space-y-2 max-w-sm';
      document.body.appendChild(container);
      return container;
    })();
    
    const toast = document.createElement('div');
    const colors = {
      success: 'from-green-500 to-emerald-600',
      error: 'from-red-500 to-rose-600',
      warning: 'from-yellow-500 to-orange-600',
      info: 'from-blue-500 to-indigo-600'
    };
    
    const icons = {
      success: '✓',
      error: '✗',
      warning: '⚠',
      info: 'ℹ'
    };
    
    toast.className = `toast bg-gradient-to-r ${colors[type]} text-white px-6 py-4 rounded-xl shadow-xl flex items-center animate-slide-in-right`;
    toast.innerHTML = `
      <div class="mr-3 flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
        <span class="font-bold">${icons[type]}</span>
      </div>
      <div class="flex-1">
        <p class="font-medium text-sm">${message}</p>
      </div>
      <button onclick="this.parentElement.remove()" class="ml-4 text-white/70 hover:text-white transition-colors">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
      </button>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('animate-fade-out');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 4000);
  };

  // Check if running in Android WebView
  useEffect(() => {
    const checkAndroidWebView = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isAndroidWV = userAgent.includes('android') && userAgent.includes('wv');
      setIsAndroidWebView(isAndroidWV);
      
      if (isAndroidWV) {
        document.documentElement.style.setProperty('--safe-area-top', '24px');
        document.documentElement.style.setProperty('--safe-area-bottom', '16px');
        document.documentElement.style.setProperty('--safe-area-left', '0px');
        document.documentElement.style.setProperty('--safe-area-right', '0px');
        
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
        document.head.appendChild(meta);
      }
    };
    
    checkAndroidWebView();
  }, []);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (mobile) {
        document.addEventListener('focusin', (e) => {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            window.requestAnimationFrame(() => {
              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
          }
        });
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch latest app version from Supabase
  useEffect(() => {
    async function fetchLatestVersion() {
      try {
        const { data, error } = await supabase
          .from('app_updates')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error('Error fetching app version:', error);
          return;
        }

        if (data) {
          setLatestVersion(data.version);
          setUpdateData(data);
          
          const currentV = CURRENT_APP_VERSION.split('.').map(Number);
          const latestV = data.version.split('.').map(Number);
          
          let needsUpdate = false;
          let updateRequired = data.force_update || false;
          
          for (let i = 0; i < Math.max(currentV.length, latestV.length); i++) {
            const curr = currentV[i] || 0;
            const latest = latestV[i] || 0;
            
            if (latest > curr) {
              needsUpdate = true;
              break;
            } else if (latest < curr) {
              break;
            }
          }
          
          if (needsUpdate) {
            setIsUpdateRequired(updateRequired);
            setShowUpdateModal(true);
          }
        }
      } catch (error) {
        console.error('Error in version check:', error);
      }
    }

    fetchLatestVersion();
  }, []);

  // Check for existing user session
  useEffect(() => {
    const savedUser = localStorage.getItem('sitBusUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('sitBusUser');
      }
    }
  }, []);

  // Enhanced click outside handler for mobile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      const mobileMenu = document.querySelector('.mobile-menu');
      const menuButton = document.querySelector('.mobile-menu-button');
      
      if (showMobileMenu && mobileMenu && menuButton &&
          !mobileMenu.contains(event.target) && 
          !menuButton.contains(event.target)) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMobileMenu]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showMobileMenu || showMapModal || showLoginModal || showUpdateModal) {
      document.body.style.overflow = 'hidden';
      if (isAndroidWebView) {
        document.documentElement.style.overflow = 'hidden';
      }
    } else {
      document.body.style.overflow = 'unset';
      if (isAndroidWebView) {
        document.documentElement.style.overflow = 'unset';
      }
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      if (isAndroidWebView) {
        document.documentElement.style.overflow = 'unset';
      }
    };
  }, [showMobileMenu, showMapModal, showLoginModal, showUpdateModal, isAndroidWebView]);

  const handleTrackBus = (bus, coordinates) => {
    setSelectedBus(bus);
    setSelectedCoordinates(coordinates);
    setShowMapModal(true);
  };

  const getGoogleMapsUrl = (coordinates) => {
    if (!coordinates || !coordinates.lat || !coordinates.lng) {
      return "https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=12.9716,77.5946&zoom=15&maptype=roadmap";
    }
    
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${coordinates.lat},${coordinates.lng}&zoom=16&maptype=roadmap`;
  };
  
const API_URL = '/api/auth/login'; // Local route

const handleLogin = async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const credentials = {
    usn: formData.get('usn').toUpperCase(),
    password: formData.get('password'),
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const contentType = response.headers.get('content-type');
    let result;

    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Server returned non-JSON response: ${text}`);
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Login failed');
    }

    console.log('Login successful:', result);
    setCurrentUser(result.data);
    setIsLoggedIn(true);
    localStorage.setItem('sitBusUser', JSON.stringify(result.data));
    setShowLoginModal(false);
    setShowMobileMenu(false);
    showToast(`Welcome ${result.data.full_name}!`, 'success');
    e.target.reset();

  } catch (error) {
    console.error('Login error:', error);
    showToast('Login failed: ' + error.message, 'error');
  }
};


  const handleRegister = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const studentData = {
      full_name: formData.get('full_name'),
      class: formData.get('class'),
      division: formData.get('division'),
      usn: formData.get('usn').toUpperCase(),
      branch: formData.get('branch'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      password: formData.get('password')
    };

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      alert('Registration successful! Please login with your USN and password.');
      setShowLoginForm(true);
      e.target.reset();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('sitBusUser');
    setShowMobileMenu(false);
    showToast('Logged out successfully', 'success');
  };

  const handleUpdateNow = () => {
    if (updateData?.download_url) {
      window.open(updateData.download_url, '_blank');
    }
  };

  const handleSkipUpdate = () => {
    if (!isUpdateRequired) {
      setShowUpdateModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col android-safe-area">
      {/* Update Notification Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 android-modal-safe">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl relative animate-scale-in">
            <div className={`p-6 rounded-t-2xl ${isUpdateRequired ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'} text-white`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  {isUpdateRequired ? (
                    <AlertCircle size={24} className="text-white" />
                  ) : (
                    <Download size={24} className="text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Update Available</h2>
                  <p className="text-white/90">Version {latestVersion} is available</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {updateData && (
                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{updateData.title || `What's New in v${latestVersion}`}</h3>
                  <p className="text-gray-600 mb-4">{updateData.description || 'Bug fixes and performance improvements'}</p>
                  
                  <div className="bg-gray-50 p-4 rounded-xl mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-700">Current Version</span>
                      <span className="font-semibold text-gray-900">{CURRENT_APP_VERSION}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Latest Version</span>
                      <span className="font-bold text-blue-600">{latestVersion}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleUpdateNow}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3.5 px-4 rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 touch-manipulation"
                >
                  <Download size={18} />
                  Update Now
                  <ExternalLink size={16} />
                </button>
                
                {!isUpdateRequired && (
                  <button
                    onClick={handleSkipUpdate}
                    className="flex-1 bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700 py-3.5 px-4 rounded-xl font-bold hover:from-gray-400 hover:to-gray-500 transition-all shadow-sm touch-manipulation"
                  >
                    Skip for Now
                  </button>
                )}
              </div>
              
              {isUpdateRequired && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-600" />
                    <p className="text-sm text-red-700 font-medium">This update is required to continue using the app.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Fixed Navigation Header - Android WebView Compatible */}
      <header className={`bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isAndroidWebView ? 'pt-6' : 'pt-safe-top'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Name */}
            <div className="flex items-center space-x-3 group flex-shrink-0">
              <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                <img 
                  src="/images/logo.png" 
                  alt="SIT Bus System Logo" 
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden text-white items-center justify-center">
                  <Navigation size={20} />
                </div>
              </div>
              <div className="block">
                <h1 className="text-lg font-bold text-gray-900 leading-tight">SIT Bus</h1>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-gray-500 hidden sm:block">v{CURRENT_APP_VERSION}</p>
                  {latestVersion && latestVersion !== CURRENT_APP_VERSION && (
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
              <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium transition-colors border-b-2 border-transparent hover:border-blue-600 pb-1 text-sm lg:text-base">
                Home
              </Link>
              <Link href="/notice" className="text-gray-700 hover:text-blue-600 font-medium transition-colors border-b-2 border-transparent hover:border-blue-600 pb-1 flex items-center text-sm lg:text-base">
                <Bell size={18} className="mr-1" />
                Notice
              </Link>
              <Link href="/announcements" className={`text-gray-700 hover:text-blue-600 font-medium transition-colors border-b-2 border-transparent hover:border-blue-600 pb-1 flex items-center text-sm lg:text-base ${!isLoggedIn ? 'opacity-50 pointer-events-none' : ''}`}>
                <Megaphone size={18} className="mr-1" />
                Announcements
              </Link>
              <Link href="/community" className={`text-gray-700 hover:text-blue-600 font-medium transition-colors border-b-2 border-transparent hover:border-blue-600 pb-1 flex items-center text-sm lg:text-base ${!isLoggedIn ? 'opacity-50 pointer-events-none' : ''}`}>
                <Users size={18} className="mr-1" />
                Community
              </Link>
              <Link href="/complaint" className={`text-gray-700 hover:text-blue-600 font-medium transition-colors border-b-2 border-transparent hover:border-blue-600 pb-1 flex items-center text-sm lg:text-base ${!isLoggedIn ? 'opacity-50 pointer-events-none' : ''}`}>
                <AlertTriangle size={18} className="mr-1" />
                Complaint
              </Link>
            </nav>

            {/* Desktop Login/Logout Buttons */}
            <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
              {isLoggedIn ? (
                <>
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 lg:px-4 py-2 rounded-lg font-medium shadow-sm flex items-center max-w-[140px]">
                    <User size={16} className="mr-2 flex-shrink-0" />
                    <span className="truncate text-sm">{currentUser?.full_name}</span>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-3 lg:px-4 py-2 rounded-lg font-medium hover:from-red-600 hover:to-rose-700 transition-all shadow-sm text-sm lg:text-base"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 lg:px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md text-sm lg:text-base"
                >
                  Login
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
              {isLoggedIn && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-full text-xs font-medium max-w-[100px] truncate">
                  {currentUser?.full_name?.split(' ')[0]}
                </div>
              )}
              <button 
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className={`mobile-menu-button p-2 rounded-lg touch-manipulation transition-all duration-200 ${
                  showMobileMenu 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                }`}
                aria-label="Toggle menu"
              >
                {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden fixed inset-0 z-50">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowMobileMenu(false)}
            />
            
            {/* Menu Panel */}
            <div className="absolute inset-0 bg-white mobile-menu" onClick={(e) => e.stopPropagation()}>
              {/* Mobile Menu Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Navigation size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">Menu</h3>
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-gray-500">v{CURRENT_APP_VERSION}</p>
                      {latestVersion && latestVersion !== CURRENT_APP_VERSION && (
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 touch-manipulation text-gray-700"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Menu Content */}
              <div className="h-[calc(100vh-68px)] overflow-y-auto p-4 android-menu-safe bg-white">
                <nav className="flex flex-col space-y-2">
                  {/* Home Link */}
                  <Link 
                    href="/"
                    onClick={() => setShowMobileMenu(false)}
                    className="text-gray-700 hover:text-blue-600 font-medium transition-colors py-4 px-4 rounded-xl bg-gray-50 hover:bg-blue-50 text-left flex items-center border border-gray-200 hover:border-blue-200 shadow-sm"
                  >
                    <Home size={20} className="mr-3 text-blue-600" />
                    <span className="font-semibold">Home</span>
                  </Link>

                  {/* Notice Link */}
                  <Link 
                    href="/notice"
                    onClick={() => setShowMobileMenu(false)}
                    className="text-gray-700 hover:text-blue-600 font-medium transition-colors py-4 px-4 rounded-xl bg-gray-50 hover:bg-orange-50 text-left flex items-center border border-gray-200 hover:border-orange-200 shadow-sm"
                  >
                    <Bell size={20} className="mr-3 text-orange-600" />
                    <span className="font-semibold">Notice</span>
                  </Link>

                  {/* Conditional Links */}
                  <Link 
                    href="/announcements"
                    onClick={() => setShowMobileMenu(false)}
                    className={`text-gray-700 hover:text-blue-600 font-medium transition-colors py-4 px-4 rounded-xl text-left flex items-center border shadow-sm ${!isLoggedIn ? 'opacity-50 pointer-events-none bg-gray-100 border-gray-200' : 'bg-gray-50 hover:bg-green-50 border-gray-200 hover:border-green-200'}`}
                  >
                    <Megaphone size={20} className={`mr-3 ${!isLoggedIn ? 'text-gray-400' : 'text-green-600'}`} />
                    <span className={`font-semibold ${!isLoggedIn ? 'text-gray-400' : ''}`}>Announcements</span>
                  </Link>

                  <Link 
                    href="/community"
                    onClick={() => setShowMobileMenu(false)}
                    className={`text-gray-700 hover:text-blue-600 font-medium transition-colors py-4 px-4 rounded-xl text-left flex items-center border shadow-sm ${!isLoggedIn ? 'opacity-50 pointer-events-none bg-gray-100 border-gray-200' : 'bg-gray-50 hover:bg-purple-50 border-gray-200 hover:border-purple-200'}`}
                  >
                    <Users size={20} className={`mr-3 ${!isLoggedIn ? 'text-gray-400' : 'text-purple-600'}`} />
                    <span className={`font-semibold ${!isLoggedIn ? 'text-gray-400' : ''}`}>Community</span>
                  </Link>

                  <Link 
                    href="/complaint"
                    onClick={() => setShowMobileMenu(false)}
                    className={`text-gray-700 hover:text-blue-600 font-medium transition-colors py-4 px-4 rounded-xl text-left flex items-center border shadow-sm ${!isLoggedIn ? 'opacity-50 pointer-events-none bg-gray-100 border-gray-200' : 'bg-gray-50 hover:bg-red-50 border-gray-200 hover:border-red-200'}`}
                  >
                    <AlertTriangle size={20} className={`mr-3 ${!isLoggedIn ? 'text-gray-400' : 'text-red-600'}`} />
                    <span className={`font-semibold ${!isLoggedIn ? 'text-gray-400' : ''}`}>Complaint</span>
                  </Link>

                  {/* Update Notification */}
                  {latestVersion && latestVersion !== CURRENT_APP_VERSION && (
                    <div 
                      onClick={() => {
                        setShowMobileMenu(false);
                        setShowUpdateModal(true);
                      }}
                      className="cursor-pointer mt-4 px-4 py-4 bg-gradient-to-r from-red-50 to-rose-100 rounded-xl border border-red-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 flex items-center justify-center">
                          <Download size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">Update Available!</p>
                          <p className="text-sm text-gray-600">Version {latestVersion} is ready</p>
                        </div>
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  )}

                  {/* Auth Section */}
                  <div className="pt-8 border-t border-gray-200 mt-4 space-y-4">
                    {isLoggedIn ? (
                      <>
                        {/* User Info Card */}
                        <div className="px-4 py-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 shadow-sm">
                          <div className="flex items-center mb-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                              <User size={18} className="text-white" />
                            </div>
                            <div className="ml-3">
                              <p className="font-semibold text-gray-900 truncate">{currentUser?.full_name}</p>
                              <p className="text-xs text-gray-600 truncate">{currentUser?.usn}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              setShowMobileMenu(false);
                              handleLogout();
                            }}
                            className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-red-600 hover:to-rose-700 transition-all shadow-sm text-center touch-manipulation"
                          >
                            Logout
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm">
                        <p className="text-gray-700 mb-4 text-sm font-medium text-center">Login to access all features</p>
                        <button 
                          onClick={() => {
                            setShowMobileMenu(false);
                            setShowLoginModal(true);
                          }}
                          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-4 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl text-center touch-manipulation"
                        >
                          Login / Register
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Version and Info Section */}
                  <div className="pt-8 border-t border-gray-200 mt-4 space-y-3">
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-2">
                        <Shield size={14} className="text-blue-600" />
                        <span className="text-xs text-blue-600 font-medium">Secure Connection</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        SIT Bus Tracker v{CURRENT_APP_VERSION}
                      </p>
                      {latestVersion && (
                        <p className="text-xs text-gray-400 mb-1">
                          Latest: v{latestVersion}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        shetty group of institutions
                      </p>
                    </div>
                    
                    {/* Footer Links */}
                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-200">
                      <Link 
                        href="/privacy"
                        onClick={() => setShowMobileMenu(false)}
                        className="text-gray-500 hover:text-blue-600 text-xs py-2 px-3 text-center hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        Privacy Policy
                      </Link>
                      <Link 
                        href="/terms"
                        onClick={() => setShowMobileMenu(false)}
                        className="text-gray-500 hover:text-blue-600 text-xs py-2 px-3 text-center hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        Terms of Service
                      </Link>
                    </div>
                  </div>
                </nav>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content with safe area padding */}
      <div className="flex-1 pt-16 pb-8 android-content-safe">
        
        {/* Enhanced Map Modal with Mobile Back Button */}
        {showMapModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 android-modal-safe" onClick={() => setShowMapModal(false)}>
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
              {/* Mobile Back Button */}
              {isMobile && (
                <button 
                  onClick={() => setShowMapModal(false)}
                  className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg touch-manipulation"
                  aria-label="Go back"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                <div className="flex justify-between items-center">
                  <div className={isMobile ? "pr-12" : ""}>
                    <h2 className="text-2xl font-bold">Tracking Bus {selectedBus?.bus_number}</h2>
                    <p className="text-blue-100">{selectedBus?.route_name}</p>
                  </div>
                  {!isMobile && (
                    <button onClick={() => setShowMapModal(false)} className="text-white hover:text-blue-200 p-2 rounded-full hover:bg-white/10 transition-colors">
                      <X size={24} />
                    </button>
                  )}
                </div>
              </div>
              <div className="p-4 md:p-6">
                <div className="bg-gray-100 rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Driver:</span>
                      <p className="font-semibold">{selectedBus?.driver_name || "Not Assigned"}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Current Location:</span>
                      <p className="font-semibold">{selectedBus?.current_location || "Not Available"}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Next Stop:</span>
                      <p className="font-semibold text-blue-600">{selectedBus?.next_stop || "Student Union"}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl overflow-hidden border-2 border-gray-300">
                  <iframe
                    className="w-full h-80 md:h-96"
                    frameBorder="0"
                    style={{ border: 0 }}
                    allowFullScreen
                    src={getGoogleMapsUrl(selectedCoordinates)}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-gray-600 flex items-center justify-center text-sm">
                    <MapPin size={16} className="mr-2 text-red-500" />
                    Live location tracking for Bus {selectedBus?.bus_number}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Login Modal with Mobile Back Button */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 android-modal-safe" onClick={() => setShowLoginModal(false)}>
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
              {/* Mobile Back Button */}
              {isMobile && (
                <button 
                  onClick={() => setShowLoginModal(false)}
                  className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg touch-manipulation"
                  aria-label="Go back"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              
              <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <h2 className={`text-2xl font-bold ${isMobile ? 'pr-12' : ''}`}>
                    {showLoginForm ? 'Student Login' : 'Student Registration'}
                  </h2>
                  {!isMobile && (
                    <button onClick={() => setShowLoginModal(false)} className="text-white hover:text-blue-200 p-2 rounded-full hover:bg-white/10 transition-colors">
                      <X size={24} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="p-6">
                {/* Login Form */}
                {showLoginForm ? (
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Hash size={16} className="inline mr-2 text-blue-600" />
                          USN *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            name="usn"
                            required
                            className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all touch-manipulation"
                            placeholder="Enter your USN"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                            <Hash size={18} />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Lock size={16} className="inline mr-2 text-blue-600" />
                          Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            required
                            className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all touch-manipulation"
                            placeholder="Enter your password"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                            <Lock size={18} />
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg touch-manipulation flex items-center justify-center"
                    >
                      Login to SIT Bus System
                    </button>

                    <p className="text-center text-sm text-gray-600">
                      Don't have an account? 
                      <button 
                        type="button" 
                        onClick={() => setShowLoginForm(false)}
                        className="text-blue-600 hover:text-blue-700 font-medium ml-1 underline touch-manipulation"
                      >
                        Register here
                      </button>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <User size={16} className="inline mr-2 text-green-600" />
                          Full Name *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            name="full_name"
                            required
                            className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 transition-all touch-manipulation"
                            placeholder="Enter your full name"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                            <User size={18} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <BookOpen size={16} className="inline mr-2 text-green-600" />
                            Class *
                          </label>
                          <input
                            type="text"
                            name="class"
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 transition-all touch-manipulation"
                            placeholder="e.g., 3rd Year"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Division
                          </label>
                          <input
                            type="text"
                            name="division"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 transition-all touch-manipulation"
                            placeholder="e.g., A"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Hash size={16} className="inline mr-2 text-green-600" />
                          USN *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            name="usn"
                            required
                            className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 transition-all touch-manipulation"
                            placeholder="e.g., 1SI20CS001"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                            <Hash size={18} />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Branch
                        </label>
                        <select
                          name="branch"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 transition-all touch-manipulation"
                        >
                          <option value="">Select Branch</option>
                          <option value="Computer Science">Computer Science</option>
                          <option value="Information Science">Information Science</option>
                          <option value="Electronics & Communication">Electronics & Communication</option>
                          <option value="Mechanical">Mechanical</option>
                          <option value="Civil">Civil</option>
                          <option value="Electrical">Electrical</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Phone size={16} className="inline mr-2 text-green-600" />
                          Phone Number
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            name="phone"
                            className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 transition-all touch-manipulation"
                            placeholder="Enter phone number"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                            <Phone size={18} />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Mail size={16} className="inline mr-2 text-green-600" />
                          Email
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            name="email"
                            className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 transition-all touch-manipulation"
                            placeholder="Enter email address"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                            <Mail size={18} />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Lock size={16} className="inline mr-2 text-green-600" />
                          Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            required
                            className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 transition-all touch-manipulation"
                            placeholder="Create a password"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                            <Lock size={18} />
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg touch-manipulation flex items-center justify-center"
                    >
                      Create Account
                    </button>

                    <p className="text-center text-sm text-gray-600">
                      Already have an account? 
                      <button 
                        type="button" 
                        onClick={() => setShowLoginForm(true)}
                        className="text-blue-600 hover:text-blue-700 font-medium ml-1 underline touch-manipulation"
                      >
                        Login here
                      </button>
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-12 md:py-16 px-4 overflow-hidden h-[400px] md:h-[450px]">
          <div className="absolute inset-0">
            <img 
              src="/images/sit1.jpg" 
              alt="SIT College Kalaburagi"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/40 via-blue-700/30 to-indigo-800/20"></div>
          </div>

          <div className="relative z-10 h-full flex items-center justify-center">
            <div className="max-w-4xl mx-auto text-center px-4">
              <div className="mb-6">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">
                  SIT Bus Tracker
                </h1>
                <div className="w-20 h-1 bg-gradient-to-r from-green-400 to-emerald-500 mx-auto rounded-full mb-4"></div>
                <p className="text-base md:text-lg text-white max-w-2xl mx-auto leading-relaxed font-light opacity-95">
                  Real-time bus tracking & smart campus transportation
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <p className="text-sm text-blue-200">Version {CURRENT_APP_VERSION}</p>
                  {latestVersion && latestVersion !== CURRENT_APP_VERSION && (
                    <>
                      <span className="text-gray-300">•</span>
                      <button 
                        onClick={() => setShowUpdateModal(true)}
                        className="text-sm text-yellow-300 hover:text-yellow-200 underline flex items-center gap-1"
                      >
                        <Download size={12} />
                        Update to v{latestVersion}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-center items-center gap-4 md:gap-6 mb-6">
                <div className="text-center">
                  <div className="text-lg md:text-xl font-bold text-white flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                    Live
                  </div>
                  <div className="text-xs md:text-sm text-white opacity-90">Tracking</div>
                </div>
                <div className="w-px h-6 bg-white/30"></div>
                <div className="text-center">
                  <div className="text-lg md:text-xl font-bold text-white">{busesWithLocations?.length || 0}</div>
                  <div className="text-xs md:text-sm text-white opacity-90">Buses</div>
                </div>
                <div className="w-px h-6 bg-white/30"></div>
                <div className="text-center">
                  <div className="text-lg md:text-xl font-bold text-white">24/7</div>
                  <div className="text-xs md:text-sm text-white opacity-90">Service</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Link 
                  href="/community" 
                  className={`group bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center text-sm transform hover:scale-105 ${!isLoggedIn ? 'opacity-50 pointer-events-none' : 'hover:shadow-2xl'}`}
                >
                  <Users className="mr-2" size={18} />
                  Join Community
                  <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                
                {!isLoggedIn && (
                  <button 
                    onClick={() => setShowLoginModal(true)}
                    className="group bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center text-sm transform hover:scale-105 touch-manipulation"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Login to Track
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* All Buses Section */}
        <section className="py-12 md:py-20 px-4 bg-gradient-to-b from-white to-blue-50 flex-1">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 md:mb-6">
                Campus Buses
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto text-base md:text-lg px-4">
                {busesWithLocations?.length > 0 
                  ? 'Track your bus in real-time and never miss your ride' 
                  : 'No buses are currently available. Buses will appear here when they are assigned.'}
              </p>
            </div>
            
            {busesWithLocations?.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 justify-items-center">
                {busesWithLocations.map((bus, index) => (
                  <BusCard 
                    key={bus.id}
                    bus={bus}
                    index={index}
                    coordinates={bus.coordinates}
                    isLoggedIn={isLoggedIn}
                    onTrackBus={handleTrackBus}
                  />
                ))}
              </div>
            )}
            
            {busesWithLocations?.length === 0 && (
              <div className="text-center py-16">
                <div className="bg-gray-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Navigation className="text-gray-400" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-3">No Buses Available</h3>
                <p className="text-gray-500 text-base max-w-md mx-auto">All buses are currently offline or not assigned. Check back later for updates.</p>
              </div>
            )}
          </div>
        </section>

        {/* Footer with Version */}
        <footer className="bg-gradient-to-br from-gray-900 to-black text-white pt-12 pb-8 px-4 android-footer-safe">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div className="md:col-span-2">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
                    <img 
                      src="/images/logo.png" 
                      alt="SIT Bus System Logo" 
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden text-white items-center justify-center">
                      <Navigation size={20} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">SIT Bus System</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-400 text-sm">v{CURRENT_APP_VERSION}</p>
                      {latestVersion && latestVersion !== CURRENT_APP_VERSION && (
                        <button 
                          onClick={() => setShowUpdateModal(true)}
                          className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-0.5 rounded-full flex items-center gap-1"
                        >
                          <Download size={10} />
                          Update
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-gray-400 mb-6 max-w-md text-base leading-relaxed">
                  Smart campus transportation with real-time tracking and reliable service for students and staff.
                </p>
                <div className="flex flex-wrap gap-2">
                  <div className="bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700">
                    <span className="text-sm text-gray-300">📍 Live GPS Tracking</span>
                  </div>
                  <div className="bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700">
                    <span className="text-sm text-gray-300">🔔 Real-time Alerts</span>
                  </div>
                  <div className="bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700">
                    <span className="text-sm text-gray-300">🚌 Multiple Buses</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-4 text-white">Quick Links</h4>
                <ul className="space-y-3">
                  <li><Link href="/notice" className="text-gray-400 hover:text-white transition-colors text-base flex items-center">
                    <Bell size={16} className="mr-2" />
                    Notice
                  </Link></li>
                  <li><Link href="/announcements" className={`text-gray-400 hover:text-white transition-colors text-base flex items-center ${!isLoggedIn ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Megaphone size={16} className="mr-2" />
                    Announcements
                  </Link></li>
                  <li><Link href="/community" className={`text-gray-400 hover:text-white transition-colors text-base flex items-center ${!isLoggedIn ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Users size={16} className="mr-2" />
                    Community
                  </Link></li>
                  <li><Link href="/complaint" className={`text-gray-400 hover:text-white transition-colors text-base flex items-center ${!isLoggedIn ? 'opacity-50 pointer-events-none' : ''}`}>
                    <AlertTriangle size={16} className="mr-2" />
                    Complaint
                  </Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-4 text-white">Support</h4>
                <ul className="space-y-3">
                  <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors text-base flex items-center">
                    <Phone size={16} className="mr-2" />
                    Contact Us
                  </Link></li>
                  <li><Link href="/feedback" className="text-gray-400 hover:text-white transition-colors text-base flex items-center">
                    <Mail size={16} className="mr-2" />
                    Feedback
                  </Link></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="text-center md:text-left mb-4 md:mb-0">
                  <p className="text-gray-400 text-sm">
                    © 2024 SIT Bus System. All rights reserved.
                  </p>
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full ${latestVersion && latestVersion !== CURRENT_APP_VERSION ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                    <p className="text-xs text-gray-500">
                      Version {CURRENT_APP_VERSION} • 
                      {latestVersion && latestVersion !== CURRENT_APP_VERSION ? ' Update Available' : ' Up to Date'}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-6 items-center">
                  <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                    Privacy Policy
                  </Link>
                  <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                    Terms of Service
                  </Link>
                  <div className="text-gray-500 text-sm">
                    v{CURRENT_APP_VERSION}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Toast Container */}
      <div className="toast-container"></div>

      {/* Add CSS for animations and safe areas */}
      <style jsx global>{`
        :root {
          --safe-area-top: 0px;
          --safe-area-bottom: 0px;
          --safe-area-left: 0px;
          --safe-area-right: 0px;
        }
        
        .android-safe-area {
          padding-left: var(--safe-area-left);
          padding-right: var(--safe-area-right);
        }
        
        .pt-safe-top {
          padding-top: var(--safe-area-top);
        }
        
        .android-content-safe {
          padding-top: calc(64px + var(--safe-area-top));
          padding-bottom: var(--safe-area-bottom);
        }
        
        .android-footer-safe {
          padding-bottom: calc(32px + var(--safe-area-bottom));
        }
        
        .android-menu-safe {
          padding-top: var(--safe-area-top);
          padding-bottom: var(--safe-area-bottom);
        }
        
        .android-modal-safe {
          padding-top: var(--safe-area-top);
          padding-bottom: var(--safe-area-bottom);
        }
        
        /* Fix for Android WebView */
        @supports (padding: max(0px)) {
          .pt-safe-top {
            padding-top: max(var(--safe-area-top), 24px);
          }
          
          .android-content-safe {
            padding-top: calc(64px + max(var(--safe-area-top), 24px));
            padding-bottom: max(var(--safe-area-bottom), 16px);
          }
          
          .android-footer-safe {
            padding-bottom: calc(32px + max(var(--safe-area-bottom), 16px));
          }
        }
        
        /* Animations */
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes check {
          0% { stroke-dashoffset: 20; }
          100% { stroke-dashoffset: 0; }
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .animate-check {
          animation: check 0.5s ease-in-out forwards;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
        
        .animate-fade-out {
          animation: fadeOut 0.3s ease-out forwards;
        }
        
        .animate-scale-in {
          animation: scaleIn 0.2s ease-out;
        }
        
        .mobile-menu {
          animation: slideInRight 0.3s ease-out;
        }
        
        /* Fix for Android WebView input zoom */
        @media screen and (-webkit-min-device-pixel-ratio:0) {
          input, select, textarea {
            font-size: 16px !important;
          }
        }
        
        /* Prevent text size adjustment */
        html {
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
        }
        
        /* Improve touch feedback */
        .touch-manipulation {
          touch-action: manipulation;
        }
        
        /* Fix for modal backdrop in Android */
        .backdrop-blur-sm {
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }
        
        /* Form focus styles */
        input:focus, select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
}