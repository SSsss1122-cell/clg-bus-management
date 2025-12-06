'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Camera, Video, FileText, ArrowLeft, CheckCircle, Clock, XCircle, User, Hash, BookOpen, Phone } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function ComplaintsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [showForm, setShowForm] = useState(true);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    photo: null,
    video: null
  });

  useEffect(() => {
    initializePage();
  }, [router]);

  const initializePage = async () => {
    // Check if user is logged in
    const savedUser = localStorage.getItem('sitBusUser');
    if (!savedUser) {
      alert('Please login to access complaints');
      router.push('/');
      return;
    }

    const user = JSON.parse(savedUser);
    setCurrentUser(user);
    
    // Load user's complaints from Supabase
    await loadUserComplaints(user.id);
    setLoading(false);
  };

  const loadUserComplaints = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('student_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setComplaints(data || []);
    } catch (error) {
      console.error('Error loading complaints:', error);
      setComplaints([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    }
  };

  const uploadToSupabaseStorage = async (file, fileName) => {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('complaints')
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('complaints')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please enter both title and description');
      return;
    }

    setIsSubmitting(true);

    try {
      let photoUrl = null;
      let videoUrl = null;

      // Upload files to Supabase Storage if they exist
      if (formData.photo) {
        photoUrl = await uploadToSupabaseStorage(formData.photo, 'photo');
      }

      if (formData.video) {
        videoUrl = await uploadToSupabaseStorage(formData.video, 'video');
      }

      // Insert complaint into Supabase
      const { data, error } = await supabase
        .from('complaints')
        .insert([
          {
            student_id: currentUser.id,
            title: formData.title,
            description: formData.description,
            photo_url: photoUrl,
            video_url: videoUrl,
            status: 'pending'
          }
        ])
        .select();

      if (error) {
        throw error;
      }

      // Reload complaints to include the new one
      await loadUserComplaints(currentUser.id);
      
      alert('Complaint submitted successfully!');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        photo: null,
        video: null
      });
      
      // Clear file inputs
      const titleInput = document.querySelector('input[name="title"]');
      const descriptionInput = document.querySelector('textarea[name="description"]');
      const photoInput = document.querySelector('input[name="photo"]');
      const videoInput = document.querySelector('input[name="video"]');
      if (titleInput) titleInput.value = '';
      if (descriptionInput) descriptionInput.value = '';
      if (photoInput) photoInput.value = '';
      if (videoInput) videoInput.value = '';

      // Switch to complaints view
      setShowForm(false);

    } catch (error) {
      console.error('Error submitting complaint:', error);
      alert('Error submitting complaint: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'in_progress':
        return <Clock size={14} className="text-blue-500" />;
      case 'rejected':
        return <XCircle size={14} className="text-red-500" />;
      default:
        return <Clock size={14} className="text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
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

  if (!currentUser || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Top Spacing for Mobile */}
      <div className="pt-4">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-blue-100">
          <div className="px-3 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {/* Back Button */}
                <button
                  onClick={() => router.back()}
                  className="w-8 h-8 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors"
                >
                  <span className="text-blue-600 text-lg">←</span>
                </button>
                
                <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="text-white" size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base font-bold text-gray-900 truncate">Bus Complaints</h1>
                  <p className="text-xs text-gray-600 truncate">Report issues with bus service</p>
                </div>
              </div>
              
              {/* User Info */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg font-medium flex items-center max-w-[100px]">
                <User size={12} className="mr-1.5" />
                <span className="truncate text-xs">{currentUser.full_name.split(' ')[0]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with spacing */}
      <div className="px-3 py-4">
        {/* Spacing above toggle buttons */}
        <div className="mt-2">
          {/* Toggle Buttons */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setShowForm(true)}
              className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-xs transition-all ${
                showForm 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500'
              }`}
            >
              New Complaint
            </button>
            <button
              onClick={() => setShowForm(false)}
              className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-xs transition-all ${
                !showForm 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500'
              }`}
            >
              History ({complaints.length})
            </button>
          </div>
        </div>

        {showForm ? (
          /* Complaint Form */
          <div className="bg-white rounded-lg shadow p-3 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Submit a Complaint</h2>
            
            {/* User Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <h3 className="font-semibold text-blue-800 text-xs mb-2">Your Information</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center bg-white p-1.5 rounded border border-blue-100">
                  <User size={10} className="text-blue-600 mr-1" />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-700 truncate">Name</div>
                    <div className="text-gray-900 truncate">{currentUser.full_name}</div>
                  </div>
                </div>
                <div className="flex items-center bg-white p-1.5 rounded border border-blue-100">
                  <Hash size={10} className="text-blue-600 mr-1" />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-700 truncate">USN</div>
                    <div className="text-gray-900 truncate">{currentUser.usn}</div>
                  </div>
                </div>
                <div className="flex items-center bg-white p-1.5 rounded border border-blue-100">
                  <BookOpen size={10} className="text-blue-600 mr-1" />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-700 truncate">Branch</div>
                    <div className="text-gray-900 truncate">{currentUser.branch}</div>
                  </div>
                </div>
                <div className="flex items-center bg-white p-1.5 rounded border border-blue-100">
                  <Phone size={10} className="text-blue-600 mr-1" />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-700 truncate">Phone</div>
                    <div className="text-gray-900 truncate">{currentUser.phone || '-'}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Complaint Title */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Complaint Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm"
                  placeholder="Enter complaint title"
                />
              </div>

              {/* Complaint Description */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Complaint Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm resize-none"
                  placeholder="Describe your complaint..."
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Upload Photo (Optional)
                </label>
                <input
                  type="file"
                  name="photo"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-xs"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">JPG, PNG, JPEG (Max 5MB)</p>
              </div>

              {/* Video Upload */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Upload Video (Optional)
                </label>
                <input
                  type="file"
                  name="video"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-xs"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">MP4, MOV, AVI (Max 25MB)</p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
                className="w-full bg-gradient-to-r from-red-500 to-orange-600 text-white py-3 rounded-lg font-medium hover:from-red-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  'Submit Complaint'
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Complaints History */
          <div className="bg-white rounded-lg shadow p-3 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-800">My Complaint History</h2>
              <span className="text-xs text-gray-500">{complaints.length} total</span>
            </div>
            
            {complaints.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={32} className="text-gray-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-gray-600 mb-1">No Complaints Yet</h3>
                <p className="text-gray-500 text-xs">Submit your first complaint</p>
              </div>
            ) : (
              <div className="space-y-2">
                {complaints.map((complaint) => (
                  <div key={complaint.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-gray-800 text-sm flex-1 pr-2">{complaint.title}</h3>
                        <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(complaint.status)}`}>
                          {getStatusIcon(complaint.status)}
                          <span className="capitalize">{complaint.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <p className="text-gray-600 text-xs line-clamp-2">{complaint.description}</p>
                      <p className="text-[10px] text-gray-500 mt-1">Submitted: {formatDate(complaint.created_at)}</p>
                      
                      {/* Media preview if available */}
                      {(complaint.photo_url || complaint.video_url) && (
                        <div className="flex space-x-3 mt-2 pt-2 border-t border-gray-100">
                          {complaint.photo_url && (
                            <a 
                              href={complaint.photo_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 text-[10px] text-blue-600 hover:text-blue-700"
                            >
                              <Camera size={10} />
                              <span>Photo</span>
                            </a>
                          )}
                          {complaint.video_url && (
                            <a 
                              href={complaint.video_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 text-[10px] text-purple-600 hover:text-purple-700"
                            >
                              <Video size={10} />
                              <span>Video</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom spacing */}
      <div className="pb-4"></div>

      {/* Responsive styles for larger screens */}
      <style jsx global>{`
        @media (min-width: 640px) {
          .min-h-screen {
            padding-top: 1.5rem;
            padding-bottom: 1.5rem;
          }
          .pt-4 {
            padding-top: 2rem !important;
          }
          .px-3 {
            padding-left: 1.5rem;
            padding-right: 1.5rem;
          }
          .py-4 {
            padding-top: 2rem;
            padding-bottom: 2rem;
          }
          .rounded-lg {
            border-radius: 1rem;
          }
          .p-3 {
            padding: 1.5rem;
          }
          .text-xs {
            font-size: 0.875rem;
          }
          .text-sm {
            font-size: 1rem;
          }
          .text-lg {
            font-size: 1.5rem;
          }
          .w-8 {
            width: 2.5rem;
          }
          .h-8 {
            height: 2.5rem;
          }
          .py-2.5 {
            padding-top: 0.75rem;
            padding-bottom: 0.75rem;
          }
          .space-y-3 > * + * {
            margin-top: 1rem;
          }
          .mt-2 {
            margin-top: 1rem !important;
          }
          .mb-6 {
            margin-bottom: 2rem !important;
          }
        }
        
        @media (min-width: 768px) {
          .pt-4 {
            padding-top: 3rem !important;
          }
          .px-3 {
            padding-left: 2rem;
            padding-right: 2rem;
          }
          .max-w-4xl {
            max-width: 56rem;
          }
          .mx-auto {
            margin-left: auto;
            margin-right: auto;
          }
        }
      `}</style>
    </div>
  );
}