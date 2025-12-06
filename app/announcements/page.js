'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Megaphone, User, ArrowLeft } from 'lucide-react';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const announcementsEndRef = useRef(null);
  const router = useRouter();

  // Check if user is logged in
  useEffect(() => {
    const checkLoginStatus = () => {
      try {
        const savedUser = localStorage.getItem('sitBusUser');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          setIsLoggedIn(true);
        } else {
          alert('Please login first to view announcements');
          router.push('/');
          return;
        }
      } catch (error) {
        console.error('Error checking login status:', error);
        alert('Please login first to view announcements');
        router.push('/');
      }
    };

    checkLoginStatus();
  }, [router]);

  // Enhanced Android back button handling for Capacitor
  useEffect(() => {
    const handleBackButton = (e) => {
      e.preventDefault();
      e.stopPropagation();
      router.push('/');
      return false;
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handleBackButton);
    
    // Capacitor/Android WebView back button handling
    if (typeof window !== 'undefined') {
      if (window.Capacitor?.Plugins?.App) {
        const backButtonListener = window.Capacitor.Plugins.App.addListener('backButton', () => {
          router.push('/');
        });
        
        return () => {
          backButtonListener.remove();
        };
      }
      
      if (window.Android && typeof window.Android.onBackPressed === 'function') {
        const originalBackPressed = window.Android.onBackPressed;
        window.Android.onBackPressed = () => {
          router.push('/');
          return true;
        };
        
        return () => {
          window.Android.onBackPressed = originalBackPressed;
        };
      }
      
      const handleAndroidBack = () => {
        router.push('/');
      };
      
      window.addEventListener('android:back', handleAndroidBack);
      
      return () => {
        window.removeEventListener('popstate', handleBackButton);
        window.removeEventListener('android:back', handleAndroidBack);
      };
    }

    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [router]);

  // Fetch announcements from Supabase
  const fetchAnnouncements = async () => {
    if (!isLoggedIn) return;
    
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (isLoggedIn) {
      fetchAnnouncements();

      const subscription = supabase
        .channel('announcements')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'announcements'
          },
          (payload) => {
            setAnnouncements(prev => [payload.new, ...prev]);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isLoggedIn]);

  // Scroll to top when new announcements arrive
  useEffect(() => {
    announcementsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [announcements]);

  const formatAnnouncementTime = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = (now - date) / (1000 * 60);
      
      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${Math.floor(diffInMinutes)}m ago`;
      } else if (diffInMinutes < 1440) {
        return `${Math.floor(diffInMinutes / 60)}h ago`;
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (error) {
      return 'Recently';
    }
  };

  const goBack = () => {
    router.push('/');
  };

  // Show loading while checking authentication
  if (!isLoggedIn && isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render if not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-4 text-sm">Please login to view announcements</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading announcements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Fixed Header */}
      <header className="bg-white shadow-lg fixed left-0 right-0 z-50 app-header">
        {/* Combined Header Row with Back Button and Title */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              {/* Back Button */}
              <button
                onClick={goBack}
                className="flex items-center space-x-2 text-white hover:bg-white/20 active:bg-white/30 p-2 rounded-lg transition-all"
                aria-label="Go back"
              >
                <ArrowLeft size={22} />
              </button>
              
              {/* Title and User Name */}
              <div className="flex items-center space-x-3 flex-1 ml-3">
                <div className="bg-white/20 backdrop-blur-sm w-10 h-10 rounded-xl flex items-center justify-center">
                  <Megaphone className="text-white" size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-bold text-white truncate">Announcements</h1>
                  {currentUser?.full_name && (
                    <p className="text-xs text-white/90 truncate">
                      {currentUser.full_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Proper Spacing */}
      <div className="app-content">
        <div className="max-w-4xl mx-auto px-4 pb-6">
          {/* Announcements Container - Chat-like Interface */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col announcements-container">
            {/* Announcements Header */}
            <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Megaphone size={18} className="text-blue-600" />
                  <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Official Announcements</h2>
                </div>
                <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded-full border">
                  {announcements.length}
                </div>
              </div>
            </div>

            {/* Announcements List - Chat-like Layout */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 announcements-list">
              {announcements.length > 0 ? (
                announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="flex justify-start"
                  >
                    <div className="max-w-[90%] sm:max-w-[85%]">
                      {/* Announcement Header */}
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <Megaphone size={12} className="text-white" />
                        </div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          <span className="text-sm font-semibold text-gray-900">Admin</span>
                          <span className="text-xs text-gray-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            Official
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatAnnouncementTime(announcement.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Announcement Content - Like a message bubble */}
                      <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3 border border-gray-200">
                        {/* Title */}
                        <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-2">
                          {announcement.title}
                        </h3>
                        
                        {/* Message */}
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                          {announcement.message}
                        </p>
                      </div>
                      
                      {/* Footer */}
                      <div className="mt-1 flex justify-end">
                        <span className="text-xs text-gray-400">
                          {formatAnnouncementTime(announcement.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Megaphone size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Announcements Yet</h3>
                  <p className="text-gray-500 text-sm px-4">
                    Check back later for important updates and notices
                  </p>
                </div>
              )}
              <div ref={announcementsEndRef} />
            </div>

            {/* Info Footer */}
            <div className="border-t border-gray-200 p-3 bg-gray-50 rounded-b-xl flex-shrink-0">
              <div className="text-center">
                <p className="text-xs text-gray-600">
                  💡 Announcements are read-only. Only administrators can post.
                </p>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-100 rounded-xl p-4 border border-blue-200 shadow-md">
            <h3 className="font-semibold text-blue-900 text-sm mb-2 flex items-center">
              <Megaphone size={16} className="mr-2" />
              About Announcements
            </h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• View important updates about bus schedules and routes</li>
              <li>• Get emergency notifications and service changes</li>
              <li>• Stay informed about campus transportation</li>
              <li>• Real-time updates - no refresh needed</li>
              <li>• Read-only for students</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mobile-Responsive Styles */}
      <style jsx global>{`
        /* Reset for app */
        html, body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          background: linear-gradient(to bottom right, #eff6ff, #e0e7ff);
        }
        
        /* Header with NO top padding - flush with top */
        .app-header {
          top: 0;
          padding-top: 0;
        }
        
        /* Safe area support */
        @supports (padding-top: env(safe-area-inset-top)) {
          .app-header {
            padding-top: env(safe-area-inset-top);
          }
        }
        
        /* Content area */
        .app-content {
          margin-top: 70px;
          padding-bottom: 20px;
          min-height: calc(100vh - 70px);
        }
        
        /* Mobile adjustments */
        @media only screen and (max-width: 767px) {
          .app-content {
            margin-top: 75px;
          }
        }
        
        /* Announcements container height */
        .announcements-container {
          height: calc(100vh - 220px);
          min-height: 400px;
        }
        
        @media only screen and (max-width: 767px) {
          .announcements-container {
            height: calc(100vh - 240px);
            min-height: 350px;
          }
        }
        
        @media only screen and (max-width: 480px) {
          .announcements-container {
            height: calc(100vh - 250px);
            min-height: 300px;
          }
        }
        
        /* Smooth scrolling */
        .announcements-list {
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: rgba(59, 130, 246, 0.3) transparent;
        }
        
        .announcements-list::-webkit-scrollbar {
          width: 6px;
        }
        
        .announcements-list::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .announcements-list::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 3px;
        }
        
        .announcements-list::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }
        
        /* Prevent bounce effect */
        body {
          overscroll-behavior-y: none;
        }
        
        /* Button active states */
        button:active {
          transform: scale(0.98);
        }
        
        /* Prevent text selection on buttons */
        button {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }
        
        /* Optimize rendering */
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        /* Prevent horizontal scroll */
        .min-w-0 {
          min-width: 0;
        }
        
        /* Truncate text */
        .truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}