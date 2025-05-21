import React, { useState, useEffect } from 'react'; // Added useEffect
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import DocumentUploader from './components/DocumentUploader';
import AnalysisResults from './components/AnalysisResults';
import LoginButton from './components/LoginButton';
import Header from './components/Header';
import './App.css';

function App() {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const realIsAuthenticated = useIsAuthenticated();
  const { instance } = useMsal();
  const [mockAuthActive, setMockAuthActive] = useState(false);

  // Determine mock auth status from environment variable
  const isAppMockAuth = process.env.REACT_APP_USE_MOCK_AUTH === 'true';

  useEffect(() => {
    // Log the value of the env variable as seen by App.js
    console.log(`App.js: REACT_APP_USE_MOCK_AUTH = "${process.env.REACT_APP_USE_MOCK_AUTH}", isAppMockAuth = ${isAppMockAuth}`);
    if (isAppMockAuth) {
      setMockAuthActive(true);
      const mockAccount = {
        homeAccountId: 'mock-home-id',
        environment: 'mock-env',
        tenantId: 'mock-tenant-id',
        username: 'mockuser@example.com',
        localAccountId: 'mock-local-id',
        name: 'Mock User',
      };
      if (instance) {
        instance.setActiveAccount(mockAccount);
        console.log('App.js: Mock account set as active.');
      }
    }
  }, [instance, isAppMockAuth]); // Add isAppMockAuth to dependency array

  // Determine authentication status based on mock flag
  const isAuthenticated = isAppMockAuth ? mockAuthActive : realIsAuthenticated;

  const handleLogout = () => {
    if (isAppMockAuth) {
      setMockAuthActive(false); // Set mock auth to false
      if (instance) {
        instance.setActiveAccount(null); // Clear active account
      }
    } else {
      instance.logoutPopup(); // Or logoutRedirect()
    }
  };

  const handleAnalysisComplete = (result) => {
    setAnalysisResult(result);
    setIsLoading(false);
    setError(null);
  };

  const handleAnalysisError = (errorMessage) => {
    setError(errorMessage);
    setIsLoading(false);
  };

  const handleStartLoading = () => {
    setIsLoading(true);
    setError(null);
  };

  return (
    <div className="app">
      {/* Pass isAuthenticated and handleLogout to Header */}
      <Header isAuthenticated={isAuthenticated} handleLogout={handleLogout} />
      
      <main className="container">
        {!isAuthenticated ? (
          <div className="login-container card">
            <h2>Please sign in to use the Document Analyzer</h2>
            {/* LoginButton should only be rendered if not in mock mode and not authenticated */}
            {process.env.REACT_APP_USE_MOCK_AUTH !== 'true' && !realIsAuthenticated && (
              <LoginButton />
            )}
            {/* If in mock mode, this message area is effectively bypassed by isAuthenticated being true */}
          </div>
        ) : (
          <>
            {/* The mock logout button is now handled by the Header component */}
            {/* Pass isAppMockAuth to DocumentUploader */}
            <DocumentUploader 
              isMockAuth={isAppMockAuth} 
              onAnalysisComplete={handleAnalysisComplete}
              onAnalysisError={handleAnalysisError}
              onStartLoading={handleStartLoading}
            />
            
            {error && (
              <div className="error">
                <h3>Error</h3>
                <p>{error}</p>
              </div>
            )}
            
            {analysisResult && !isLoading && (
              <AnalysisResults results={analysisResult} />
            )}
          </>
        )}
      </main>
      
      <footer className="footer">
        <p>© 2025 Document Analyzer - Powered by Azure Functions, Cosmos DB & Azure OpenAI</p>
      </footer>
    </div>
  );
}

export default App;
