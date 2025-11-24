'use client';

import { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertTriangle, Megaphone, Bell, Users, Settings, Send, X, Plus, FileText, RefreshCw, Eye, Menu, ChevronDown, ChevronUp, Check, User, MessageCircle } from 'lucide-react';
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
  const [communityMessages, setCommunityMessages] = useState([]);
  const [newCommunityMessage, setNewCommunityMessage] = useState('');

  // Form states
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: ''
  });
  const [newNotice, setNewNotice] = useState({
    title: '',
    description: '',
    pdf_url: '',
    selectedStudents: []
  });
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [mediaModal, setMediaModal] = useState({ open: false, url: '', type: '' });
  const [selectedBus, setSelectedBus] = useState(null);
  const [expandedComplaint, setExpandedComplaint] = useState(null);

  // Real-time bus location tracking - SAME LOGIC AS STUDENT PAGE
  useEffect(() => {
    fetchAllData();
    
    // Set up real-time updates for bus locations
    const busLocationSubscription = supabase
      .channel('bus-locations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bus_locations'
        },
        (payload) => {
          console.log('Bus location update received:', payload);
          fetchBusLocations();
        }
      )
      .subscribe();

    // Set up real-time updates for community messages
    const communitySubscription = supabase
      .channel('community-messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_messages'
        },
        (payload) => {
          console.log('Community message update received:', payload);
          fetchCommunityMessages();
        }
      )
      .subscribe();

    // Set interval to refresh bus locations every 5 seconds - SAME AS STUDENT PAGE
    const intervalId = setInterval(() => {
      fetchBusLocations();
    }, 5000);

    return () => {
      busLocationSubscription.unsubscribe();
      communitySubscription.unsubscribe();
      clearInterval(intervalId);
    };
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
        fetchBuses(),
        fetchCommunityMessages()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error loading data from database');
    } finally {
      setLoading(false);
    }
  };

  // CORRECTED: Fetch bus locations with same logic as student page
  const fetchBusLocations = async () => {
    try {
      console.log('Fetching bus locations...');
      
      // First, get all buses
      const { data: allBuses, error: busesError } = await supabase
        .from('buses')
        .select('*');

      if (busesError) throw busesError;

      // Then get latest locations for each bus - SAME LOGIC AS STUDENT PAGE
      const busLocationsWithData = await Promise.all(
        allBuses.map(async (bus) => {
          const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
          
          const { data: location, error } = await supabase
            .from('bus_locations')
            .select('*')
            .eq('bus_id', bus.id)
            .gte('updated_at', tenSecondsAgo)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Check if location data is recent (within 10 seconds) - SAME AS STUDENT PAGE
          const isLocationRecent = location && (new Date() - new Date(location.updated_at)) < 10000;

          return {
            id: bus.id,
            bus_id: bus.id,
            bus_number: bus.bus_number || 'N/A',
            route_name: bus.route_name || 'No Route',
            driver_name: bus.driver_name || 'Not Assigned',
            driver_number: bus.driver_number || null,
            capacity: bus.capacity || 0,
            coordinates: location?.latitude && location?.longitude ? 
              { 
                lat: location.latitude, 
                lng: location.longitude 
              } : null,
            speed: location?.speed || 0,
            current_location: location?.current_location || 'Not Available',
            last_updated: location?.updated_at || null,
            is_active: isLocationRecent, // SAME LIVE STATUS LOGIC
            is_live: isLocationRecent // For consistency with student page
          };
        })
      );

      console.log('Formatted bus locations:', busLocationsWithData);
      setBusLocations(busLocationsWithData);
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

  // Fetch community messages
  const fetchCommunityMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('community_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCommunityMessages(data || []);
    } catch (error) {
      console.error('Error fetching community messages:', error);
      setCommunityMessages([]);
    }
  };

  // Send community message
  const sendCommunityMessage = async (e) => {
    e.preventDefault();
    if (!newCommunityMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('community_messages')
        .insert([
          {
            username: 'Admin',
            message: newCommunityMessage.trim()
          }
        ]);

      if (error) throw error;

      setNewCommunityMessage('');
      fetchCommunityMessages();
    } catch (error) {
      console.error('Error sending community message:', error);
      alert('Error sending message: ' + error.message);
    }
  };

  // Delete community message
  const deleteCommunityMessage = async (messageId) => {
    try {
      const { error } = await supabase
        .from('community_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      alert('Message deleted successfully!');
      fetchCommunityMessages();
    } catch (error) {
      console.error('Error deleting community message:', error);
      alert('Error deleting message: ' + error.message);
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
      setNewNotice({ title: '', description: '', pdf_url: '', selectedStudents: [] });
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

  // Get Google Maps embed URL for iframe
  const getGoogleMapsUrl = (coordinates) => {
    if (!coordinates || !coordinates.lat || !coordinates.lng) {
      // Default to SIT location if no coordinates
      return "https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=17.3616,78.4747&zoom=15&maptype=roadmap";
    }
    
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${coordinates.lat},${coordinates.lng}&zoom=16&maptype=roadmap`;
  };

  // Calculate dashboard statistics
  const activeBuses = busLocations.filter(bus => bus.is_active).length;
  const totalBuses = busLocations.length;
  const totalStudents = students.length;
  const totalNotices = notices.length;
  const totalCommunityMessages = communityMessages.length;

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
              <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
                <img 
                  src="/images/logo.png" 
                  alt="SIT Bus System Logo" 
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden text-white items-center justify-center">
                  <Settings size={20} />
                </div>
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
                { id: 'students', name: 'Students', icon: Users },
                { id: 'community', name: 'Community', icon: MessageCircle }
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
                { id: 'students', name: 'Students', icon: Users },
                { id: 'community', name: 'Community', icon: MessageCircle }
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
              <div className="space-y-6">
                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-2 sm:p-3 rounded-lg">
                        <MapPin className="text-blue-600" size={20} />
                      </div>
                      <div className="ml-3 sm:ml-4">
                        <p className="text-sm font-medium text-gray-600">Active Buses</p>
                        <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                          {activeBuses}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Total: {totalBuses}
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
                        <p className="text-xl sm:text-2xl font-semibold text-gray-900">{totalStudents}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Registered Students
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-2 sm:p-3 rounded-lg">
                        <MessageCircle className="text-purple-600" size={20} />
                      </div>
                      <div className="ml-3 sm:ml-4">
                        <p className="text-sm font-medium text-gray-600">Community Messages</p>
                        <p className="text-xl sm:text-2xl font-semibold text-gray-900">{totalCommunityMessages}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Total Messages
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Overview Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Complaints */}
                  <div className="bg-white rounded-lg shadow">
                    <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Recent Complaints</h2>
                    </div>
                    <div className="p-4">
                      {complaints.slice(0, 5).map((complaint) => (
                        <div key={complaint.id} className="border-b border-gray-200 last:border-b-0 py-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{complaint.student_name}</p>
                              <p className="text-xs text-gray-500 truncate">{complaint.complaint_details}</p>
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(complaint.status)}`}>
                              {complaint.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                      {complaints.length === 0 && (
                        <p className="text-gray-500 text-sm text-center py-4">No complaints found</p>
                      )}
                    </div>
                  </div>

                  {/* Active Buses Status */}
                  <div className="bg-white rounded-lg shadow">
                    <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Bus Status</h2>
                    </div>
                    <div className="p-4">
                      {busLocations.slice(0, 5).map((bus) => (
                        <div key={bus.id} className="border-b border-gray-200 last:border-b-0 py-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium text-gray-900">Bus {bus.bus_number}</p>
                              <p className="text-xs text-gray-500">{bus.route_name}</p>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs ${
                              bus.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {bus.is_active ? 'Active' : 'Offline'}
                            </div>
                          </div>
                        </div>
                      ))}
                      {busLocations.length === 0 && (
                        <p className="text-gray-500 text-sm text-center py-4">No buses found</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bus Locations Tab - FIXED WITH PROPER COLORS */}
            {activeTab === 'buses' && (
              <div className="space-y-6">
                {/* Real Google Maps View */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">Live Bus Locations</h2>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                          <span className="text-gray-700">Active ({activeBuses})</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-gray-400 rounded-full mr-1"></div>
                          <span className="text-gray-700">Offline ({totalBuses - activeBuses})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6">
                    {/* Google Maps Iframe */}
                    <div className="rounded-xl overflow-hidden border-2 border-gray-300 h-96 sm:h-[500px]">
                      <iframe
                        className="w-full h-full"
                        frameBorder="0"
                        style={{ border: 0 }}
                        allowFullScreen
                        src={getGoogleMapsUrl(
                          selectedBus?.coordinates || 
                          (busLocations.find(bus => bus.is_active)?.coordinates)
                        )}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      ></iframe>
                    </div>
                    
                    {/* Bus Information Panel - FIXED COLORS */}
                    {selectedBus && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="font-semibold text-gray-900 text-lg">Bus {selectedBus.bus_number}</h3>
                        <p className="text-gray-600 text-sm mb-3">{selectedBus.route_name}</p>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 font-medium">Driver:</span>
                            <span className="text-gray-900 font-semibold">{selectedBus.driver_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 font-medium">Status:</span>
                            <span className={`font-semibold ${selectedBus.is_active ? 'text-green-600' : 'text-gray-600'}`}>
                              {selectedBus.is_active ? 'Active' : 'Offline'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 font-medium">Location:</span>
                            <span className="text-gray-900 font-semibold text-right">{selectedBus.current_location}</span>
                          </div>
                          {selectedBus.coordinates && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 font-medium">Coordinates:</span>
                              <span className="text-gray-900 font-mono text-xs">
                                {selectedBus.coordinates.lat.toFixed(6)}, {selectedBus.coordinates.lng.toFixed(6)}
                              </span>
                            </div>
                          )}
                          {selectedBus.speed > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 font-medium">Speed:</span>
                              <span className="text-gray-900 font-semibold">{selectedBus.speed} km/h</span>
                            </div>
                          )}
                        </div>
                        {selectedBus.coordinates && (
                          <button
                            onClick={() => openInGoogleMaps(selectedBus.coordinates.lat, selectedBus.coordinates.lng)}
                            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                          >
                            Open in Google Maps
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bus List - FIXED COLORS */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">All Buses ({totalBuses})</h2>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {busLocations.map((bus) => (
                        <div 
                          key={bus.id} 
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedBus?.id === bus.id 
                              ? 'border-blue-500 bg-blue-50 shadow-md' 
                              : 'border-gray-200 bg-white hover:shadow-sm'
                          } ${!bus.is_active ? 'opacity-60' : ''}`}
                          onClick={() => setSelectedBus(bus)}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900 text-lg">Bus {bus.bus_number}</h3>
                              <p className="text-gray-600 text-sm">{bus.route_name}</p>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              bus.is_active ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-800 border border-gray-200'
                            }`}>
                              {bus.is_active ? 'Live' : 'Offline'}
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Driver:</span>
                              <span className="text-gray-900 font-medium">{bus.driver_name}</span>
                            </div>
                            {bus.is_active ? (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Location:</span>
                                  <span className="text-gray-900 font-medium text-right">{bus.current_location}</span>
                                </div>
                                {bus.speed > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Speed:</span>
                                    <span className="text-gray-900 font-medium">{bus.speed} km/h</span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-center py-2 text-gray-500 text-sm">
                                No active location data
                              </div>
                            )}
                            {bus.last_updated && (
                              <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
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
                        <MapPin size={32} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">No bus location data available</p>
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
                    <div className="text-center py-12">
                      <AlertTriangle size={32} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No complaints found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Announcements Tab - FIXED INPUT COLORS */}
            {activeTab === 'announcements' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">Announcements ({announcements.length})</h2>
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
                        <div key={announcement.id} className="border border-gray-200 rounded-lg p-4 bg-white">
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

                {/* Announcement Form Modal - FIXED INPUT COLORS */}
                {showAnnouncementForm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Create Announcement</h3>
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 placeholder-gray-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 placeholder-gray-500"
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

            {/* Notices Tab - FIXED INPUT COLORS */}
            {activeTab === 'notices' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">Notices ({notices.length})</h2>
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
                        <div key={notice.id} className="border border-gray-200 rounded-lg p-4 bg-white">
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

                {/* Notice Form Modal - FIXED INPUT COLORS */}
                {showNoticeForm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Create Notice</h3>
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 placeholder-gray-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 placeholder-gray-500"
                            placeholder="Enter notice description"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">PDF URL (Optional)</label>
                          <input
                            type="url"
                            value={newNotice.pdf_url}
                            onChange={(e) => setNewNotice(prev => ({ ...prev, pdf_url: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 placeholder-gray-500"
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

            {/* Community Tab - FIXED INPUT COLORS */}
            {activeTab === 'community' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Community Messages ({communityMessages.length})</h2>
                </div>
                <div className="p-4 sm:p-6">
                  {/* Message Input - FIXED COLORS */}
                  <form onSubmit={sendCommunityMessage} className="mb-6">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newCommunityMessage}
                        onChange={(e) => setNewCommunityMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 placeholder-gray-500"
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm"
                      >
                        <Send size={16} className="mr-2" />
                        Send
                      </button>
                    </div>
                  </form>

                  {/* Messages List */}
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {communityMessages.map((message) => (
                      <div key={message.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900 text-sm">{message.username}</span>
                            {message.username === 'Admin' && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">{formatDate(message.created_at)}</span>
                            <button
                              onClick={() => deleteCommunityMessage(message.id)}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-700 text-sm">{message.message}</p>
                      </div>
                    ))}
                  </div>
                  
                  {communityMessages.length === 0 && (
                    <div className="text-center py-8 sm:py-12">
                      <MessageCircle size={32} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No community messages yet</p>
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
              <h3 className="text-lg font-semibold text-gray-900">
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