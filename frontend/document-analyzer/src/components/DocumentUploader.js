import React, { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import ClipLoader from 'react-spinners/ClipLoader';
import axios from 'axios';

// Receive isMockAuth as a prop
const DocumentUploader = ({ onAnalysisComplete, onAnalysisError, onStartLoading, isMockAuth }) => {
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { instance, accounts } = useMsal();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileContent(event.target.result);
      };
      reader.readAsText(selectedFile);
    } else {
      setFileContent('');
    }
  };

  const handleAnalyzeClick = async () => {
    if (!file || !fileContent) {
      onAnalysisError('Please select a document to analyze.');
      return;
    }

    // Log the value of isMockAuth as seen by DocumentUploader.js
    console.log(`DocumentUploader.js: isMockAuth = ${isMockAuth}`);

    try {
      // Signal loading state to parent component
      onStartLoading();
      setIsLoading(true);

      let accessToken = 'mock_token'; // Default to a mock token

      if (!isMockAuth) {
        console.log('DocumentUploader.js: Attempting to acquire real token.');
        const currentAccount = instance.getActiveAccount() || accounts[0];
        if (!currentAccount) {
          console.error('DocumentUploader.js: No active or available account for token acquisition.');
          onAnalysisError('No active account found. Please ensure you are properly logged in.');
          setIsLoading(false);
          onStartLoading(false); // Ensure loading state is reset
          return;
        }
        const tokenResponse = await instance.acquireTokenSilent({
          scopes: ['api://document-analyzer/DocumentAnalysis.Read'],
          account: currentAccount 
        });
        accessToken = tokenResponse.accessToken;
        console.log('DocumentUploader.js: Real token acquired.');
      } else {
        console.log('DocumentUploader.js: Using mock token.');
      }
      
      // Prepare the request payload
      const payload = {
        documentContent: fileContent,
        metadata: {
          name: file.name,
          uploadTime: new Date().toISOString(),
          fileType: file.type,
          fileSize: file.size
        }
      };
        // Define a function to make API requests with consistent configuration
      const makeApiRequest = async (url) => {
        console.log(`DocumentUploader.js: Making API call to ${url}`);
        
        const headers = {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
          'Accept': 'application/json'
        };
        
        // Only add Authorization header for real auth
        if (!isMockAuth) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }
        
        return axios.post(url, payload, {
          headers: headers,
          // Don't throw on non-200 status codes
          validateStatus: (status) => true,
          // Ensure we get a fresh response (no caching)
          params: { '_': new Date().getTime() },
          timeout: 10000 // 10 seconds
        });
      };

      // Try different approaches to call the API
      let response;
      let successfulResponse = false;

      // Approach 1: Try through the frontend proxy
      try {        const proxyUrl = `${window.location.origin}/api/analyzeDocument`;
        
        // Add additional query param to help identify the request in logs
        const queryParams = new URLSearchParams({
          '_': new Date().getTime(),
          'source': 'frontend-proxy'
        });
          const headers = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache',
            'Accept': 'application/json'
          };
          
          // Only add Authorization header for real auth
          if (!isMockAuth) {
            headers['Authorization'] = `Bearer ${accessToken}`;
          }
          
          response = await axios.post(`${proxyUrl}?${queryParams.toString()}`, payload, {
            headers: headers,
            validateStatus: (status) => true,
            timeout: 10000
          });
        
        console.log('DocumentUploader.js: API response received:', response.status);
        console.log('DocumentUploader.js: Response content type:', response.headers['content-type']);
        console.log('DocumentUploader.js: Response headers:', response.headers);
        
        // Check if the response is JSON
        if (response.headers['content-type'] && 
            response.headers['content-type'].includes('application/json') &&
            response.status >= 200 && response.status < 300) {
          successfulResponse = true;
          console.log('DocumentUploader.js: Valid JSON response received through proxy');
        } else {
          console.warn('DocumentUploader.js: Non-JSON or error response from proxy:', 
            typeof response.data === 'string' ? response.data.substring(0, 100) + '...' : response.data);
        }
      } catch (proxyError) {
        console.warn('DocumentUploader.js: Proxy API call failed:', proxyError);
      }

      // Approach 2: Try direct call to backend if proxy failed
      if (!successfulResponse) {
        try {
          const directUrl = 'https://document-analyzer-backend.localhost/api/analyzeDocument';
          console.log('DocumentUploader.js: Trying direct backend call:', directUrl);
          
          response = await makeApiRequest(directUrl);
          
          console.log('DocumentUploader.js: Direct API response received:', response.status);
          console.log('DocumentUploader.js: Direct response content type:', response.headers['content-type']);
          
          if (response.headers['content-type'] && 
              response.headers['content-type'].includes('application/json') &&
              response.status >= 200 && response.status < 300) {
            successfulResponse = true;
            console.log('DocumentUploader.js: Valid JSON response received through direct call');
          } else {
            console.warn('DocumentUploader.js: Non-JSON or error response from direct call');
          }
        } catch (directError) {
          console.warn('DocumentUploader.js: Direct backend call failed:', directError);
        }
      }

      // If either approach worked, return the data
      if (successfulResponse) {
        onAnalysisComplete(response.data);
      } else {
        // Fall back to static data for testing
        console.log('DocumentUploader.js: All API calls failed, falling back to static test data');
        const staticDataUrl = `${window.location.origin}/proxied-api-response.json`;
        console.log(`DocumentUploader.js: Fetching static data from ${staticDataUrl}`);
        const staticResponse = await axios.get(staticDataUrl);
        
        // Handle the static response
        console.log('DocumentUploader.js: Using static fallback data');
        onAnalysisComplete(staticResponse.data);
      }
    } catch (error) {
      console.error('Document analysis failed:', error);
      
      const errorMessage = error.response?.data?.error || 
                          error.message || 
                          'An unknown error occurred during document analysis.';
      
      onAnalysisError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="document-uploader card">
      <h2>Upload Document</h2>
      <p>Select a text document to analyze using Azure OpenAI services.</p>
      
      <div>
        <input 
          type="file" 
          accept=".txt,.md,.json,.csv"
          onChange={handleFileChange}
          disabled={isLoading}
        />
      </div>
      
      {fileContent && (
        <div className="document-preview">
          {fileContent.length > 500 ? 
            `${fileContent.substring(0, 500)}...` : 
            fileContent}
        </div>
      )}
      
      <button 
        onClick={handleAnalyzeClick} 
        disabled={!file || isLoading}
      >
        {isLoading ? (
          <>
            <ClipLoader size={14} color="#ffffff" css="margin-right: 8px;" />
            Analyzing...
          </>
        ) : 'Analyze Document'}
      </button>
    </div>
  );
};

export default DocumentUploader;
