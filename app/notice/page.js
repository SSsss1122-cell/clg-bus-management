'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, FileText, ArrowLeft, Download, Calendar, User, Home, Menu, X, AlertCircle } from 'lucide-react';
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [error, setError] = useState('');

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showMobileMenu]);

  useEffect(() => {
    checkAuthAndFetchNotices();
  }, []);

  const checkAuthAndFetchNotices = async () => {
    try {
      // Check if user is logged in
      const savedUser = localStorage.getItem('sitBusUser');
      if (!savedUser) {
        alert('Please login to view notices');
        router.push('/');
        return;
      }

      const user = JSON.parse(savedUser);
      
      // Check if user has an ID (required for fetching notices)
      if (!user.id) {
        setError('User ID not found. Please login again.');
        return;
      }

      setCurrentUser(user);
      setStudentId(user.id);
      
      // Fetch student details to confirm user exists in database
      await verifyStudentExists(user.id);
      
      // Fetch notices for this specific student
      await fetchStudentNotices(user.id);

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

  const fetchStudentNotices = async (studentId) => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching notices for student ID:', studentId);

      // Fetch notices specifically for this student
      const { data: studentNotices, error } = await supabase
        .from('notices')
        .select('*')
        .or(`student_id.eq.${studentId},student_id.is.null`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Fetched notices:', studentNotices);

      if (!studentNotices || studentNotices.length === 0) {
        setNotices([]);
        return;
      }

      // Filter notices: get personal notices for this student AND general notices (where student_id is null)
      const filteredNotices = studentNotices.filter(notice => 
        notice.student_id === studentId || notice.student_id === null
      );

      console.log('Filtered notices:', filteredNotices);
      setNotices(filteredNotices);

    } catch (error) {
      console.error('Error fetching notices:', error);
      setError('Unable to load notices. Please try again later.');
      setNotices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllGeneralNotices = async () => {
    try {
      setLoading(true);
      
      // Fetch all general notices (where student_id is null)
      const { data: generalNotices, error } = await supabase
        .from('notices')
        .select('*')
        .is('student_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotices(generalNotices || []);
      
    } catch (error) {
      console.error('Error fetching general notices:', error);
      setError('Unable to load general notices.');
      setNotices([]);
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
        // Show time for today's notices
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
      // For external URLs, open in new tab
      if (pdfUrl.startsWith('http')) {
        window.open(pdfUrl, '_blank');
      } else {
        // For relative paths or Supabase storage
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

  const handleLogout = () => {
    localStorage.removeItem('sitBusUser');
    router.push('/');
  };

  const goToHome = () => {
    router.push('/');
  };

  const showGeneralNotices = () => {
    fetchAllGeneralNotices();
  };

  const showPersonalNotices = () => {
    if (studentId) {
      fetchStudentNotices(studentId);
    }
  };

  // Show loading while checking authentication
  if (!currentUser && loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center safe-area-inset">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 safe-area-inset">
      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          onClick={() => setShowMobileMenu(false)}
        >
          <div 
            className="absolute top-0 right-0 h-full w-3/4 max-w-xs bg-white shadow-2xl mobile-menu"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Menu Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-lg">Menu</h3>
              <button 
                onClick={() => setShowMobileMenu(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6 text-gray-800" />
              </button>
            </div>

            {/* Mobile Menu Content */}
            <div className="h-full overflow-y-auto p-4 bg-white">
              <nav className="flex flex-col space-y-1">
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    goToHome();
                  }}
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors py-4 px-4 rounded-lg hover:bg-blue-50 text-left flex items-center border border-gray-100 hover:border-blue-200 shadow-sm"
                >
                  <Home size={20} className="mr-3 text-blue-600" />
                  <span className="font-semibold">Home</span>
                </button>

                <div className="pt-6 border-t border-gray-200 mt-4 space-y-3">
                  {currentUser && (
                    <>
                      <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 shadow-sm">
                        <div className="flex items-center mb-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                            <User size={18} className="text-white" />
                          </div>
                          <div className="ml-3">
                            <p className="font-semibold text-gray-900 truncate">{currentUser.full_name}</p>
                            <p className="text-xs text-gray-600 truncate">{currentUser.usn || 'Student'}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setShowMobileMenu(false);
                            handleLogout();
                          }}
                          className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-red-600 hover:to-rose-700 transition-all shadow-sm text-center"
                        >
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Header - Mobile Responsive */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40 safe-area-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left Section */}
            <div className="flex items-center space-x-3">
              {isMobile ? (
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Menu size={20} />
                </button>
              ) : (
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Bell className="text-white" size={20} />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">My Notices</h1>
                <p className="text-xs text-gray-600 -mt-1 truncate">
                  {currentUser?.full_name ? `For ${currentUser.full_name}` : 'Important announcements'}
                </p>
              </div>
            </div>
            
            {/* Right Section */}
            <div className="flex items-center space-x-2 md:space-x-4">
              {currentUser && !isMobile && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 md:px-4 py-2 rounded-lg font-medium shadow-sm flex items-center max-w-[140px] md:max-w-none">
                  <User size={14} className="mr-2 flex-shrink-0" />
                  <span className="truncate text-sm">{currentUser.full_name}</span>
                </div>
              )}
              {currentUser && isMobile && (
                <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium max-w-[100px] truncate">
                  {currentUser.full_name?.split(' ')[0]}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-4 md:py-8 px-3 md:px-4 sm:px-6 lg:px-8">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="text-red-500 mr-2" size={20} />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Filter Buttons */}
        <div className="mb-4 flex space-x-2 overflow-x-auto pb-2">
          <button
            onClick={showPersonalNotices}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium whitespace-nowrap"
          >
            👤 Personal Notices
          </button>
          <button
            onClick={showGeneralNotices}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
          >
            📢 General Notices
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading notices...</p>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {/* Notices Count Card */}
            <div className="bg-white rounded-xl shadow p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                    Notices ({notices.length})
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {studentId 
                      ? 'Personal notices for you and general college announcements'
                      : 'General college announcements'
                    }
                  </p>
                </div>
                {notices.length > 0 && (
                  <div className="flex space-x-2">
                    <div className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-medium">
                      {notices.filter(n => n.student_id === studentId).length} Personal
                    </div>
                    <div className="bg-gray-100 text-gray-800 px-3 py-1.5 rounded-full text-sm font-medium">
                      {notices.filter(n => n.student_id === null).length} General
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notices List */}
            {notices.length === 0 ? (
              <div className="bg-white rounded-xl shadow text-center py-12 md:py-16 px-4">
                <div className="bg-gray-100 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <Bell size={isMobile ? 28 : 36} className="text-gray-400" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-600 mb-2">No Notices Found</h3>
                <p className="text-gray-500 text-sm md:text-base max-w-md mx-auto">
                  {studentId 
                    ? 'You don\'t have any personal notices at the moment. Check general notices for college announcements.'
                    : 'No general notices available at the moment.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {notices.map((notice) => {
                  const noticeType = getNoticeType(notice);
                  return (
                    <div key={notice.id} className="bg-white rounded-xl shadow border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
                      <div className="p-4 md:p-6">
                        {/* Notice Header with Type Badge */}
                        <div className="flex justify-between items-start mb-3">
                          <div className={`${noticeType.color} px-3 py-1 rounded-full text-xs font-medium flex items-center`}>
                            <span className="mr-1">{noticeType.icon}</span>
                            {noticeType.type}
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(notice.created_at)}
                          </span>
                        </div>

                        {/* Notice Title */}
                        <h3 className="text-base md:text-xl font-bold text-gray-900 mb-2">
                          {notice.title || 'Untitled Notice'}
                        </h3>

                        {/* Notice Description */}
                        {notice.description && (
                          <div className="mb-3 md:mb-4">
                            <p className="text-gray-700 text-sm md:text-base leading-relaxed whitespace-pre-line">
                              {notice.description}
                            </p>
                          </div>
                        )}

                        {/* PDF Download */}
                        {notice.pdf_url && (
                          <div className="border-t border-gray-200 pt-3 md:pt-4 mt-3 md:mt-4">
                            <button
                              onClick={() => handleDownloadPDF(notice.pdf_url, notice.title)}
                              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2.5 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md w-full md:w-auto justify-center"
                            >
                              <Download size={16} />
                              <span className="font-medium">Download PDF</span>
                            </button>
                            <p className="text-xs text-gray-500 mt-2">
                              Click to download the attached document
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Information Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
                <div className="flex-shrink-0">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2.5 md:p-3 rounded-lg w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
                    <Bell size={isMobile ? 16 : 20} className="text-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-blue-800 mb-1 text-sm md:text-base">About Notices</h4>
                  <ul className="text-blue-700 text-xs md:text-sm space-y-1">
                    <li>• <span className="font-medium text-purple-700">Personal Notices</span> - Sent specifically to you (marked with 👤)</li>
                    <li>• <span className="font-medium text-blue-700">General Notices</span> - Sent to all students (marked with 📢)</li>
                    <li>• Check both tabs for complete information</li>
                    <li>• Download PDF attachments when available</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Navigation Footer */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 safe-area-bottom z-30">
          <div className="flex justify-around items-center">
            <button
              onClick={goToHome}
              className="flex flex-col items-center space-y-1 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Home size={20} className="text-gray-600" />
              <span className="text-xs text-gray-600">Home</span>
            </button>
            <button
              onClick={() => setShowMobileMenu(true)}
              className="flex flex-col items-center space-y-1 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Menu size={20} className="text-gray-600" />
              <span className="text-xs text-gray-600">Menu</span>
            </button>
            {currentUser && (
              <div className="flex flex-col items-center space-y-1 p-2">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
                <span className="text-xs text-gray-600 truncate max-w-[60px]">
                  {currentUser.full_name?.split(' ')[0]}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}