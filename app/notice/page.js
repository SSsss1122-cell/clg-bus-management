'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Download, ChevronLeft, AlertCircle, ArrowLeft } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function NoticesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('personal');
  const [filteredNotices, setFilteredNotices] = useState([]);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Enhanced Android back button handling for Capacitor
  useEffect(() => {
    const handleBackButton = (e) => {
      e.preventDefault();
      e.stopPropagation();
      router.push('/');
      return false;
    };

    // Handle browser back button
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handleBackButton);
    
    // Capacitor/Android WebView back button handling
    if (typeof window !== 'undefined') {
      // Method 1: Capacitor App Plugin
      if (window.Capacitor?.Plugins?.App) {
        const backButtonListener = window.Capacitor.Plugins.App.addListener('backButton', () => {
          router.push('/');
        });
        
        return () => {
          backButtonListener.remove();
        };
      }
      
      // Method 2: Direct Android interface
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
      
      // Method 3: Custom event listener
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

  useEffect(() => {
    checkAuthAndFetchNotices();
  }, []);

  // Filter notices based on active tab
  useEffect(() => {
    if (notices.length > 0 && studentId) {
      if (activeTab === 'personal') {
        const personalNotices = notices.filter(notice => 
          notice.student_id === studentId || notice.student_id === null
        );
        setFilteredNotices(personalNotices);
      } else if (activeTab === 'general') {
        const generalNotices = notices.filter(notice => notice.student_id === null);
        setFilteredNotices(generalNotices);
      }
    } else {
      setFilteredNotices(notices);
    }
  }, [activeTab, notices, studentId]);

  const checkAuthAndFetchNotices = async () => {
    try {
      const savedUser = localStorage.getItem('sitBusUser');
      if (!savedUser) {
        alert('Please login to view notices');
        router.push('/');
        return;
      }

      const user = JSON.parse(savedUser);
      
      if (!user.id) {
        setError('User ID not found. Please login again.');
        return;
      }

      setCurrentUser(user);
      setStudentId(user.id);
      
      await verifyStudentExists(user.id);
      await fetchAllNotices();

    } catch (error) {
      console.error('Error in authentication:', error);
      setError('Error loading notices. Please try again.');
    }
  };

  const verifyStudentExists = async (studentId) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, usn')
        .eq('id', studentId)
        .single();

      if (error) {
        console.error('Student not found in database:', error);
        setError('Student record not found. Please contact administration.');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verifying student:', error);
      return false;
    }
  };

  const fetchAllNotices = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: allNotices, error } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setNotices(allNotices || []);
      if (allNotices?.length > 0 && studentId) {
        const personalNotices = allNotices.filter(notice => 
          notice.student_id === studentId || notice.student_id === null
        );
        setFilteredNotices(personalNotices);
      } else {
        setFilteredNotices(allNotices || []);
      }

    } catch (error) {
      console.error('Error fetching notices:', error);
      setError('Unable to load notices. Please try again later.');
      setNotices([]);
      setFilteredNotices([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Date not available';
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      const now = new Date();
      const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
      
      if (diffInHours < 24) {
        return date.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (diffInHours < 48) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
    } catch (error) {
      return 'Date not available';
    }
  };

  const getNoticeType = (notice) => {
    if (notice.student_id === studentId) {
      return { type: 'Personal', color: 'bg-purple-100 text-purple-800', icon: '👤' };
    } else if (notice.student_id === null) {
      return { type: 'General', color: 'bg-blue-100 text-blue-800', icon: '📢' };
    }
    return { type: 'Notice', color: 'bg-gray-100 text-gray-800', icon: '📄' };
  };

  const handleDownloadPDF = (pdfUrl, title) => {
    if (!pdfUrl) {
      alert('No PDF available for download');
      return;
    }

    try {
      if (pdfUrl.startsWith('http')) {
        window.open(pdfUrl, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `${title || 'notice'}.pdf`.replace(/\s+/g, '_');
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error downloading PDF. Please try again.');
    }
  };

  const handleBackButton = () => {
    router.push('/');
  };

  if (!currentUser && loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Simplified Fixed Header with Large Top Gap */}
      <header className="bg-white shadow-lg fixed left-0 right-0 z-50 app-header">
        {/* Back Button Row */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center h-14">
              <button
                onClick={handleBackButton}
                className="flex items-center space-x-2 text-white hover:bg-white/20 active:bg-white/30 px-3 py-2 rounded-lg transition-all"
                aria-label="Go back"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">Back</span>
              </button>
            </div>
          </div>
        </div>

        {/* Title Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
                  <Bell className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Notices</h1>
                  {currentUser?.full_name && (
                    <p className="text-xs text-gray-600">
                      {currentUser.full_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex space-x-2 py-3">
              <button
                onClick={() => setActiveTab('personal')}
                className={`px-4 py-2.5 rounded-lg transition-all duration-300 flex items-center space-x-2 flex-1 justify-center ${activeTab === 'personal' 
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm border border-gray-200'}`}
              >
                <span className="text-sm font-medium flex items-center">
                  <span className="mr-1.5">👤</span>
                  Personal
                </span>
                {activeTab === 'personal' && filteredNotices.length > 0 && (
                  <span className="bg-white text-purple-600 text-xs px-2 py-0.5 rounded-full font-bold">
                    {filteredNotices.filter(n => n.student_id === studentId || n.student_id === null).length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('general')}
                className={`px-4 py-2.5 rounded-lg transition-all duration-300 flex items-center space-x-2 flex-1 justify-center ${activeTab === 'general' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm border border-gray-200'}`}
              >
                <span className="text-sm font-medium flex items-center">
                  <span className="mr-1.5">📢</span>
                  General
                </span>
                {activeTab === 'general' && filteredNotices.length > 0 && (
                  <span className="bg-white text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold">
                    {filteredNotices.filter(n => n.student_id === null).length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Large Top Margin */}
      <div className="app-content">
        <div className="max-w-4xl mx-auto py-4 px-4">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="text-red-500 mr-2 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Active Tab Info Card */}
          <div className="mb-4 bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-gray-900 flex items-center">
                  {activeTab === 'personal' ? (
                    <>
                      <span className="text-purple-600 mr-2">👤</span>
                      Personal Notices
                    </>
                  ) : (
                    <>
                      <span className="text-blue-600 mr-2">📢</span>
                      General Notices
                    </>
                  )}
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  {activeTab === 'personal' 
                    ? 'Your personal notices and announcements'
                    : 'General announcements for all students'
                  }
                </p>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 ${activeTab === 'personal' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                {filteredNotices.length}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 text-sm">Loading notices...</p>
            </div>
          ) : (
            <div className="space-y-4 pb-6">
              {filteredNotices.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg text-center py-12 px-4">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell size={28} className="text-gray-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-600 mb-2">
                    No {activeTab === 'personal' ? 'Personal' : 'General'} Notices
                  </h3>
                  <p className="text-gray-500 text-sm max-w-md mx-auto">
                    {activeTab === 'personal' 
                      ? 'You don\'t have any personal notices at the moment.'
                      : 'No general notices available at the moment.'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotices.map((notice) => {
                    const noticeType = getNoticeType(notice);
                    return (
                      <div key={notice.id} className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow overflow-hidden">
                        <div className="p-4">
                          {/* Notice Header */}
                          <div className="flex justify-between items-start mb-3 gap-2">
                            <div className={`${noticeType.color} px-3 py-1.5 rounded-full text-xs font-medium flex items-center flex-shrink-0`}>
                              <span className="mr-1">{noticeType.icon}</span>
                              {noticeType.type}
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatDate(notice.created_at)}
                            </span>
                          </div>

                          {/* Notice Title */}
                          <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2">
                            {notice.title || 'Untitled Notice'}
                          </h3>

                          {/* Notice Description */}
                          {notice.description && (
                            <div className="mb-3">
                              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line line-clamp-3">
                                {notice.description}
                              </p>
                            </div>
                          )}

                          {/* PDF Download */}
                          {notice.pdf_url && (
                            <div className="border-t border-gray-200 pt-3 mt-3">
                              <button
                                onClick={() => handleDownloadPDF(notice.pdf_url, notice.title)}
                                className="inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2.5 rounded-lg hover:from-blue-600 hover:to-indigo-700 active:from-blue-700 active:to-indigo-800 transition-all shadow-md hover:shadow-lg w-full text-sm font-medium"
                              >
                                <Download size={16} />
                                <span>Download PDF</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Information Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-lg w-10 h-10 flex items-center justify-center">
                      <Bell size={18} className="text-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-blue-800 mb-1 text-sm">About Notices</h4>
                    <ul className="text-blue-700 text-xs space-y-1">
                      <li>• <span className="font-medium text-purple-700">Personal</span> - Sent specifically to you</li>
                      <li>• <span className="font-medium text-blue-700">General</span> - Sent to all students</li>
                      <li>• Switch between tabs above</li>
                      <li>• Download PDF attachments when available</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Capacitor/Android App Optimized Styles */}
      <style jsx global>{`
        /* Reset for Capacitor app - remove all default margins */
        html, body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }
        
        /* Header with LARGE top margin for Android/Capacitor apps */
        .app-header {
          top: 0;
          padding-top: 60px; /* Large gap for Android status bar */
        }
        
        /* Additional padding for devices with notches/safe areas */
        @supports (padding-top: env(safe-area-inset-top)) {
          .app-header {
            padding-top: max(60px, calc(env(safe-area-inset-top) + 40px));
          }
        }
        
        /* Content area - starts below header with extra spacing */
        .app-content {
          margin-top: 240px; /* Very large top margin to clear header */
          padding-bottom: 40px;
          min-height: calc(100vh - 240px);
        }
        
        /* Mobile-specific adjustments */
        @media only screen and (max-width: 767px) {
          .app-header {
            padding-top: 70px; /* Even more space on mobile */
          }
          
          .app-content {
            margin-top: 260px; /* Extra space for mobile */
          }
        }
        
        /* Landscape mode adjustments */
        @media only screen and (max-height: 500px) and (orientation: landscape) {
          .app-header {
            padding-top: 40px;
          }
          
          .app-content {
            margin-top: 200px;
          }
        }
        
        /* Smooth scrolling for app */
        .app-content {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        
        /* Prevent bounce effect */
        body {
          overscroll-behavior-y: none;
          position: fixed;
          width: 100%;
          height: 100%;
        }
        
        #__next {
          height: 100%;
          overflow-y: auto;
        }
        
        /* Line clamp utilities */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        /* Button active states for better mobile feedback */
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
      `}</style>
    </div>
  );
}