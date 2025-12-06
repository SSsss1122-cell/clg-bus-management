'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function CommunityPage() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userUSN, setUserUSN] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const router = useRouter();

  // Check if user is logged in and get their details
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const savedUser = localStorage.getItem('sitBusUser');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          if (user && typeof user === 'object') {
            setUserFullName(user.full_name || '');
            setUserUSN(user.usn || '');
            setStudentId(user.id || '');
            setIsLoggedIn(true);
          } else {
            throw new Error('Invalid user data');
          }
        } else {
          alert('Please login first to access community chat');
          router.push('/');
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
        .select(`
          *,
          students:student_id (
            full_name,
            usn
          )
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const transformedData = (data || []).map(msg => ({
        ...msg,
        user_full_name: msg.students?.full_name || 'User',
        user_usn: msg.students?.usn || ''
      }));
      
      setMessages(transformedData);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!isLoggedIn) return;

    let subscription;
    
    const setupSubscription = async () => {
      await fetchMessages();

      subscription = supabase
        .channel('community_messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'community_messages'
          },
          async (payload) => {
            const { data: newMessage, error } = await supabase
              .from('community_messages')
              .select(`
                *,
                students:student_id (
                  full_name,
                  usn
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (!error && newMessage) {
              setMessages(prev => [...prev, {
                ...newMessage,
                user_full_name: newMessage.students?.full_name || 'User',
                user_usn: newMessage.students?.usn || ''
              }]);
            }
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [isLoggedIn]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !studentId) {
      alert('Please enter a message');
      return;
    }

    setIsSending(true);
    try {
      const messageData = {
        student_id: studentId,
        message: newMessage.trim()
      };

      const { error } = await supabase
        .from('community_messages')
        .insert([messageData]);

      if (error) throw error;
      
      setNewMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
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

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }).toLowerCase().replace(' ', '');
    } catch {
      return 'just now';
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
      }
    } catch {
      return '';
    }
  };

  const goBack = () => {
    router.back();
  };

  const refreshMessages = () => {
    setIsLoading(true);
    fetchMessages();
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Increased top spacing */}
      <div className="pt-6 sm:pt-8">
        {/* Header - Mobile Responsive */}
        <div className="bg-white shadow-sm border-b border-blue-100 mx-4 sm:mx-6 rounded-lg">
          <div className="max-w-4xl mx-auto px-4 sm:px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4">
                {/* Back Button */}
                <button
                  onClick={goBack}
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors"
                >
                  <span className="text-blue-600 text-xl">←</span>
                </button>
                
                <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <span className="text-white text-base sm:text-xl">💬</span>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Community Chat</h1>
                  <p className="text-sm sm:text-base text-gray-600 truncate max-w-[180px] sm:max-w-none">
                    Welcome, {userFullName || 'User'}!
                  </p>
                </div>
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={refreshMessages}
                className="px-4 py-2 sm:px-5 sm:py-2.5 bg-blue-50 text-blue-700 rounded-lg text-sm sm:text-base font-medium hover:bg-blue-100 flex items-center space-x-2 transition-colors"
              >
                <span className="text-lg">↻</span>
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Container with increased spacing */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Chat Messages Container */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-blue-100 h-[calc(100vh-220px)] sm:h-[calc(100vh-240px)] flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {messages.length === 0 ? (
              <div className="text-center py-10 sm:py-14">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r from-blue-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
                  <span className="text-3xl sm:text-4xl">👋</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3">No messages yet</h3>
                <p className="text-gray-600 text-base sm:text-lg max-w-md mx-auto px-3">
                  Start the conversation! Send a message to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {messages.map((message, index) => {
                  const isCurrentUser = message.student_id === studentId;
                  const senderName = isCurrentUser ? userFullName : (message.user_full_name || 'User');
                  const avatarLetter = (senderName?.charAt(0) || 'U').toUpperCase();
                  const previousMessage = messages[index - 1];
                  const showDate = !previousMessage || 
                    formatDate(previousMessage.created_at) !== formatDate(message.created_at);

                  return (
                    <div key={message.id}>
                      {/* Date Separator */}
                      {showDate && (
                        <div className="flex justify-center my-4 sm:my-5">
                          <div className="bg-blue-50 text-blue-700 text-sm px-4 py-1.5 rounded-full">
                            {formatDate(message.created_at)}
                          </div>
                        </div>
                      )}

                      {/* Message Row */}
                      <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-2`}>
                        {/* Other User Avatar (Left side) */}
                        {!isCurrentUser && (
                          <div className="flex-shrink-0 mr-3 sm:mr-4 mt-1">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-r from-blue-200 to-blue-300 flex items-center justify-center">
                              <span className="text-blue-800 text-sm font-bold">
                                {avatarLetter}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Message Content */}
                        <div className={`max-w-[75%] sm:max-w-[70%] ${isCurrentUser ? 'text-right' : ''}`}>
                          {/* Sender Name (only for others) */}
                          {!isCurrentUser && (
                            <div className="mb-1.5">
                              <span className="text-sm sm:text-base font-semibold text-blue-900">
                                {senderName}
                              </span>
                            </div>
                          )}
                          
                          {/* Message Bubble */}
                          <div className={`inline-block rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-4 ${
                            isCurrentUser
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-sm sm:rounded-br-none'
                              : 'bg-blue-50 text-gray-900 rounded-bl-sm sm:rounded-bl-none border border-blue-100'
                          }`}>
                            <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                              {message.message}
                            </p>
                          </div>
                          
                          {/* Time */}
                          <div className={`text-xs sm:text-sm text-gray-500 mt-1.5 ${isCurrentUser ? 'text-right' : ''}`}>
                            {formatTime(message.created_at)}
                            {isCurrentUser && <span className="ml-1.5">✓✓</span>}
                          </div>
                        </div>
                        
                        {/* Current User Avatar (Right side) */}
                        {isCurrentUser && (
                          <div className="flex-shrink-0 ml-3 sm:ml-4 mt-1">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                {avatarLetter}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area with increased bottom spacing */}
          <div className="border-t border-blue-100 p-4 sm:p-5 bg-blue-50">
            <div className="flex space-x-3 sm:space-x-4">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here..."
                  rows="1"
                  className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-white border border-blue-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm sm:text-base min-h-[48px] sm:min-h-[56px] max-h-[120px] sm:max-h-[140px] text-gray-900 placeholder-gray-500"
                  disabled={isSending}
                />
                <div className="absolute right-3 bottom-2 sm:right-4 sm:bottom-3 text-xs sm:text-sm text-gray-400">
                  {newMessage.length}/500
                </div>
              </div>
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending}
                className="px-5 sm:px-7 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl sm:rounded-2xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base flex items-center justify-center min-w-[65px] sm:min-w-[85px] transition-all duration-200"
              >
                {isSending ? (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="hidden sm:inline">Send</span>
                    <span className="sm:hidden text-base">📤</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Guidelines with increased bottom margin */}
            <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500 text-center mb-2">
              <span className="font-medium text-blue-600">{messages.length} {messages.length === 1 ? 'message' : 'messages'}</span>
              <span className="mx-2 sm:mx-3">•</span>
              <span>You: <span className="font-medium text-blue-700">{userFullName || 'User'}</span></span>
              <span className="mx-2 sm:mx-3">•</span>
              <span>Press Enter to send</span>
            </div>
          </div>
        </div>

        {/* Community Guidelines with increased bottom spacing */}
        <div className="mt-4 sm:mt-6 mb-6 sm:mb-8 bg-gradient-to-r from-blue-50 to-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-blue-100">
          <h3 className="font-semibold text-blue-900 text-base sm:text-lg mb-3 flex items-center">
            <span className="mr-2 text-lg sm:text-xl">💬</span>
            <span>Community Guidelines</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm sm:text-base text-blue-800">
            <div className="flex items-start">
              <span className="mr-2 text-blue-600">•</span>
              <span>Be respectful to others</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2 text-blue-600">•</span>
              <span>No spam content</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2 text-blue-600">•</span>
              <span>Share helpful information</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2 text-blue-600">•</span>
              <span>Help each other!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}