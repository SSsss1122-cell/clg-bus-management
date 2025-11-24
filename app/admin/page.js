'use client';

import { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertTriangle, Megaphone, Bell, Users, Settings, Send, X, Plus, FileText, RefreshCw, Eye, Menu, ChevronDown, ChevronUp, Check, User, MessageCircle, Trash2, Database, Filter, Calendar, Clock } from 'lucide-react';
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
  selectedStudents: [] // This will store selected student IDs
});
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [mediaModal, setMediaModal] = useState({ open: false, url: '', type: '' });
  const [selectedBus, setSelectedBus] = useState(null);
  const [expandedComplaint, setExpandedComplaint] = useState(null);

  // Developer Settings States
  const [showDeveloperSettings, setShowDeveloperSettings] = useState(false);
  const [busLocationData, setBusLocationData] = useState([]);
  const [deleteFilter, setDeleteFilter] = useState({
    bus_id: '',
    start_date: '',
    end_date: '',
    older_than_days: ''
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteResult, setDeleteResult] = useState({ success: null, message: '' });

  // Real-time bus location tracking
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

    // Set interval to refresh bus locations every 5 seconds
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

  // Fetch bus locations
  const fetchBusLocations = async () => {
    try {
      console.log('Fetching bus locations...');
      
      // First, get all buses
      const { data: allBuses, error: busesError } = await supabase
        .from('buses')
        .select('*');

      if (busesError) throw busesError;

      // Then get latest locations for each bus
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

          // Check if location data is recent (within 10 seconds)
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
            is_active: isLocationRecent,
            is_live: isLocationRecent
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

  // Fetch all bus location data for developer settings
  const fetchBusLocationData = async () => {
    try {
      const { data, error } = await supabase
        .from('bus_locations')
        .select(`
          *,
          buses (
            bus_number,
            route_name
          )
        `)
        .order('updated_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const formattedData = data?.map(record => ({
        id: record.id,
        bus_id: record.bus_id,
        bus_number: record.buses?.bus_number || 'N/A',
        route_name: record.buses?.route_name || 'No Route',
        latitude: record.latitude,
        longitude: record.longitude,
        speed: record.speed,
        current_location: record.current_location,
        updated_at: record.updated_at,
        created_at: record.created_at
      })) || [];

      setBusLocationData(formattedData);
    } catch (error) {
      console.error('Error fetching bus location data:', error);
      setBusLocationData([]);
    }
  };

  // Delete bus locations with filters
  const deleteBusLocations = async () => {
    setDeleteLoading(true);
    setDeleteResult({ success: null, message: '' });

    try {
      let query = supabase.from('bus_locations').delete();

      // Apply filters
      if (deleteFilter.bus_id) {
        query = query.eq('bus_id', deleteFilter.bus_id);
      }

      if (deleteFilter.start_date) {
        query = query.gte('updated_at', deleteFilter.start_date);
      }

      if (deleteFilter.end_date) {
        const endDate = new Date(deleteFilter.end_date);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('updated_at', endDate.toISOString());
      }

      if (deleteFilter.older_than_days) {
        const olderThanDate = new Date();
        olderThanDate.setDate(olderThanDate.getDate() - parseInt(deleteFilter.older_than_days));
        query = query.lt('updated_at', olderThanDate.toISOString());
      }

      const { error, count } = await query;

      if (error) throw error;

      setDeleteResult({
        success: true,
        message: `Successfully deleted ${count || 'all matching'} bus location records.`
      });

      // Refresh data
      fetchBusLocationData();
      fetchBusLocations();

      // Reset filters
      setDeleteFilter({
        bus_id: '',
        start_date: '',
        end_date: '',
        older_than_days: ''
      });

    } catch (error) {
      console.error('Error deleting bus locations:', error);
      setDeleteResult({
        success: false,
        message: `Error deleting records: ${error.message}`
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Add function to toggle student selection
const toggleStudentSelection = (studentId) => {
  setNewNotice(prev => {
    const isSelected = prev.selectedStudents.includes(studentId);
    if (isSelected) {
      return {
        ...prev,
        selectedStudents: prev.selectedStudents.filter(id => id !== studentId)
      };
    } else {
      return {
        ...prev,
        selectedStudents: [...prev.selectedStudents, studentId]
      };
    }
  });
};

// Add function to select all students
const selectAllStudents = () => {
  const allStudentIds = students.map(student => student.student_id);
  setNewNotice(prev => ({
    ...prev,
    selectedStudents: allStudentIds
  }));
};

// Add function to clear all selections
const clearAllSelections = () => {
  setNewNotice(prev => ({
    ...prev,
    selectedStudents: []
  }));
};

  // Delete all bus locations (with confirmation)
  const deleteAllBusLocations = async () => {
    if (!confirm('⚠️ DANGER: This will delete ALL bus location records. This action cannot be undone. Are you sure?')) {
      return;
    }

    setDeleteLoading(true);
    setDeleteResult({ success: null, message: '' });

    try {
      const { error, count } = await supabase
        .from('bus_locations')
        .delete()
        .neq('id', 0);

      if (error) throw error;

      setDeleteResult({
        success: true,
        message: `Successfully deleted all bus location records.`
      });

      // Refresh data
      fetchBusLocationData();
      fetchBusLocations();

    } catch (error) {
      console.error('Error deleting all bus locations:', error);
      setDeleteResult({
        success: false,
        message: `Error deleting all records: ${error.message}`
      });
    } finally {
      setDeleteLoading(false);
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
  // Fetch notices with student targeting information
const fetchNotices = async () => {
  try {
    // First, fetch all notices
    const { data: noticesData, error: noticesError } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false });

    if (noticesError) throw noticesError;

    // For each notice, fetch the targeted students count
    const noticesWithTargeting = await Promise.all(
      (noticesData || []).map(async (notice) => {
        const { data: noticeStudents, error } = await supabase
          .from('notice_students')
          .select('student_id')
          .eq('notice_id', notice.id);

        return {
          ...notice,
          targeted_students_count: noticeStudents?.length || 0,
          has_targeted_students: (noticeStudents?.length || 0) > 0
        };
      })
    );

    setNotices(noticesWithTargeting);
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
  // Create new notice
// Create new notice with student targeting
const handleCreateNotice = async (e) => {
  e.preventDefault();
  try {
    // First, create the notice
    const { data: noticeData, error: noticeError } = await supabase
      .from('notices')
      .insert([
        {
          title: newNotice.title,
          description: newNotice.description,
          pdf_url: newNotice.pdf_url || null,
        }
      ])
      .select();

    if (noticeError) throw noticeError;

    const noticeId = noticeData[0].id;

    // If specific students are selected, create entries in notice_students table
    if (newNotice.selectedStudents.length > 0) {
      const noticeStudentsData = newNotice.selectedStudents.map(studentId => ({
        notice_id: noticeId,
        student_id: studentId
      }));

      const { error: noticeStudentsError } = await supabase
        .from('notice_students')
        .insert(noticeStudentsData);

      if (noticeStudentsError) throw noticeStudentsError;
    }

    alert('Notice created successfully!');
    setNewNotice({ title: '', description: '', pdf_url: '', selectedStudents: [] });
    setShowNoticeForm(false);
    fetchNotices();
  } catch (error) {
    console.error('Error creating notice:', error);
    alert('Error creating notice: ' + error.message);
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
              
              {/* Developer Settings Button */}
              <button 
                onClick={() => {
                  setShowDeveloperSettings(!showDeveloperSettings);
                  if (!showDeveloperSettings) {
                    fetchBusLocationData();
                  }
                }}
                className="bg-purple-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-sm flex items-center text-sm"
              >
                <Database size={16} className="mr-2" />
                <span className="hidden sm:inline">Developer</span>
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
        {/* Developer Settings Panel */}
        {showDeveloperSettings && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-yellow-800 flex items-center">
                <Database size={20} className="mr-2" />
                Developer Settings - Bus Locations Management
              </h2>
              <button
                onClick={() => setShowDeveloperSettings(false)}
                className="text-yellow-600 hover:text-yellow-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Delete Filters */}
            <div className="bg-white rounded-lg p-4 mb-4 border border-yellow-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Filter size={16} className="mr-2" />
                Delete Bus Locations with Filters
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bus ID</label>
                  <input
                    type="text"
                    value={deleteFilter.bus_id}
                    onChange={(e) => setDeleteFilter(prev => ({ ...prev, bus_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Filter by bus ID"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={deleteFilter.start_date}
                    onChange={(e) => setDeleteFilter(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={deleteFilter.end_date}
                    onChange={(e) => setDeleteFilter(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Older Than (Days)</label>
                  <input
                    type="number"
                    value={deleteFilter.older_than_days}
                    onChange={(e) => setDeleteFilter(prev => ({ ...prev, older_than_days: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="e.g., 30"
                    min="1"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={deleteBusLocations}
                  disabled={deleteLoading}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center text-sm disabled:opacity-50"
                >
                  <Trash2 size={16} className="mr-2" />
                  {deleteLoading ? 'Deleting...' : 'Delete Filtered Records'}
                </button>
                
                <button
                  onClick={deleteAllBusLocations}
                  disabled={deleteLoading}
                  className="bg-red-800 text-white px-4 py-2 rounded-lg hover:bg-red-900 transition-colors flex items-center text-sm disabled:opacity-50"
                >
                  <Trash2 size={16} className="mr-2" />
                  {deleteLoading ? 'Deleting...' : 'Delete ALL Records'}
                </button>
                
                <button
                  onClick={fetchBusLocationData}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm"
                >
                  <RefreshCw size={16} className="mr-2" />
                  Refresh Data
                </button>
              </div>

              {deleteResult.message && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${
                  deleteResult.success ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {deleteResult.message}
                </div>
              )}
            </div>

            {/* Data Preview */}
            <div className="bg-white rounded-lg p-4 border border-yellow-200">
              <h3 className="font-semibold text-gray-900 mb-3">
                Bus Location Data ({busLocationData.length} records)
              </h3>
              
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">ID</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Bus</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Location</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Speed</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {busLocationData.slice(0, 50).map((record) => (
                      <tr key={record.id}>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-900 font-mono">{record.id}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="text-gray-900 font-medium">Bus {record.bus_number}</div>
                          <div className="text-gray-500 text-xs">{record.route_name}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="text-gray-900">{record.latitude?.toFixed(6)}, {record.longitude?.toFixed(6)}</div>
                          <div className="text-gray-500 text-xs">{record.current_location || 'N/A'}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                          {record.speed ? `${record.speed} km/h` : 'N/A'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-500 text-xs">
                          {formatDate(record.updated_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {busLocationData.length > 50 && (
                <div className="mt-2 text-center text-gray-500 text-xs">
                  Showing first 50 of {busLocationData.length} records
                </div>
              )}
              
              {busLocationData.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No bus location data found
                </div>
              )}
            </div>
          </div>
        )}

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

            {/* Bus Locations Tab */}
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
                    
                    {/* Bus Information Panel */}
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

                {/* Bus List */}
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

            {/* Announcements Tab */}
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

                {/* Announcement Form Modal */}
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

            {/* Notices Tab */}
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
      
      {/* Show targeting information */}
      <div className="mb-2">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          notice.has_targeted_students 
            ? 'bg-purple-100 text-purple-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {notice.has_targeted_students 
            ? `Sent to ${notice.targeted_students_count} student(s)` 
            : 'Broadcast to all students'}
        </span>
      </div>
      
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
                {/* Notice Form Modal */}
{showNoticeForm && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg max-w-4xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
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

        {/* Student Selection Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Send to Specific Students (Optional)
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={selectAllStudents}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAllSelections}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            {newNotice.selectedStudents.length > 0 
              ? `Selected ${newNotice.selectedStudents.length} student(s)` 
              : 'If no students selected, notice will be sent to all students (broadcast)'}
          </p>
          
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Select</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">USN</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Branch</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => {
                  const isSelected = newNotice.selectedStudents.includes(student.student_id);
                  return (
                    <tr 
                      key={student.student_id} 
                      className={`cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                      onClick={() => toggleStudentSelection(student.student_id)}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleStudentSelection(student.student_id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                        {student.usn}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                        {student.full_name}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                        {student.branch}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {students.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                No students found
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            type="button"
            onClick={() => setShowNoticeForm(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
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

            {/* Community Tab */}
            {activeTab === 'community' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Community Messages ({communityMessages.length})</h2>
                </div>
                <div className="p-4 sm:p-6">
                  {/* Message Input */}
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