import React from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import './Header.css';

const Header = () => {
  const { instance } = useMsal();
  // Use the same logic as App.js to determine effective authentication state
  const realIsAuthenticated = useIsAuthenticated();
  const isMockAuth = process.env.REACT_APP_USE_MOCK_AUTH === 'true';
  const isAuthenticated = isMockAuth ? true : realIsAuthenticated; // In mock mode, assume authenticated for header display
  
  let accountDetails = null;
  if (isAuthenticated) {
    if (isMockAuth) {
      // Use mock account details if available from instance, or define static mock details
      accountDetails = instance.getActiveAccount() || { name: "Mock User" }; 
    } else {
      accountDetails = instance.getActiveAccount();
    }
  }

  const handleLogout = () => {
    if (isMockAuth) {
      // For mock auth, the actual logout (clearing mock state) should be handled in App.js
      // This button in the header can trigger that function if passed down via props,
      // or simply log that a mock logout was attempted.
      console.log("Mock logout initiated from header.");
      // To make it functional, App.js handleLogout would need to be passed here or use a global state.
      // For now, we assume App.js handles the mock state change for logout.
      // A simple approach if not passing props: alert("Mock logout. Refresh or manage state in App.js");
      // Or, if App.js's mock logout is robust:
      if (instance && instance.getActiveAccount()) { // Check if mock account was set
        instance.setActiveAccount(null); // Clear mock active account
        // Potentially force a re-render or state update if needed, though App.js should handle it.
        window.location.reload(); // Simplest way to reflect change if state isn't perfectly synced
      }
    } else {
      instance.logoutPopup(); // Or logoutRedirect()
    }
  };

  return (
    <header className="header">
      <div className="logo">Document Analyzer</div>
      <div className="user-info">
        {isAuthenticated && accountDetails ? (
          <>
            <span>Welcome, {accountDetails.name || accountDetails.username}</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </>
        ) : (
          <span>Please sign in.</span>
        )}
      </div>
    </header>
  );
};

export default Header;
