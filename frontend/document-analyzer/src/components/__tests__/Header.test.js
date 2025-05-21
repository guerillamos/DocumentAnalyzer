import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import Header from '../Header';

// Mock the Azure MSAL hooks
jest.mock('@azure/msal-react', () => ({
  useMsal: jest.fn(),
  useIsAuthenticated: jest.fn()
}));

describe('Header Component', () => {
  // Setup before each test
  beforeEach(() => {
    // Mock default behavior
    useIsAuthenticated.mockReturnValue(false);
    useMsal.mockReturnValue({
      instance: {
        getActiveAccount: jest.fn().mockReturnValue(null),
        logoutPopup: jest.fn()
      }
    });
    
    // Reset environment variable to default state
    process.env.REACT_APP_USE_MOCK_AUTH = 'false';
  });

  // Test that the header renders the application title
  test('renders the application title', () => {
    render(<Header />);
    expect(screen.getByText(/Document Analyzer/i)).toBeInTheDocument();
  });

  // Test header when user is not authenticated
  test('shows correct state when user is not authenticated', () => {
    render(<Header />);
    // Should show "Sign In" but not username
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
    expect(screen.queryByText(/Welcome,/i)).not.toBeInTheDocument();
  });

  // Test header when user is authenticated
  test('shows username when authenticated', () => {
    // Mock authentication state
    useIsAuthenticated.mockReturnValue(true);
    useMsal.mockReturnValue({
      instance: {
        getActiveAccount: jest.fn().mockReturnValue({ name: 'Test User' }),
        logoutPopup: jest.fn()
      }
    });
    
    render(<Header />);
      // Should show the user's name
    expect(screen.getByText(/Welcome, Test User/i)).toBeInTheDocument();
    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
  });

  // Test header with mock authentication
  test('handles mock authentication correctly', () => {
    // Set up mock authentication
    process.env.REACT_APP_USE_MOCK_AUTH = 'true';
    
    // Even with real auth false, should show as authenticated due to mock mode
    useIsAuthenticated.mockReturnValue(false);
    useMsal.mockReturnValue({
      instance: {
        getActiveAccount: jest.fn().mockReturnValue({ name: 'Mock User' }),
        logoutPopup: jest.fn()
      }
    });
    
    render(<Header />);
    
    // Should show the mock user's name
    expect(screen.getByText(/Welcome, Mock User/i)).toBeInTheDocument();
  });
});
