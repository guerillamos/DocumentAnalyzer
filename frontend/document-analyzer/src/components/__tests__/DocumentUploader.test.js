import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useMsal } from '@azure/msal-react';
import DocumentUploader from '../DocumentUploader';

// Mock the useMsal hook
jest.mock('@azure/msal-react', () => ({
  useMsal: jest.fn()
}));

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({
    data: { id: 'test-id', status: 'success', analysisResult: { entities: [], topics: [] } },
    status: 200,
    headers: { 'content-type': 'application/json' }
  }),
  get: jest.fn().mockResolvedValue({
    data: { id: 'test-id', status: 'success', analysisResult: { entities: [], topics: [] } }
  })
}));

describe('DocumentUploader Component', () => {
  // Mock functions for props
  const mockOnAnalysisComplete = jest.fn();
  const mockOnAnalysisError = jest.fn();
  const mockOnStartLoading = jest.fn();
  
  // Setup default mocks before each test
  beforeEach(() => {
    useMsal.mockReturnValue({
      instance: {
        acquireTokenSilent: jest.fn().mockResolvedValue({ accessToken: 'fake-token' }),
        getActiveAccount: jest.fn().mockReturnValue({ name: 'Test User' })
      },
      accounts: [{ name: 'Test User' }]
    });
  });

  // Reset mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test that the component renders without crashing
  test('renders without crashing', () => {
    render(
      <DocumentUploader 
        onAnalysisComplete={mockOnAnalysisComplete} 
        onAnalysisError={mockOnAnalysisError}
        onStartLoading={mockOnStartLoading}
        isMockAuth={true}
      />
    );
    
    expect(screen.getByText(/Upload Document/i)).toBeInTheDocument();
    expect(screen.getByText(/Select a text document to analyze/i)).toBeInTheDocument();
  });

  // Test file selection
  test('allows file selection', () => {
    render(
      <DocumentUploader 
        onAnalysisComplete={mockOnAnalysisComplete} 
        onAnalysisError={mockOnAnalysisError}
        onStartLoading={mockOnStartLoading}
        isMockAuth={true}
      />
    );
    
    // Create a mock file
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      // Get the file input and simulate a file selection
    const input = document.querySelector('input[type="file"]');
    
    // Mock FileReader
    const mockFileReader = {
      onload: null,
      readAsText: jest.fn().mockImplementation(function(file) {
        this.onload({ target: { result: 'test content' } });
      })
    };
    
    // Replace the global FileReader with our mock
    global.FileReader = jest.fn().mockImplementation(() => mockFileReader);
    
    // Trigger file selection
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
      
      // Check that analyze button is enabled
      const analyzeButton = screen.getByText(/Analyze Document/i);
      expect(analyzeButton).not.toBeDisabled();
    }
  });
});
