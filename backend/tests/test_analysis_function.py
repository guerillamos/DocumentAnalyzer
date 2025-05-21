import unittest
import json
import azure.functions as func
from unittest.mock import MagicMock, patch
import sys
import os

# Add the parent directory to the path so we can import the function code
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from AnalysisFunction import main

class TestAnalysisFunction(unittest.TestCase):
    @patch('AnalysisFunction.process_with_azure_openai')
    def test_document_analysis_success(self, mock_process_openai):
        # Arrange
        # Mock Azure OpenAI response
        mock_process_openai.return_value = {
            "topics": ["finance", "business"],
            "entities": ["quarterly earnings", "revenue growth"],
            "summary": "This document discusses financial performance.",
            "sentiment": "positive"
        }
        
        # Mock the HTTP request
        req = func.HttpRequest(
            method='POST',
            body=json.dumps({
                'documentContent': 'Sample document content for analysis.',
                'metadata': {
                    'name': 'test_document.txt'
                }
            }).encode('utf-8'),
            url='/api/analyzeDocument',
            route_params={}
        )
        
        # Mock the Cosmos DB output binding
        output_document = MagicMock()
        
        # Act
        response = main(req, output_document)
        response_body = json.loads(response.get_body())
        
        # Assert
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response_body['status'], 'success')
        self.assertTrue('id' in response_body)
        self.assertTrue('analysisResult' in response_body)
        self.assertEqual(response_body['analysisResult']['sentiment'], 'positive')
        
        # Verify Cosmos DB document was created
        output_document.set.assert_called_once()

    @patch('AnalysisFunction.process_with_azure_openai')
    def test_document_analysis_missing_content(self, mock_process_openai):
        # Arrange
        req = func.HttpRequest(
            method='POST',
            body=json.dumps({
                'metadata': {
                    'name': 'empty_document.txt'
                }
                # Missing documentContent field
            }).encode('utf-8'),
            url='/api/analyzeDocument',
            route_params={}
        )
        
        output_document = MagicMock()
        
        # Act
        response = main(req, output_document)
        response_body = json.loads(response.get_body())
        
        # Assert
        self.assertEqual(response.status_code, 400)
        self.assertTrue('error' in response_body)
        self.assertFalse(output_document.set.called)

    @patch('AnalysisFunction.process_with_azure_openai')
    def test_document_analysis_openai_error(self, mock_process_openai):
        # Arrange
        mock_process_openai.side_effect = Exception("Azure OpenAI API error")
        
        req = func.HttpRequest(
            method='POST',
            body=json.dumps({
                'documentContent': 'Sample document content for analysis.',
                'metadata': {
                    'name': 'test_document.txt'
                }
            }).encode('utf-8'),
            url='/api/analyzeDocument',
            route_params={}
        )
        
        output_document = MagicMock()
        
        # Act
        response = main(req, output_document)
        response_body = json.loads(response.get_body())
        
        # Assert
        self.assertEqual(response.status_code, 500)
        self.assertTrue('error' in response_body)
        self.assertFalse(output_document.set.called)

if __name__ == '__main__':
    unittest.main()
