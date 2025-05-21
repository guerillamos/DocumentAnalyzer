import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnalysisResults from '../AnalysisResults';

describe('AnalysisResults Component', () => {
  // Test that the component renders without crashing
  test('renders without crashing', () => {
    render(<AnalysisResults results={null} />);
    // If it renders without throwing an error, the test passes
  });

  // Test that the component handles empty results
  test('handles empty results gracefully', () => {
    render(<AnalysisResults results={{}} />);
    // Look for "No summary available" text which should display when there's no data
    expect(screen.getByText(/No summary available/i)).toBeInTheDocument();
  });

  // Test that the component displays actual results
  test('displays analysis results correctly', () => {
    const mockResults = {
      id: 'test-id',
      analysisResult: {
        topics: ['Finance', 'Technology'],
        entities: ['Company A', 'Product B'],
        summary: 'This is a sample summary.',
        sentiment: 'positive'
      },
      status: 'success'
    };

    render(<AnalysisResults results={mockResults} />);
    
    // Check that the summary is displayed
    expect(screen.getByText('This is a sample summary.')).toBeInTheDocument();
    
    // Check that we can switch tabs
    fireEvent.click(screen.getByText(/Entities/i));
    expect(screen.getByText('Company A')).toBeInTheDocument();
    expect(screen.getByText('Product B')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText(/Topics/i));
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
  });
});
