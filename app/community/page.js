'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CommunityPage() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userUSN, setUserUSN] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const messagesEndRef = useRef(null);
  const router = useRouter();

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if user is logged in and get their details
  useEffect(() => {
    const checkLoginStatus = () => {
      try {
        const savedUser = localStorage.getItem('sitBusUser');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          setUserFullName(user.full_name);
          setUserUSN(user.usn);
          // Use full name as display name by default
          setUsername(user.full_name);
          setIsLoggedIn(true);
        } else {
          // User not logged in, redirect to home page
          alert('Please login first to access community chat');
          router.push('/');
          return;
        }
      } catch (error) {
        console.error('Error checking login status:', error);
        alert('Please login first to access community chat');
        router.push('/');
      }
    };

    checkLoginStatus();
  }, [router]);

  // Fetch messages from Supabase
  const fetchMessages = async () => {
    if (!isLoggedIn) return;
    
    try {
      const { data, error } = await supabase
        .from('community_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (isLoggedIn) {
      fetchMessages();

      const subscription = supabase
        .channel('community_messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'community_messages'
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new]);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isLoggedIn]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !username || !isLoggedIn) return;

    setIsSending(true);
    try {
      // Store both display name and actual user details
      const messageData = {
        username: username, // Display name (can be changed by user)
        message: newMessage.trim(),
        user_full_name: userFullName, // Actual full name from login
        user_usn: userUSN, // Actual USN from login
        created_at: new Date().toISOString()
      };

      console.log('Sending message:', messageData);

      const { data, error } = await supabase
        .from('community_messages')
        .insert([messageData])
        .select();

      if (error) {
        console.error('Supabase error details:', error);
        
        // If there are column errors, try with minimal fields
        if (error.message.includes('column')) {
          console.log('Retrying with minimal fields...');
          const { data: retryData, error: retryError } = await supabase
            .from('community_messages')
            .insert([{
              username: username,
              message: newMessage.trim(),
              created_at: new Date().toISOString()
            }])
            .select();
            
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert(`Error sending message: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageTime = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = (now - date) / (1000 * 60);
      
      if (diffInMinutes < 1) {
        return 'Now';
      } else if (diffInMinutes < 60) {
        return `${Math.floor(diffInMinutes)}m`;
      } else if (diffInMinutes < 1440) {
        return `${Math.floor(diffInMinutes / 60)}h`;
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (error) {
      return 'Now';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sitBusUser');
    setIsLoggedIn(false);
    setUsername('');
    setUserFullName('');
    setUserUSN('');
    router.push('/');
  };

  const changeDisplayName = () => {
    const newDisplayName = prompt('Enter display name:', username);
    if (newDisplayName && newDisplayName.trim()) {
      const trimmedName = newDisplayName.trim();
      setUsername(trimmedName);
    }
  };

  // Get display name for a message - shows actual name if available, otherwise username
  const getMessageDisplayName = (message) => {
    return message.user_full_name || message.username;
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
            <p className="text-gray-600 mb-4">Please login to access the community chat</p>
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
            <p className="mt-3 text-gray-600 text-sm">Loading chat...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-3 safe-area-bottom">
      <div className="max-w-4xl mx-auto">
        {/* Header - Mobile Optimized */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">💬</span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-gray-900 truncate">Community Chat</h1>
                <p className="text-gray-600 text-xs truncate">Welcome, {userFullName}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-right hidden xs:block">
                <div className="text-xs text-gray-600">Logged in as</div>
                <div className="flex items-center space-x-1">
                  <span className="font-medium text-green-600 text-xs">
                    {userFullName}
                  </span>
                  <button
                    onClick={changeDisplayName}
                    className="text-blue-500 hover:text-blue-700 text-xs ml-1"
                    title="Change display name"
                  >
                    ✎
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-red-500 hover:text-red-700 text-xs ml-1"
                    title="Logout"
                  >
                    ⎋
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={changeDisplayName}
                  className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0"
                  title="Change display name"
                >
                  <span className="text-blue-600 font-bold text-xs">✎</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"
                  title="Logout"
                >
                  <span className="text-red-500 text-xs font-bold">⎋</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-[calc(100vh-200px)] min-h-[400px] flex flex-col">
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length > 0 ? (
              messages.map((message) => {
                const displayName = getMessageDisplayName(message);
                const isCurrentUser = message.user_usn === userUSN || message.username === username;
                
                return (
                  <div
                    key={message.id}
                    className={`flex space-x-2 ${
                      isCurrentUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isCurrentUser && (
                      <div className="flex-shrink-0">
                        <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 text-xs font-bold">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className={`max-w-[85%] ${isCurrentUser ? 'order-first' : ''}`}>
                      {!isCurrentUser && (
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-semibold text-gray-900 truncate">
                            {displayName}
                          </span>
                          {message.user_usn && (
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">
                              {message.user_usn}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-500 flex-shrink-0">
                            {formatMessageTime(message.created_at)}
                          </span>
                        </div>
                      )}
                      
                      <div
                        className={`rounded-2xl px-3 py-2 ${
                          isCurrentUser
                            ? 'bg-green-500 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-900 rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {message.message}
                        </p>
                      </div>
                      
                      {isCurrentUser && (
                        <div className="flex items-center justify-end space-x-2 mt-1">
                          <span className="text-[10px] text-gray-400">
                            {formatMessageTime(message.created_at)}
                          </span>
                          <span className="text-[10px] text-gray-400">✓✓</span>
                        </div>
                      )}
                    </div>

                    {isCurrentUser && (
                      <div className="flex-shrink-0">
                        <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">💬</span>
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-2">No messages yet</h3>
                <p className="text-gray-500 text-sm px-4">
                  Be the first to start the conversation!
                </p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input - Fixed Styling */}
          <div className="border-t border-gray-200 p-3 safe-area-padding bg-white">
            <div className="flex space-x-2 items-end">
              <div className="flex-1 min-w-0">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  rows="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none text-sm min-h-[44px] max-h-[120px] bg-white text-gray-900 placeholder-gray-500"
                  disabled={isSending}
                  style={{ 
                    height: 'auto',
                    minHeight: '44px'
                  }}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex-shrink-0 min-h-[44px] min-w-[60px] flex items-center justify-center transition-colors"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Send'
                )}
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
              <span className="ml-2">• Displaying as: {username}</span>
            </div>
          </div>
        </div>

        {/* Community Guidelines - Mobile Optimized */}
        <div className="mt-4 bg-blue-50 rounded-lg p-3 border border-blue-200">
          <h3 className="font-semibold text-blue-900 text-sm mb-2">Community Guidelines</h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Be respectful and kind to others</li>
            <li>• No spam or inappropriate content</li>
            <li>• Keep conversations relevant to campus transportation</li>
            <li>• Share bus updates, routes, and helpful information</li>
            <li>• Have fun and help fellow students! 🎉</li>
          </ul>
        </div>
      </div>

      {/* Mobile-specific CSS for safe areas */}
      <style jsx>{`
        .safe-area-bottom {
          padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
        }
        .safe-area-padding {
          padding-left: calc(0.75rem + env(safe-area-inset-left, 0px));
          padding-right: calc(0.75rem + env(safe-area-inset-right, 0px));
        }
        
        /* Custom scrollbar for mobile */
        .overflow-y-auto {
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .overflow-y-auto::-webkit-scrollbar {
          display: none;
        }
        
        /* Prevent zoom on input focus for iOS */
        @media screen and (max-width: 768px) {
          textarea {
            font-size: 16px; /* Prevents zoom on iOS */
          }
        }
      `}</style>
    </div>
  );
}