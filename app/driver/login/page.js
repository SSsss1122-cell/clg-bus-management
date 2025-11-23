'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bus, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function DriverLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    driver_number: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!formData.driver_number || !formData.password) {
      setError('Please enter both phone number and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if driver exists with matching phone number and password
      const { data, error } = await supabase
        .from('buses')
        .select('*')
        .eq('driver_number', formData.driver_number)
        .eq('password', formData.password)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Invalid phone number or password');
        } else {
          throw error;
        }
        return;
      }

      if (!data) {
        setError('Invalid phone number or password');
        return;
      }

      // Save driver session
      localStorage.setItem('driverSession', JSON.stringify({
        bus_id: data.id,
        driver_name: data.driver_name,
        driver_number: data.driver_number,
        bus_number: data.bus_number,
        loggedIn: true
      }));

      // Redirect to location sharing page
      router.push('/driver/location');

    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
            <Bus className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Driver Login</h1>
          <p className="text-gray-600">Access your bus location sharing dashboard</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone size={16} className="inline mr-2" />
                Phone Number *
              </label>
              <input
                type="tel"
                name="driver_number"
                value={formData.driver_number}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
                placeholder="Enter your registered phone number"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock size={16} className="inline mr-2" />
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all pr-12"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}