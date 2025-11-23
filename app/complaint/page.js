'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Camera, Video, FileText, ArrowLeft, CheckCircle, Clock, XCircle, User, Hash, BookOpen, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ComplaintsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [showForm, setShowForm] = useState(true);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    complaint_details: '',
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
    await loadUserComplaints(user.student_id);
    setLoading(false);
  };

  const loadUserComplaints = async (studentId) => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('student_id', studentId)
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
    setFormData(prev => ({
      ...prev,
      complaint_details: e.target.value
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

    if (!formData.complaint_details.trim()) {
      alert('Please enter complaint details');
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
            student_id: currentUser.student_id,
            complaint_details: formData.complaint_details,
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
      await loadUserComplaints(currentUser.student_id);
      
      alert('Complaint submitted successfully!');
      
      // Reset form
      setFormData({
        complaint_details: '',
        photo: null,
        video: null
      });
      
      // Clear file inputs
      const photoInput = document.querySelector('input[name="photo"]');
      const videoInput = document.querySelector('input[name="video"]');
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
        return <CheckCircle size={16} className="text-green-500" />;
      case 'in_progress':
        return <Clock size={16} className="text-blue-500" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <Clock size={16} className="text-yellow-500" />;
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
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="bg-gradient-to-r from-red-500 to-orange-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
                <AlertTriangle className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Bus Complaints</h1>
                <p className="text-xs text-gray-500 -mt-1">Report issues with bus service</p>
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
        {/* Toggle Buttons */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setShowForm(true)}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
              showForm 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500'
            }`}
          >
            Submit New Complaint
          </button>
          <button
            onClick={() => setShowForm(false)}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
              !showForm 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500'
            }`}
          >
            My Complaints ({complaints.length})
          </button>
        </div>

        {showForm ? (
          /* Complaint Form */
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Submit a Complaint</h2>
            
            {/* Auto-filled User Information Display */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-3">Your Information (Auto-filled from Database)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center">
                  <User size={16} className="text-blue-600 mr-2" />
                  <span className="font-medium">Name:</span>
                  <span className="ml-2 text-gray-700">{currentUser.full_name}</span>
                </div>
                <div className="flex items-center">
                  <Hash size={16} className="text-blue-600 mr-2" />
                  <span className="font-medium">USN:</span>
                  <span className="ml-2 text-gray-700">{currentUser.usn}</span>
                </div>
                <div className="flex items-center">
                  <BookOpen size={16} className="text-blue-600 mr-2" />
                  <span className="font-medium">Branch:</span>
                  <span className="ml-2 text-gray-700">{currentUser.branch}</span>
                </div>
                <div className="flex items-center">
                  <Phone size={16} className="text-blue-600 mr-2" />
                  <span className="font-medium">Phone:</span>
                  <span className="ml-2 text-gray-700">{currentUser.phone || 'Not provided'}</span>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Complaint Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText size={16} className="inline mr-2" />
                  Complaint Details *
                </label>
                <textarea
                  name="complaint_details"
                  value={formData.complaint_details}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all resize-none"
                  placeholder="Describe your complaint in detail (e.g., bus delay, driver behavior, maintenance issues, route problems, etc.)"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Camera size={16} className="inline mr-2" />
                  Upload Photo (Optional)
                </label>
                <input
                  type="file"
                  name="photo"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Supported formats: JPG, PNG, JPEG (Max 5MB)</p>
              </div>

              {/* Video Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Video size={16} className="inline mr-2" />
                  Upload Video (Optional)
                </label>
                <input
                  type="file"
                  name="video"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Supported formats: MP4, MOV, AVI (Max 25MB)</p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !formData.complaint_details.trim()}
                className="w-full bg-gradient-to-r from-red-500 to-orange-600 text-white py-4 rounded-xl font-semibold hover:from-red-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
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
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">My Complaint History</h2>
            
            {complaints.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={48} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Complaints Yet</h3>
                <p className="text-gray-500">You haven't submitted any complaints yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {complaints.map((complaint) => (
                  <div key={complaint.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 mb-2">{complaint.complaint_details}</p>
                        <p className="text-sm text-gray-500">Submitted on {formatDate(complaint.created_at)}</p>
                      </div>
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                        {getStatusIcon(complaint.status)}
                        <span className="capitalize">{complaint.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                    
                    {/* Media preview if available */}
                    {(complaint.photo_url || complaint.video_url) && (
                      <div className="flex space-x-4 mt-3 pt-3 border-t border-gray-100">
                        {complaint.photo_url && (
                          <a 
                            href={complaint.photo_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <Camera size={16} />
                            <span>View Photo</span>
                          </a>
                        )}
                        {complaint.video_url && (
                          <a 
                            href={complaint.video_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-700"
                          >
                            <Video size={16} />
                            <span>View Video</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}