'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Navigation, Menu, Bell, Megaphone, Info, User, BookOpen, Hash, Phone, Mail, Users, LogIn, AlertTriangle, X } from 'lucide-react';

// Bus Card Component
function BusCard({ bus, index, coordinates, isLoggedIn, onTrackBus }) {
  const busImages = ["/bus1.png", "/bus2.png"];
  const imageSrc = busImages[index % busImages.length];

  const handleTrackBus = () => {
    if (!isLoggedIn) {
      alert('Please login first to track buses');
      return;
    }

    if (!coordinates) {
      alert('No location data available for this bus');
      return;
    }

    onTrackBus(bus, coordinates);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all hover:shadow-lg hover:border-blue-400 hover:transform hover:scale-[1.02] shadow-sm w-full">
      {/* Bus Image with Overlay */}
      <div className="relative h-40 overflow-hidden">
        <div className="w-full h-full relative">
          <img 
            src={imageSrc} 
            alt={`Bus ${bus.bus_number} - ${bus.route_name}`}
            className="w-full h-full object-cover transition-transform hover:scale-105"
            onError={(e) => {
              e.target.style.display = 'none';
              const fallback = e.target.parentElement.querySelector('.fallback-overlay');
              if (fallback) fallback.classList.remove('hidden');
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center hidden fallback-overlay">
            <div className="text-white text-center">
              <div className="text-4xl font-bold mb-2">🚌</div>
              <p className="text-sm opacity-90">Bus {bus.bus_number}</p>
            </div>
          </div>
        </div>
        
        {/* Bus Number Badge */}
        <div className="absolute top-3 left-3">
          <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm font-bold shadow-lg border border-white/30">
            Bus {bus.bus_number}
          </span>
        </div>
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <div className={`flex items-center text-white text-xs backdrop-blur-sm px-3 py-2 rounded-full border border-white/30 ${
            coordinates ? 'bg-green-500/90' : 'bg-gray-500/90'
          }`}>
            <div className={`w-2 h-2 bg-white rounded-full mr-2 ${coordinates ? 'animate-pulse' : ''}`}></div>
            {coordinates ? 'Live' : 'Offline'}
          </div>
        </div>
        
        {/* Route Name */}
        <div className="absolute bottom-3 right-3 text-right">
          <h3 className="text-white font-bold text-base drop-shadow-lg bg-black/30 px-2 py-1 rounded-lg">
            {bus.route_name}
          </h3>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        {/* Driver Information */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 mb-3 border border-blue-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
              <User size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm truncate">{bus.driver_name || "Driver Not Assigned"}</p>
              <p className="text-xs text-gray-600 truncate">Contact: {bus.driver_number || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Bus Status */}
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 flex items-center">
              <MapPin size={14} className="mr-2" />
              Current:
            </span>
            <span className="font-semibold text-gray-800 text-right text-xs max-w-[120px] truncate">
              {bus.current_location || "Not Started"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Next Stop:</span>
            <span className="font-semibold text-blue-600 text-xs max-w-[120px] truncate">
              {bus.next_stop || "Student Union"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Status:</span>
            <span className={`font-semibold ${coordinates ? 'text-green-600' : 'text-red-600'}`}>
              {coordinates ? 'Live Tracking' : 'Bus Not Started'}
            </span>
          </div>
        </div>

        {/* Track Bus Button */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={handleTrackBus}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg text-center hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group"
            disabled={!coordinates || !isLoggedIn}
          >
            <div className="flex items-center justify-center">
              <MapPin size={16} className="mr-2 group-hover:animate-bounce" />
              <span className="font-semibold">
                {!isLoggedIn ? 'Login to Track' : coordinates ? 'Track Bus Live' : 'Bus Not Started'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientHome({ busesWithLocations }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(true);
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);

  useEffect(() => {
    // Check if user is logged in on component mount
    const savedUser = localStorage.getItem('sitBusUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsLoggedIn(true);
    }
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMobileMenu && !event.target.closest('.mobile-menu') && !event.target.closest('.mobile-menu-button')) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMobileMenu]);

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

  const handleLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const credentials = {
      usn: formData.get('usn'),
      password: formData.get('password')
    };

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      setCurrentUser(result.data);
      setIsLoggedIn(true);
      localStorage.setItem('sitBusUser', JSON.stringify(result.data));
      setShowLoginModal(false);
      setShowMobileMenu(false);
      alert('Login successful! Welcome ' + result.data.full_name);
      e.target.reset();
    } catch (err) {
      alert('Error: ' + err.message);
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
    alert('Logged out successfully');
  };

  // Filter buses to show only those with location data
  const activeBuses = busesWithLocations?.filter(bus => bus.coordinates) || [];
  const inactiveBuses = busesWithLocations?.filter(bus => !bus.coordinates) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
      {/* Fixed Navigation Header */}
      <header className="bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Name */}
            <Link href="/" className="flex items-center space-x-3 group flex-shrink-0">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                <Navigation className="text-white" size={24} />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">SIT Bus System</h1>
                <p className="text-xs text-gray-500 -mt-1">Smart Campus Transit</p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
              <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium transition-colors border-b-2 border-transparent hover:border-blue-600 pb-1 text-sm lg:text-base">
                Home
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-blue-600 font-medium transition-colors border-b-2 border-transparent hover:border-blue-600 pb-1 text-sm lg:text-base">
                About
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
              <Link href="/help" className="text-gray-700 hover:text-blue-600 font-medium transition-colors border-b-2 border-transparent hover:border-blue-600 pb-1 text-sm lg:text-base">
                Help
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
                    className="bg-red-500 text-white px-3 lg:px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors shadow-sm text-sm lg:text-base"
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
                <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium max-w-[100px] truncate">
                  {currentUser?.full_name?.split(' ')[0]}
                </div>
              )}
              <button 
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="mobile-menu-button text-gray-700 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
              >
                {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {showMobileMenu && (
            <div className="md:hidden mobile-menu py-4 border-t border-gray-200 bg-white/95 backdrop-blur-md absolute left-0 right-0 top-16 shadow-lg">
              <nav className="flex flex-col space-y-1 px-4">
                <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium transition-colors py-3 border-l-4 border-blue-600 pl-4 bg-blue-50 rounded-r-lg">
                  Home
                </Link>
                <Link href="/about" className="text-gray-700 hover:text-blue-600 font-medium transition-colors py-3 pl-4 rounded-r-lg hover:bg-gray-50">
                  About
                </Link>
                <Link href="/announcements" className={`text-gray-700 hover:text-blue-600 font-medium transition-colors py-3 pl-4 rounded-r-lg hover:bg-gray-50 flex items-center ${!isLoggedIn ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Megaphone size={18} className="mr-3" />
                  Announcements
                </Link>
                <Link href="/community" className={`text-gray-700 hover:text-blue-600 font-medium transition-colors py-3 pl-4 rounded-r-lg hover:bg-gray-50 flex items-center ${!isLoggedIn ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Users size={18} className="mr-3" />
                  Community
                </Link>
                <Link href="/complaint" className={`text-gray-700 hover:text-blue-600 font-medium transition-colors py-3 pl-4 rounded-r-lg hover:bg-gray-50 flex items-center ${!isLoggedIn ? 'opacity-50 pointer-events-none' : ''}`}>
                  <AlertTriangle size={18} className="mr-3" />
                  Complaint
                </Link>
                <Link href="/help" className="text-gray-700 hover:text-blue-600 font-medium transition-colors py-3 pl-4 rounded-r-lg hover:bg-gray-50 flex items-center">
                  <Info size={18} className="mr-3" />
                  Help
                </Link>
                <div className="pt-4 border-t border-gray-200 mt-2">
                  {isLoggedIn ? (
                    <button 
                      onClick={handleLogout}
                      className="w-full bg-red-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-600 transition-colors shadow-sm text-center"
                    >
                      Logout
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setShowLoginModal(true);
                        setShowMobileMenu(false);
                      }}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm text-center"
                    >
                      Login
                    </button>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Add padding to account for fixed header */}
      <div className="pt-16"> {/* This matches the header height */}

        {/* Map Modal */}
        {showMapModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowMapModal(false)}>
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">Tracking Bus {selectedBus?.bus_number}</h2>
                    <p className="text-blue-100">{selectedBus?.route_name}</p>
                  </div>
                  <button onClick={() => setShowMapModal(false)} className="text-white hover:text-blue-200 p-2 rounded-full hover:bg-white/10 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
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
                    className="w-full h-96"
                    frameBorder="0"
                    style={{ border: 0 }}
                    allowFullScreen
                    src={getGoogleMapsUrl(selectedCoordinates)}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-gray-600 flex items-center justify-center">
                    <MapPin size={16} className="mr-2 text-red-500" />
                    Live location tracking for Bus {selectedBus?.bus_number}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Login Modal */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowLoginModal(false)}>
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">
                    {showLoginForm ? 'Student Login' : 'Student Registration'}
                  </h2>
                  <button onClick={() => setShowLoginModal(false)} className="text-white hover:text-blue-200 p-2 rounded-full hover:bg-white/10 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {/* Login Form */}
                {showLoginForm ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Hash size={16} className="inline mr-2" />
                        USN *
                      </label>
                      <input
                        type="text"
                        name="usn"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
                        placeholder="Enter your USN"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <LogIn size={16} className="inline mr-2" />
                        Password *
                      </label>
                      <input
                        type="password"
                        name="password"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
                        placeholder="Enter your password"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                    >
                      Login to SIT Bus System
                    </button>

                    <p className="text-center text-sm text-gray-600">
                      Don't have an account? 
                      <button 
                        type="button" 
                        onClick={() => setShowLoginForm(false)}
                        className="text-blue-600 hover:text-blue-700 font-medium ml-1 underline"
                      >
                        Register here
                      </button>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User size={16} className="inline mr-2" />
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <BookOpen size={16} className="inline mr-2" />
                          Class *
                        </label>
                        <input
                          type="text"
                          name="class"
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
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
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
                          placeholder="e.g., A"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Hash size={16} className="inline mr-2" />
                        USN *
                      </label>
                      <input
                        type="text"
                        name="usn"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
                        placeholder="e.g., 1SI20CS001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Branch
                      </label>
                      <select
                        name="branch"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
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
                        <Phone size={16} className="inline mr-2" />
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
                        placeholder="Enter phone number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Mail size={16} className="inline mr-2" />
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
                        placeholder="Enter email address"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <LogIn size={16} className="inline mr-2" />
                        Password *
                      </label>
                      <input
                        type="password"
                        name="password"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
                        placeholder="Create a password"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg"
                    >
                      Create Account
                    </button>

                    <p className="text-center text-sm text-gray-600">
                      Already have an account? 
                      <button 
                        type="button" 
                        onClick={() => setShowLoginForm(true)}
                        className="text-blue-600 hover:text-blue-700 font-medium ml-1 underline"
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
          {/* Single Background Image */}
          <div className="absolute inset-0">
            <img 
              src="/images/sit1.jpg" 
              alt="SIT College Kalaburagi"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            
            {/* Light gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/40 via-blue-700/30 to-indigo-800/20"></div>
          </div>

          {/* Content Container */}
          <div className="relative z-10 h-full flex items-center justify-center">
            <div className="max-w-4xl mx-auto text-center px-4">
              {/* Main Heading */}
              <div className="mb-6">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">
                  Campus Bus Tracker
                </h1>
                <div className="w-20 h-1 bg-gradient-to-r from-green-400 to-emerald-500 mx-auto rounded-full mb-4"></div>
                <p className="text-base md:text-lg text-white max-w-2xl mx-auto leading-relaxed font-light opacity-95">
                  Real-time bus tracking & smart campus transportation
                </p>
              </div>

              {/* Stats */}
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
                  <div className="text-lg md:text-xl font-bold text-white">10+</div>
                  <div className="text-xs md:text-sm text-white opacity-90">Buses</div>
                </div>
                <div className="w-px h-6 bg-white/30"></div>
                <div className="text-center">
                  <div className="text-lg md:text-xl font-bold text-white">24/7</div>
                  <div className="text-xs md:text-sm text-white opacity-90">Service</div>
                </div>
              </div>

              {/* CTA Buttons */}
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
                    className="group bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center text-sm transform hover:scale-105"
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

        {/* Active Buses Section */}
        <section className="py-12 md:py-20 px-4 bg-gradient-to-b from-white to-blue-50 flex-1">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 md:mb-6">
                {activeBuses.length > 0 ? '🚌 Active Campus Buses' : 'Bus Status'}
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto text-base md:text-lg px-4">
                {activeBuses.length > 0 
                  ? 'Track your bus in real-time and never miss your ride' 
                  : 'No buses are currently active. Buses will appear here when drivers start their routes.'}
              </p>
            </div>
            
            {/* Active Buses - Centered Grid */}
            {activeBuses.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    {activeBuses.length} Bus{activeBuses.length > 1 ? 'es' : ''} Active Now
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 justify-items-center">
                  {activeBuses.map((bus, index) => (
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
              </div>
            )}

            {/* Inactive Buses - Centered Grid */}
            {inactiveBuses.length > 0 && (
              <div className="mt-8 md:mt-12">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 md:mb-8 text-center flex items-center justify-center">
                  <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                  Inactive Buses
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 justify-items-center">
                  {inactiveBuses.map((bus, index) => (
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

        {/* Footer */}
        <footer className="bg-gradient-to-br from-gray-900 to-black text-white pt-12 pb-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              {/* Company Info */}
              <div className="md:col-span-2">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
                    <Navigation className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">SIT Bus System</h3>
                    <p className="text-gray-400 text-sm">Smart Campus Transit</p>
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

              {/* Quick Links */}
              <div>
                <h4 className="font-semibold text-lg mb-4 text-white">Quick Links</h4>
                <ul className="space-y-3">
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

              {/* Support */}
              <div>
                <h4 className="font-semibold text-lg mb-4 text-white">Support</h4>
                <ul className="space-y-3">
                  <li><Link href="/help" className="text-gray-400 hover:text-white transition-colors text-base flex items-center">
                    <Info size={16} className="mr-2" />
                    Help Center
                  </Link></li>
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

            {/* Bottom Bar */}
            <div className="border-t border-gray-800 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <p className="text-gray-400 text-sm text-center md:text-left mb-4 md:mb-0">
                  © 2024 SIT Bus System. All rights reserved.
                </p>
                <div className="flex space-x-6">
                  <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                    Privacy Policy
                  </Link>
                  <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                    Terms of Service
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}