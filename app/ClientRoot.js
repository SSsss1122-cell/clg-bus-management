// app/ClientRoot.js
'use client';

import React, { useEffect, useState } from 'react'; // ✅ Import React
// or import React from 'react'; if you prefer

export default function ClientRoot({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Check if user is logged in
    const savedUser = localStorage.getItem('sitBusUser');
    setIsLoggedIn(!!savedUser);
  }, []);

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner-blue w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Clone children and pass isLoggedIn prop
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { isLoggedIn });
    }
    return child;
  });

  return <>{childrenWithProps}</>; // Wrap in fragment
}
