'use client';

import { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertTriangle, Megaphone, Bell, Users, Settings, Send, X, Plus, FileText, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [busLocations, setBusLocations] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [students, setStudents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notices, setNotices] = useState([]);
  const [buses, setBuses] = useState([]);

  // Form states
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: ''
  });
  const [newNotice, setNewNotice] = useState({
    title: '',
    description: '',
    pdf_url: ''
  });
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [showNoticeForm, setShowNoticeForm] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBusLocations(),
        fetchComplaints(),
        fetchStudents(),
        fetchAnnouncements(),
        fetchNotices(),
        fetchBuses()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error loading data from database');
    } finally {
      setLoading(false);
    }
  };

  // Fetch bus locations with bus details
  const fetchBusLocations = async () => {
    try {
      const { data: locations, error } = await supabase
        .from('bus_locations')
        .select(`
          *,
          buses (
            bus_number,
            route_name,
            driver_name,
            driver_number
          )
        `);

      if (error) throw error;

      const formattedData = locations?.map(location => ({
        id: location.id,
        bus_number: location.buses?.bus_number || 'N/A',
        route_name: location.buses?.route_name || 'No Route',
        driver_name: location.buses?.driver_name || 'Not Assigned',
        driver_number: location.buses?.driver_number || null,
        coordinates: location.latitude && location.longitude ? 
          { lat: location.latitude, lng: location.longitude } : null,
        speed: location.speed,
        current_location: 'Tracking...',
        last_updated: location.updated_at
      })) || [];

      setBusLocations(formattedData);
    } catch (error) {
      console.error('Error fetching bus locations:', error);
      setBusLocations([]);
    }
  };

  // Fetch complaints with student details
  const fetchComplaints = async () => {
    try {
      const { data: complaintsData, error } = await supabase
        .from('complaints')
        .select(`
          *,
          students (
            full_name,
            usn,
            branch
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = complaintsData?.map(complaint => ({
        id: complaint.id,
        student_id: complaint.student_id,
        student_name: complaint.students?.full_name || 'Unknown Student',
        usn: complaint.students?.usn || 'N/A',
        branch: complaint.students?.branch || 'Unknown Branch',
        complaint_details: complaint.complaint_details,
        status: complaint.status,
        created_at: complaint.created_at,
        photo_url: complaint.photo_url,
        video_url: complaint.video_url
      })) || [];

      setComplaints(formattedData);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setComplaints([]);
    }
  };

  // Fetch all students
  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('usn');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    }
  };

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
    }
  };

  // Fetch notices
  const fetchNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.error('Error fetching notices:', error);
      setNotices([]);
    }
  };

  // Fetch buses
  const fetchBuses = async () => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('*');

      if (error) throw error;
      setBuses(data || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
      setBuses([]);
    }
  };

  // Create new announcement
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert([
          {
            title: newAnnouncement.title,
            message: newAnnouncement.message
          }
        ])
        .select();

      if (error) throw error;

      alert('Announcement created successfully!');
      setNewAnnouncement({ title: '', message: '' });
      setShowAnnouncementForm(false);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('Error creating announcement: ' + error.message);
    }
  };

  // Create new notice
  const handleCreateNotice = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('notices')
        .insert([
          {
            title: newNotice.title,
            description: newNotice.description,
            pdf_url: newNotice.pdf_url || null
          }
        ])
        .select();

      if (error) throw error;

      alert('Notice created successfully!');
      setNewNotice({ title: '', description: '', pdf_url: '' });
      setShowNoticeForm(false);
      fetchNotices();
    } catch (error) {
      console.error('Error creating notice:', error);
      alert('Error creating notice: ' + error.message);
    }
  };

  // Update complaint status
  const updateComplaintStatus = async (complaintId, status) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status })
        .eq('id', complaintId);

      if (error) throw error;

      alert('Complaint status updated!');
      fetchComplaints();
    } catch (error) {
      console.error('Error updating complaint status:', error);
      alert('Error updating complaint status: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800 border border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'rejected': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
                <Settings className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-xs text-gray-500 -mt-1">SIT Bus System Management</p>
              </div>
            </div>
            
            <button 
              onClick={fetchAllData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh Data
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: Navigation },
              { id: 'buses', name: 'Bus Locations', icon: MapPin },
              { id: 'complaints', name: 'Complaints', icon: AlertTriangle },
              { id: 'announcements', name: 'Announcements', icon: Megaphone },
              { id: 'notices', name: 'Notices', icon: Bell },
              { id: 'students', name: 'Students', icon: Users }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={18} />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading data from database...</p>
          </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <MapPin className="text-blue-600" size={24} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Buses</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {busLocations.filter(bus => bus.coordinates).length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="bg-red-100 p-3 rounded-lg">
                      <AlertTriangle className="text-red-600" size={24} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Pending Complaints</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {complaints.filter(c => c.status === 'pending').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-3 rounded-lg">
                      <Users className="text-green-600" size={24} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Students</p>
                      <p className="text-2xl font-semibold text-gray-900">{students.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="bg-purple-100 p-3 rounded-lg">
                      <Bell className="text-purple-600" size={24} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Notices</p>
                      <p className="text-2xl font-semibold text-gray-900">{notices.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bus Locations Tab */}
            {activeTab === 'buses' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Live Bus Locations</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {busLocations.map((bus) => (
                      <div key={bus.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">Bus {bus.bus_number}</h3>
                            <p className="text-sm text-gray-600">{bus.route_name}</p>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs ${
                            bus.coordinates ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {bus.coordinates ? 'Live' : 'Offline'}
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Driver:</span>
                            <span className="font-medium">{bus.driver_name}</span>
                          </div>
                          {bus.coordinates ? (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Coordinates:</span>
                                <span className="font-mono text-xs">
                                  {bus.coordinates.lat.toFixed(6)}, {bus.coordinates.lng.toFixed(6)}
                                </span>
                              </div>
                              {bus.speed && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Speed:</span>
                                  <span className="font-medium">{bus.speed} km/h</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-center py-2 text-gray-500">
                              No location data available
                            </div>
                          )}
                          {bus.last_updated && (
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Last updated:</span>
                              <span>{formatDate(bus.last_updated)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {busLocations.length === 0 && (
                    <div className="text-center py-12">
                      <MapPin size={48} className="text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No bus location data available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Complaints Tab */}
            {activeTab === 'complaints' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Student Complaints</h2>
                </div>
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Complaint</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {complaints.map((complaint) => (
                          <tr key={complaint.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{complaint.student_name}</div>
                                <div className="text-sm text-gray-500">{complaint.usn} • {complaint.branch}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 max-w-md">{complaint.complaint_details}</div>
                              {(complaint.photo_url || complaint.video_url) && (
                                <div className="flex space-x-2 mt-1">
                                  {complaint.photo_url && (
                                    <span className="text-xs text-blue-600">📷 Photo</span>
                                  )}
                                  {complaint.video_url && (
                                    <span className="text-xs text-purple-600">🎥 Video</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(complaint.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(complaint.status)}`}>
                                {complaint.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                {complaint.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => updateComplaintStatus(complaint.id, 'in_progress')}
                                      className="text-blue-600 hover:text-blue-900"
                                    >
                                      Start Progress
                                    </button>
                                    <button
                                      onClick={() => updateComplaintStatus(complaint.id, 'rejected')}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                {complaint.status === 'in_progress' && (
                                  <button
                                    onClick={() => updateComplaintStatus(complaint.id, 'resolved')}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    Mark Resolved
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {complaints.length === 0 && (
                    <div className="text-center py-12">
                      <AlertTriangle size={48} className="text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No complaints found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Announcements Tab */}
            {activeTab === 'announcements' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Announcements</h2>
                    <button
                      onClick={() => setShowAnnouncementForm(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <Plus size={16} className="mr-2" />
                      New Announcement
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {announcements.map((announcement) => (
                        <div key={announcement.id} className="border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">{announcement.title}</h3>
                          <p className="text-gray-600 mb-2">{announcement.message}</p>
                          <p className="text-sm text-gray-500">Posted on {formatDate(announcement.created_at)}</p>
                        </div>
                      ))}
                    </div>
                    
                    {announcements.length === 0 && (
                      <div className="text-center py-12">
                        <Megaphone size={48} className="text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No announcements found</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Announcement Form Modal */}
                {showAnnouncementForm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Create Announcement</h3>
                        <button onClick={() => setShowAnnouncementForm(false)} className="text-gray-400 hover:text-gray-600">
                          <X size={20} />
                        </button>
                      </div>
                      <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                          <input
                            type="text"
                            required
                            value={newAnnouncement.title}
                            onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter announcement title"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                          <textarea
                            required
                            rows={4}
                            value={newAnnouncement.message}
                            onChange={(e) => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter announcement message"
                          />
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => setShowAnnouncementForm(false)}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Create Announcement
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notices Tab */}
            {activeTab === 'notices' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Notices</h2>
                    <button
                      onClick={() => setShowNoticeForm(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <Plus size={16} className="mr-2" />
                      New Notice
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {notices.map((notice) => (
                        <div key={notice.id} className="border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">{notice.title}</h3>
                          <p className="text-gray-600 mb-2">{notice.description}</p>
                          {notice.pdf_url && (
                            <a
                              href={notice.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-blue-600 hover:text-blue-800"
                            >
                              <FileText size={16} className="mr-1" />
                              View PDF
                            </a>
                          )}
                          <p className="text-sm text-gray-500 mt-2">Posted on {formatDate(notice.created_at)}</p>
                        </div>
                      ))}
                    </div>
                    
                    {notices.length === 0 && (
                      <div className="text-center py-12">
                        <Bell size={48} className="text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No notices found</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notice Form Modal */}
                {showNoticeForm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Create Notice</h3>
                        <button onClick={() => setShowNoticeForm(false)} className="text-gray-400 hover:text-gray-600">
                          <X size={20} />
                        </button>
                      </div>
                      <form onSubmit={handleCreateNotice} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                          <input
                            type="text"
                            required
                            value={newNotice.title}
                            onChange={(e) => setNewNotice(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter notice title"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                          <textarea
                            required
                            rows={4}
                            value={newNotice.description}
                            onChange={(e) => setNewNotice(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter notice description"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">PDF URL (Optional)</label>
                          <input
                            type="url"
                            value={newNotice.pdf_url}
                            onChange={(e) => setNewNotice(prev => ({ ...prev, pdf_url: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="https://example.com/notice.pdf"
                          />
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => setShowNoticeForm(false)}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Create Notice
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Students Tab */}
            {activeTab === 'students' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Student List ({students.length} students)</h2>
                </div>
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">USN</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fees Due</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {students.map((student) => (
                          <tr key={student.student_id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {student.usn}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {student.full_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.branch}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.class} {student.division}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.phone}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                student.fees_due ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {student.fees_due ? 'Due' : 'Paid'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {students.length === 0 && (
                    <div className="text-center py-12">
                      <Users size={48} className="text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No students found in database</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}