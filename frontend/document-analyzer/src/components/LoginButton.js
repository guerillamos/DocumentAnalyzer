import React from 'react';
import { useMsal } from '@azure/msal-react';

const LoginButton = () => {
  const { instance } = useMsal();

  const handleLogin = () => {
    // This component might not be rendered when mock auth is true based on App.js logic
    // But if it is, this check prevents real MSAL login.
    if (process.env.REACT_APP_USE_MOCK_AUTH === 'true') {
      console.log("Login button clicked, but auth is mocked.");
      // In App.js, mockAuth state is set, so no direct action needed here
      // unless you want to trigger a specific mock login behavior from here.
      return;
    }

    instance.loginPopup({
      scopes: ['User.Read', 'api://document-analyzer/DocumentAnalysis.Read']
    }).catch(err => {
      console.error('Login failed:', err);
    });
  };

  const handleLogout = () => {
    instance.logout();
  };

  // If App.js already hides this button when mock auth is on, this conditional rendering is redundant.
  // However, it provides an additional safeguard or alternative way to handle it.
  if (process.env.REACT_APP_USE_MOCK_AUTH === 'true') {
    // This button might be styled as disabled or not rendered at all from App.js
    return null; // Or <button disabled>Login (Mocked)</button> if preferred
  }

  return (
    <button onClick={handleLogin} className="login-button">
      Sign In
    </button>
  );
};

export default LoginButton;
