'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Users as UsersIcon, Calendar } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AnalyticsDashboard({ isLoggedIn, userRole }) {
  const [dau, setDau] = useState(0);
  const [mau, setMau] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load analytics data
  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Get DAU (Daily Active Users)
      const { data: dauData, error: dauError } = await supabase
        .from('user_activity')
        .select('user_id')
        .eq('activity_date', new Date().toISOString().split('T')[0]);

      if (!dauError) {
        const uniqueUsers = new Set(dauData.map(activity => activity.user_id));
        setDau(uniqueUsers.size);
      }

      // Get MAU (Monthly Active Users)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: mauData, error: mauError } = await supabase
        .from('user_activity')
        .select('user_id')
        .gte('activity_date', thirtyDaysAgo.toISOString().split('T')[0]);

      if (!mauError) {
        const uniqueMonthlyUsers = new Set(mauData.map(activity => activity.user_id));
        setMau(uniqueMonthlyUsers.size);
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load analytics on component mount and set up interval
  useEffect(() => {
    if (isLoggedIn && userRole === 'admin') {
      loadAnalyticsData();
      
      // Refresh analytics every 5 minutes
      const interval = setInterval(loadAnalyticsData, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, userRole]);

  // Don't show analytics for non-admin users
  if (!isLoggedIn || userRole !== 'admin') return null;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto mb-8 px-4">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="animate-pulse">
            <div className="h-6 bg-blue-500 rounded w-48 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/20 rounded-xl p-4 h-24"></div>
              <div className="bg-white/20 rounded-xl p-4 h-24"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto mb-8 px-4">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <TrendingUp size={24} className="mr-2" />
          App Analytics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* DAU Card */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Daily Active Users</p>
                <p className="text-3xl font-bold mt-1">{dau}</p>
                <p className="text-blue-200 text-xs mt-1">Today</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <UsersIcon size={24} className="text-white" />
              </div>
            </div>
          </div>

          {/* MAU Card */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Monthly Active Users</p>
                <p className="text-3xl font-bold mt-1">{mau}</p>
                <p className="text-blue-200 text-xs mt-1">Last 30 days</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Calendar size={24} className="text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Rate */}
        <div className="mt-4 bg-white/10 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-100">Engagement Rate</span>
            <span className="font-semibold">
              {dau && mau ? ((dau / mau) * 100).toFixed(1) : '0'}%
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 mt-2">
            <div 
              className="bg-green-400 h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${dau && mau ? Math.min((dau / mau) * 100, 100) : 0}%` 
              }}
            ></div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="mt-4 text-center">
          <p className="text-blue-200 text-xs">
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}