import React, { useState } from 'react';

const AnalysisResults = ({ results }) => {
  const [activeTab, setActiveTab] = useState('summary');
  
  // Ensure results is at least an empty object to avoid null reference errors
  const safeResults = results || {};
  
  // Extract results from the analysis
  const {
    id = '',
    analysisResult = {},
    status = ''
  } = safeResults;

  // Ensure analysisResult is at least an empty object
  const safeAnalysisResult = analysisResult || {};

  const {
    topics = [],
    entities = [],
    summary = '',
    sentiment = 'neutral'
  } = safeAnalysisResult;
  // Ensure topics and entities are always arrays
  let topicsArray = Array.isArray(topics) ? topics : [];
  let entitiesArray = Array.isArray(entities) ? entities : [];
  
  // Additional handling for edge cases
  if (topicsArray.length === 0 && typeof topics === 'string' && topics.trim() !== '') {
    // If topics is a non-empty string, split it and use as array
    topicsArray = topics.split(',').map(t => t.trim());
  }
  
  if (entitiesArray.length === 0 && typeof entities === 'string' && entities.trim() !== '') {
    // If entities is a non-empty string, split it and use as array
    entitiesArray = entities.split(',').map(e => e.trim());
  }
  
  // Ensure we log what's being rendered
  console.log('AnalysisResults: topics=', topics, 'topicsArray=', topicsArray);
  console.log('AnalysisResults: entities=', entities, 'entitiesArray=', entitiesArray);

  // Helper function to get sentiment class
  const getSentimentClass = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'positive';
      case 'negative':
        return 'negative';
      default:
        return 'neutral';
    }
  };

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'entities', label: 'Entities' },
    { id: 'topics', label: 'Topics' },
    { id: 'raw', label: 'Raw Results' }
  ];

  return (
    <div className="analysis-results card">
      <h2>Document Analysis Results</h2>
      
      <div className="result-metadata">
        <p>
          <strong>Analysis ID:</strong> {id}
          <span 
            className={`sentiment ${getSentimentClass(sentiment)}`}
            style={{ marginLeft: '16px' }}
          >
            {sentiment || 'Neutral'}
          </span>
        </p>
      </div>      <div className="tabs">
        {tabs && Array.isArray(tabs) && tabs.map(tab => (
          <div 
            key={tab.id || 'tab'}
            className={`tab ${activeTab === (tab.id || '') ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id || '')}
          >
            {tab.label || ''}
          </div>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'summary' && (
          <div className="tab-pane">
            <h3>Summary</h3>
            <p>{summary || 'No summary available.'}</p>
          </div>
        )}
          {activeTab === 'entities' && (
          <div className="tab-pane">
            <h3>Entities</h3>
            {entitiesArray.length > 0 ? (
              <ul>
                {entitiesArray.map((entity, index) => (
                  <li key={index}>{entity}</li>
                ))}
              </ul>
            ) : (
              <p>No entities detected.</p>
            )}
          </div>
        )}
          {activeTab === 'topics' && (
          <div className="tab-pane">
            <h3>Topics</h3>
            {topicsArray.length > 0 ? (
              <div>
                {topicsArray.map((topic, index) => (
                  <span key={index} className="topic-tag">{topic}</span>
                ))}
              </div>
            ) : (
              <p>No topics detected.</p>
            )}
          </div>
        )}        {activeTab === 'raw' && (
          <div className="tab-pane">
            <h3>Raw Analysis Data</h3>
            {safeResults && typeof safeResults === 'object' ? (
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(safeResults, null, 2)}
              </pre>
            ) : typeof safeResults === 'string' ? (
              <div>
                <p className="error-message">Received non-JSON response (showing first 500 chars):</p>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'red' }}>
                  {safeResults.substring(0, 500)}...
                </pre>
              </div>
            ) : (
              <p className="error-message">No results data available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisResults;
