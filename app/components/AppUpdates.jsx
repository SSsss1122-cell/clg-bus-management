'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// App Update Notification Component (same as before)
function AppUpdateNotification({ update, onClose, onUpdate }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleUpdate = () => {
    if (update.download_url) {
      window.open(update.download_url, '_blank');
    }
    onUpdate();
  };

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className={`bg-white rounded-2xl max-w-md w-full transform transition-all duration-300 ${
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                update.force_update ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  App Update Available
                </h3>
                <p className="text-sm text-gray-600">Version {update.version}</p>
              </div>
            </div>
            {!update.force_update && (
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">{update.title}</h4>
            <p className="text-gray-600 text-sm leading-relaxed">
              {update.description}
            </p>
          </div>

          {update.force_update && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-red-800 text-sm font-medium">
                  Required Update
                </span>
              </div>
              <p className="text-red-700 text-xs mt-1">
                This update is required to continue using the app.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex space-x-3">
            {!update.force_update && (
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Later
              </button>
            )}
            <button
              onClick={handleUpdate}
              className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium ${
                update.force_update ? 'flex-1' : 'flex-1'
              }`}
            >
              Update Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main App Updates Component - SIMPLIFIED VERSION
export default function AppUpdates({ onVersionChange }) {
  const [appUpdate, setAppUpdate] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('1.0.0');

  // Check for app updates function
  const checkForAppUpdates = async () => {
    try {
      const { data: updates, error } = await supabase
        .from('app_updates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking for updates:', error);
        return;
      }

      if (updates && updates.length > 0) {
        const latestUpdate = updates[0];
        const lastSeenVersion = localStorage.getItem('lastSeenAppVersion');
        
        // Set current version from the latest update
        setCurrentVersion(latestUpdate.version);
        
        // Notify parent component about version change
        if (onVersionChange) {
          onVersionChange(latestUpdate.version);
        }
        
        // Only show update modal if it's newer than the last seen version
        if (!lastSeenVersion || lastSeenVersion !== latestUpdate.version) {
          setAppUpdate(latestUpdate);
          setShowUpdateModal(true);
        }
      }
    } catch (error) {
      console.error('Error checking for app updates:', error);
    }
  };

  const handleUpdateClose = () => {
    if (appUpdate && !appUpdate.force_update) {
      localStorage.setItem('lastSeenAppVersion', appUpdate.version);
    }
    setShowUpdateModal(false);
  };

  const handleUpdateConfirm = () => {
    if (appUpdate) {
      localStorage.setItem('lastSeenAppVersion', appUpdate.version);
      setShowUpdateModal(false);
    }
  };

  // Check for updates on component mount
  useEffect(() => {
    checkForAppUpdates();
  }, []);

  return (
    <>
      {/* Only show the modal, no version info card */}
      {showUpdateModal && appUpdate && (
        <AppUpdateNotification 
          update={appUpdate}
          onClose={handleUpdateClose}
          onUpdate={handleUpdateConfirm}
        />
      )}
    </>
  );
}