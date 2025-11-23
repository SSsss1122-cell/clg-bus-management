'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Megaphone, User, Calendar, ArrowLeft } from 'lucide-react';

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

  const handleLogout = () => {
    localStorage.removeItem('sitBusUser');
    setIsLoggedIn(false);
    setCurrentUser(null);
    router.push('/');
  };

  const goBack = () => {
    router.push('/');
  };

  // Show loading while checking authentication
  if (!isLoggedIn && isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 px-3 safe-area-bottom">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-gray-600 text-sm">Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 px-3 safe-area-bottom">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600 mb-4">Please login to view announcements</p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 px-3 safe-area-bottom">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-gray-600 text-sm">Loading announcements...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-3 safe-area-bottom">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={goBack}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Megaphone className="text-white" size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-gray-900 truncate">Announcements</h1>
                <p className="text-gray-600 text-xs truncate">Important updates and notices for all students</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-right hidden xs:block">
                <div className="text-xs text-gray-600">Welcome</div>
                <div className="font-medium text-orange-600 text-xs">
                  {currentUser?.full_name}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"
                title="Logout"
              >
                <User size={16} className="text-red-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Announcements Container - Chat-like Interface */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-[calc(100vh-180px)] min-h-[500px] flex flex-col">
          {/* Announcements Header */}
          <div className="border-b border-gray-200 p-4 bg-orange-50 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Megaphone size={18} className="text-orange-600" />
                <h2 className="font-semibold text-gray-900">Official Announcements</h2>
              </div>
              <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded-full border">
                {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Announcements List - Chat-like Layout */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {announcements.length > 0 ? (
              announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="flex justify-start" // All announcements appear on left like received messages
                >
                  <div className="max-w-[85%]">
                    {/* Announcement Header */}
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Megaphone size={12} className="text-white" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-gray-900">Admin</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
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
                      <h3 className="font-bold text-gray-900 text-lg mb-2">
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

          {/* Info Footer - No Input Box */}
          <div className="border-t border-gray-200 p-3 bg-gray-50 rounded-b-xl">
            <div className="text-center">
              <p className="text-xs text-gray-600">
                💡 Announcements are read-only. Only administrators can post new announcements.
              </p>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
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

      {/* Mobile-specific CSS for safe areas */}
      <style jsx>{`
        .safe-area-bottom {
          padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
        }
        
        /* Custom scrollbar for mobile */
        .overflow-y-auto {
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .overflow-y-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}