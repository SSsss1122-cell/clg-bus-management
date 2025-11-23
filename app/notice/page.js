'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, FileText, ArrowLeft, Download, Calendar, User } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function NoticesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndFetchNotices();
  }, []);

  const checkAuthAndFetchNotices = async () => {
    // Check if user is logged in
    const savedUser = localStorage.getItem('sitBusUser');
    if (!savedUser) {
      alert('Please login to view notices');
      router.push('/');
      return;
    }

    const user = JSON.parse(savedUser);
    setCurrentUser(user);
    fetchUserNotices(user.student_id);
  };

  const fetchUserNotices = async (studentId) => {
    try {
      setLoading(true);
      
      // Fetch notices targeted to this student
      const { data: noticeStudents, error } = await supabase
        .from('notice_students')
        .select(`
          notice_id,
          notices (
            id,
            title,
            description,
            pdf_url,
            created_at
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Extract notices from the joined data
      const userNotices = noticeStudents?.map(item => item.notices).filter(notice => notice) || [];
      setNotices(userNotices);

    } catch (error) {
      console.error('Error fetching notices:', error);
      alert('Error loading notices');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownloadPDF = (pdfUrl, title) => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${title}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
                <Bell className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">My Notices</h1>
                <p className="text-xs text-gray-600 -mt-1">Important announcements for you</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center">
                <User size={16} className="mr-2" />
                <span className="max-w-[120px] truncate">{currentUser.full_name}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your notices...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Notices Count */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Notices ({notices.length})
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    These notices are specifically sent to you by the administration
                  </p>
                </div>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Personal
                </div>
              </div>
            </div>

            {/* Notices List */}
            {notices.length === 0 ? (
              <div className="bg-white rounded-lg shadow text-center py-16">
                <Bell size={64} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Notices Yet</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  You don't have any notices at the moment. Notices sent specifically to you will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {notices.map((notice) => (
                  <div key={notice.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="p-6">
                      {/* Notice Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {notice.title}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Calendar size={14} className="mr-1" />
                              <span>{formatDate(notice.created_at)}</span>
                            </div>
                            <div className="flex items-center">
                              <Bell size={14} className="mr-1" />
                              <span>Personal Notice</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Notice Description */}
                      {notice.description && (
                        <div className="mb-4">
                          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                            {notice.description}
                          </p>
                        </div>
                      )}

                      {/* PDF Download */}
                      {notice.pdf_url && (
                        <div className="border-t border-gray-200 pt-4 mt-4">
                          <button
                            onClick={() => handleDownloadPDF(notice.pdf_url, notice.title)}
                            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Download size={16} />
                            <span>Download PDF</span>
                          </button>
                          <p className="text-xs text-gray-500 mt-2">
                            Click to download the attached document
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Information Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Bell size={20} className="text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-800 mb-1">About Notices</h4>
                  <p className="text-blue-700 text-sm">
                    These notices are specifically targeted to you by the college administration. 
                    They may contain important information about fees, exams, events, or other 
                    college-related matters that concern you personally.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}