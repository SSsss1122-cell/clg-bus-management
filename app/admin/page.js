'use client';

import { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertTriangle, Megaphone, Bell, Users, Settings, Send, X, Plus, FileText, RefreshCw, Eye, Menu, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Data states
  const [busLocations, setBusLocations] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [students, setStudents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notices, setNotices] = useState([]);
  const [buses, setBuses] = useState([]);
  const [dailyComplaints, setDailyComplaints] = useState(0);

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
  const [mediaModal, setMediaModal] = useState({ open: false, url: '', type: '' });
  const [selectedBus, setSelectedBus] = useState(null);
  const [expandedComplaint, setExpandedComplaint] = useState(null);

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
            driver_number,
            capacity
          )
        `);

      if (error) throw error;

      const formattedData = locations?.map(location => ({
        id: location.id,
        bus_id: location.bus_id,
        bus_number: location.buses?.bus_number || 'N/A',
        route_name: location.buses?.route_name || 'No Route',
        driver_name: location.buses?.driver_name || 'Not Assigned',
        driver_number: location.buses?.driver_number || null,
        capacity: location.buses?.capacity || 0,
        coordinates: location.latitude && location.longitude ? 
          { lat: location.latitude, lng: location.longitude } : null,
        speed: location.speed,
        current_location: location.current_location || 'Tracking...',
        last_updated: location.updated_at
      })) || [];

      setBusLocations(formattedData);
    } catch (error) {
      console.error('Error fetching bus locations:', error);
      setBusLocations([]);
    }
  };

  // Fetch complaints with student details and calculate daily complaints
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

      // Calculate today's complaints
      const today = new Date().toDateString();
      const todaysComplaints = formattedData.filter(complaint => 
        new Date(complaint.created_at).toDateString() === today
      ).length;
      setDailyComplaints(todaysComplaints);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setComplaints([]);
      setDailyComplaints(0);
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

  // Update student fees status
  const updateFeesStatus = async (studentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ fees_due: newStatus })
        .eq('student_id', studentId);

      if (error) throw error;

      alert('Fees status updated!');
      fetchStudents();
    } catch (error) {
      console.error('Error updating fees status:', error);
      alert('Error updating fees status: ' + error.message);
    }
  };

  // Open media modal
  const openMediaModal = (url, type) => {
    setMediaModal({ open: true, url, type });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800 border border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'rejected': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    }
  };

  const getFeesStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border border-green-200';
      case 'half_paid': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'due': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
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

  // Function to open bus location in Google Maps
  const openInGoogleMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  // Mobile responsive complaint card
  const ComplaintCard = ({ complaint }) => {
    const isToday = new Date(complaint.created_at).toDateString() === new Date().toDateString();
    const isExpanded = expandedComplaint === complaint.id;

    return (
      <div className={`border border-gray-200 rounded-lg p-4 mb-4 ${isToday ? 'bg-yellow-50 border-yellow-200' : ''}`}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm">{complaint.student_name}</h3>
            <p className="text-xs text-gray-600">{complaint.usn} • {complaint.branch}</p>
            {isToday && (
              <span className="inline-block mt-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                Today
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(complaint.status)}`}>
              {complaint.status.replace('_', ' ')}
            </span>
            <button
              onClick={() => setExpandedComplaint(isExpanded ? null : complaint.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-2">
          <p className="line-clamp-2">{complaint.complaint_details}</p>
        </div>

        <div className="text-xs text-gray-500 mb-3">
          {formatDate(complaint.created_at)}
        </div>

        {(complaint.photo_url || complaint.video_url) && (
          <div className="flex space-x-2 mb-3">
            {complaint.photo_url && (
              <button
                onClick={() => openMediaModal(complaint.photo_url, 'image')}
                className="inline-flex items-center text-blue-600 hover:text-blue-800 text-xs"
              >
                <Eye size={12} className="mr-1" />
                View Photo
              </button>
            )}
            {complaint.video_url && (
              <button
                onClick={() => openMediaModal(complaint.video_url, 'video')}
                className="inline-flex items-center text-purple-600 hover:text-purple-800 text-xs"
              >
                <Eye size={12} className="mr-1" />
                View Video
              </button>
            )}
          </div>
        )}

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              {complaint.status === 'pending' && (
                <>
                  <button
                    onClick={() => updateComplaintStatus(complaint.id, 'in_progress')}
                    className="text-blue-600 hover:text-blue-900 text-xs bg-blue-50 px-3 py-1 rounded"
                  >
                    Start Progress
                  </button>
                  <button
                    onClick={() => updateComplaintStatus(complaint.id, 'rejected')}
                    className="text-red-600 hover:text-red-900 text-xs bg-red-50 px-3 py-1 rounded"
                  >
                    Reject
                  </button>
                </>
              )}
              {complaint.status === 'in_progress' && (
                <button
                  onClick={() => updateComplaintStatus(complaint.id, 'resolved')}
                  className="text-green-600 hover:text-green-900 text-xs bg-green-50 px-3 py-1 rounded"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
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
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-xs text-gray-500 -mt-1">SIT Bus System Management</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-bold text-gray-900">Admin</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button 
                onClick={fetchAllData}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center text-sm"
              >
                <RefreshCw size={16} className="mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              
              {/* Mobile Menu Button */}
              <button 
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden text-gray-700 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
              >
                {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Mobile Navigation Tabs */}
        {showMobileMenu && (
          <div className="lg:hidden mb-6 bg-white rounded-lg shadow border border-gray-200">
            <nav className="flex flex-col p-2">
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
                    onClick={() => {
                      setActiveTab(tab.id);
                      setShowMobileMenu(false);
                    }}
                    className={`flex items-center space-x-3 py-3 px-4 rounded-lg font-medium text-sm ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Desktop Navigation Tabs */}
        <div className="hidden lg:block bg-white border-b border-gray-200 mb-6">
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

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading data from database...</p>
          </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-2 sm:p-3 rounded-lg">
                      <MapPin className="text-blue-600" size={20} />
                    </div>
                    <div className="ml-3 sm:ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Buses</p>
                      <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                        {busLocations.filter(bus => bus.coordinates).length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="bg-red-100 p-2 sm:p-3 rounded-lg">
                      <AlertTriangle className="text-red-600" size={20} />
                    </div>
                    <div className="ml-3 sm:ml-4">
                      <p className="text-sm font-medium text-gray-600">Today's Complaints</p>
                      <p className="text-xl sm:text-2xl font-semibold text-gray-900">{dailyComplaints}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Total: {complaints.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-2 sm:p-3 rounded-lg">
                      <Users className="text-green-600" size={20} />
                    </div>
                    <div className="ml-3 sm:ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Students</p>
                      <p className="text-xl sm:text-2xl font-semibold text-gray-900">{students.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="bg-purple-100 p-2 sm:p-3 rounded-lg">
                      <Bell className="text-purple-600" size={20} />
                    </div>
                    <div className="ml-3 sm:ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Notices</p>
                      <p className="text-xl sm:text-2xl font-semibold text-gray-900">{notices.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bus Locations Tab */}
            {activeTab === 'buses' && (
              <div className="space-y-6">
                {/* Map View */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Bus Locations Map</h2>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="bg-gray-100 rounded-lg h-64 sm:h-96 relative overflow-hidden">
                      {/* Simple Map Representation */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50">
                        {/* Map background with roads */}
                        <div className="absolute inset-0 opacity-20">
                          {/* Horizontal roads */}
                          <div className="absolute top-1/4 w-full h-1 bg-gray-400"></div>
                          <div className="absolute top-1/2 w-full h-1 bg-gray-400"></div>
                          <div className="absolute top-3/4 w-full h-1 bg-gray-400"></div>
                          {/* Vertical roads */}
                          <div className="absolute left-1/4 h-full w-1 bg-gray-400"></div>
                          <div className="absolute left-1/2 h-full w-1 bg-gray-400"></div>
                          <div className="absolute left-3/4 h-full w-1 bg-gray-400"></div>
                        </div>
                        
                        {/* Bus markers */}
                        {busLocations.filter(bus => bus.coordinates).map((bus, index) => {
                          const positions = [
                            { top: '30%', left: '40%' },
                            { top: '60%', left: '70%' },
                            { top: '45%', left: '25%' },
                            { top: '75%', left: '50%' }
                          ];
                          const position = positions[index % positions.length];
                          
                          return (
                            <div
                              key={bus.id}
                              className={`absolute w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white shadow-lg cursor-pointer transform -translate-x-1/2 -translate-y-1/2 ${
                                selectedBus?.id === bus.id ? 'bg-red-500 scale-125' : 'bg-blue-500'
                              }`}
                              style={position}
                              onClick={() => setSelectedBus(bus)}
                            >
                              <div className="text-white text-xs font-bold flex items-center justify-center h-full">
                                {bus.bus_number}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {busLocations.filter(bus => bus.coordinates).length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <MapPin size={32} className="text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">No active buses with location data</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {selectedBus && (
                      <div className="mt-4 p-3 sm:p-4 bg-blue-50 rounded-lg">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Bus {selectedBus.bus_number}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">{selectedBus.route_name}</p>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                          <div>
                            <span className="text-gray-600">Driver:</span>
                            <span className="ml-2 font-medium">{selectedBus.driver_name}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Location:</span>
                            <span className="ml-2 font-medium">{selectedBus.current_location}</span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-gray-600">Coordinates:</span>
                            <span className="ml-2 font-mono text-xs">
                              {selectedBus.coordinates.lat.toFixed(6)}, {selectedBus.coordinates.lng.toFixed(6)}
                            </span>
                          </div>
                          {selectedBus.speed && (
                            <div>
                              <span className="text-gray-600">Speed:</span>
                              <span className="ml-2 font-medium">{selectedBus.speed} km/h</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => openInGoogleMaps(selectedBus.coordinates.lat, selectedBus.coordinates.lng)}
                          className="mt-3 bg-blue-600 text-white px-3 py-1 rounded text-xs sm:text-sm hover:bg-blue-700"
                        >
                          Open in Google Maps
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bus List */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">All Buses</h2>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {busLocations.map((bus) => (
                        <div 
                          key={bus.id} 
                          className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
                            selectedBus?.id === bus.id 
                              ? 'border-blue-500 bg-blue-50 shadow-md' 
                              : 'border-gray-200 bg-white hover:shadow-sm'
                          }`}
                          onClick={() => setSelectedBus(bus)}
                        >
                          <div className="flex justify-between items-start mb-2 sm:mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Bus {bus.bus_number}</h3>
                              <p className="text-xs sm:text-sm text-gray-600">{bus.route_name}</p>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs ${
                              bus.coordinates ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {bus.coordinates ? 'Live' : 'Offline'}
                            </div>
                          </div>
                          
                          <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Driver:</span>
                              <span className="font-medium text-gray-900 text-right">{bus.driver_name}</span>
                            </div>
                            {bus.coordinates ? (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Location:</span>
                                  <span className="font-medium text-gray-900 text-right">{bus.current_location}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Speed:</span>
                                  <span className="font-medium text-gray-900">{bus.speed || '0'} km/h</span>
                                </div>
                              </>
                            ) : (
                              <div className="text-center py-2 text-gray-500 text-xs">
                                No location data available
                              </div>
                            )}
                            {bus.last_updated && (
                              <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
                                <span>Last updated:</span>
                                <span>{formatDate(bus.last_updated)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {busLocations.length === 0 && (
                      <div className="text-center py-8 sm:py-12">
                        <MapPin size={32} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No bus location data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Complaints Tab */}
            {activeTab === 'complaints' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">Student Complaints</h2>
                    <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                      Today's Complaints: {dailyComplaints}
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  {/* Mobile View - Cards */}
                  <div className="lg:hidden">
                    {complaints.map((complaint) => (
                      <ComplaintCard key={complaint.id} complaint={complaint} />
                    ))}
                  </div>

                  {/* Desktop View - Table */}
                  <div className="hidden lg:block overflow-x-auto">
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
                        {complaints.map((complaint) => {
                          const isToday = new Date(complaint.created_at).toDateString() === new Date().toDateString();
                          
                          return (
                            <tr key={complaint.id} className={isToday ? 'bg-yellow-50' : ''}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{complaint.student_name}</div>
                                  <div className="text-sm text-gray-500">{complaint.usn} • {complaint.branch}</div>
                                  {isToday && (
                                    <span className="inline-block mt-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                      Today
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 max-w-md">{complaint.complaint_details}</div>
                                {(complaint.photo_url || complaint.video_url) && (
                                  <div className="flex space-x-2 mt-2">
                                    {complaint.photo_url && (
                                      <button
                                        onClick={() => openMediaModal(complaint.photo_url, 'image')}
                                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-xs"
                                      >
                                        <Eye size={14} className="mr-1" />
                                        View Photo
                                      </button>
                                    )}
                                    {complaint.video_url && (
                                      <button
                                        onClick={() => openMediaModal(complaint.video_url, 'video')}
                                        className="inline-flex items-center text-purple-600 hover:text-purple-800 text-xs"
                                      >
                                        <Eye size={14} className="mr-1" />
                                        View Video
                                      </button>
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {complaints.length === 0 && (
                    <div className="text-center py-8 sm:py-12">
                      <AlertTriangle size={32} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No complaints found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Announcements Tab */}
            {activeTab === 'announcements' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">Announcements</h2>
                    <button
                      onClick={() => setShowAnnouncementForm(true)}
                      className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm w-full sm:w-auto justify-center"
                    >
                      <Plus size={16} className="mr-2" />
                      New Announcement
                    </button>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="space-y-4">
                      {announcements.map((announcement) => (
                        <div key={announcement.id} className="border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-2">{announcement.title}</h3>
                          <p className="text-gray-600 text-sm sm:text-base mb-2">{announcement.message}</p>
                          <p className="text-xs text-gray-500">Posted on {formatDate(announcement.created_at)}</p>
                        </div>
                      ))}
                    </div>
                    
                    {announcements.length === 0 && (
                      <div className="text-center py-8 sm:py-12">
                        <Megaphone size={32} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No announcements found</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Announcement Form Modal */}
                {showAnnouncementForm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="Enter announcement message"
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                          <button
                            type="button"
                            onClick={() => setShowAnnouncementForm(false)}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
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
                  <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">Notices</h2>
                    <button
                      onClick={() => setShowNoticeForm(true)}
                      className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm w-full sm:w-auto justify-center"
                    >
                      <Plus size={16} className="mr-2" />
                      New Notice
                    </button>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="space-y-4">
                      {notices.map((notice) => (
                        <div key={notice.id} className="border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-2">{notice.title}</h3>
                          <p className="text-gray-600 text-sm sm:text-base mb-2">{notice.description}</p>
                          {notice.pdf_url && (
                            <a
                              href={notice.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                            >
                              <FileText size={14} className="mr-1" />
                              View PDF
                            </a>
                          )}
                          <p className="text-xs text-gray-500 mt-2">Posted on {formatDate(notice.created_at)}</p>
                        </div>
                      ))}
                    </div>
                    
                    {notices.length === 0 && (
                      <div className="text-center py-8 sm:py-12">
                        <Bell size={32} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No notices found</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notice Form Modal */}
                {showNoticeForm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="Enter notice description"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">PDF URL (Optional)</label>
                          <input
                            type="url"
                            value={newNotice.pdf_url}
                            onChange={(e) => setNewNotice(prev => ({ ...prev, pdf_url: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="https://example.com/notice.pdf"
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                          <button
                            type="button"
                            onClick={() => setShowNoticeForm(false)}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
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
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Student List ({students.length} students)</h2>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">USN</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                          <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                          <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fees Due</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {students.map((student) => (
                          <tr key={student.student_id}>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                              {student.usn}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                              {student.full_name}
                            </td>
                            <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                              {student.branch}
                            </td>
                            <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                              {student.class} {student.division}
                            </td>
                            <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                              {student.phone}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <select
                                value={student.fees_due || 'due'}
                                onChange={(e) => updateFeesStatus(student.student_id, e.target.value)}
                                className={`text-xs font-semibold rounded-full px-2 sm:px-3 py-1 border ${getFeesStatusColor(student.fees_due)}`}
                              >
                                <option value="paid">Paid</option>
                                <option value="half_paid">Half Paid</option>
                                <option value="due">Due</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {students.length === 0 && (
                    <div className="text-center py-8 sm:py-12">
                      <Users size={32} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No students found in database</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Media Modal */}
      {mediaModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">
                {mediaModal.type === 'image' ? 'Complaint Photo' : 'Complaint Video'}
              </h3>
              <button 
                onClick={() => setMediaModal({ open: false, url: '', type: '' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[70vh] overflow-auto">
              {mediaModal.type === 'image' ? (
                <img 
                  src={mediaModal.url} 
                  alt="Complaint evidence" 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <video 
                  src={mediaModal.url} 
                  controls 
                  className="max-w-full max-h-full"
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}