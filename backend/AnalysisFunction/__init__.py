import logging
import json
import os
import uuid
from datetime import datetime
import azure.functions as func
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import AzureOpenAI
import sys
import os
# Fix relative imports by using absolute imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from SharedCode.json_helpers import flatten_nested_json, transform_json_response
from SharedCode.retry_helpers import retry_with_exponential_backoff

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Document Analysis function processed a request.')

    try:
        req_body = req.get_json()
        logging.info(f"Received document analysis request: {json.dumps(req_body)}")
        
        # Extract document content from the request
        document_content = req_body.get('documentContent')
        document_metadata = req_body.get('metadata', {})
        
        if not document_content:
            return func.HttpResponse(
                json.dumps({"error": "Document content is required"}),
                status_code=400,
                mimetype="application/json"
            )
        
        # Process document content through Azure OpenAI
        ai_analysis_result = process_with_azure_openai(document_content)
        
        # Transform the nested JSON response to a flattened structure
        transformed_data = transform_json_response(ai_analysis_result)
        flattened_data = flatten_nested_json(transformed_data)
        
        # Prepare the final result
        result = {
            "id": req_body.get('id', str(uuid.uuid4())),
            "documentName": document_metadata.get('name', 'Unnamed Document'),
            "uploadTime": document_metadata.get('uploadTime', datetime.now().isoformat()),
            "analysisResult": flattened_data,
            "rawContent": document_content[:1000],  # Store the first 1000 chars of content
            "processed": True,
            "processingTime": datetime.now().isoformat()
        }
        
        # Note: CosmosDB storage has been removed from this function
        # If you need to store data in CosmosDB, add the connection string to local.settings.json
        # and re-enable the CosmosDB binding in function.json
        
        # Return successful response with correct mime type for JSON
        return func.HttpResponse(
            json.dumps({"status": "success", "id": result["id"], "analysisResult": flattened_data}),
            status_code=200,
            mimetype="application/json"
        )
        
    except Exception as e:
        logging.error(f"Error processing document: {str(e)}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )

@retry_with_exponential_backoff(max_retries=3, backoff_in_seconds=1)
def process_with_azure_openai(document_content):
    """
    Process document content using Azure OpenAI with retry logic
    """
    try:
        # Check if we're in development mode (always true in our current setup)
        is_development = os.environ.get("AZURE_FUNCTIONS_ENVIRONMENT", "").lower() == "development"
        
        # In development mode, always use mock responses
        if is_development or True:  # Force development mode for now
            logging.info("Using mock response for document analysis")
            return generate_mock_response(document_content)
            
        # The production code path is disabled until proper configuration is set up
        else:            # Production mode - use Azure AD authentication
            endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]
            credential = DefaultAzureCredential()
            token_provider = get_bearer_token_provider(credential, "https://cognitiveservices.azure.com/.default")
            client = AzureOpenAI(
                api_version="2024-02-01",
                azure_endpoint=endpoint,
                azure_ad_token_provider=token_provider
            )
        
        # Prepare the prompt with document content
        system_message = """
        You are a document analysis assistant. Analyze the provided document and extract the following information:
        - Main topics and themes
        - Key entities mentioned
        - Summary of content (max 3 paragraphs)
        - Overall sentiment (positive, negative, neutral)
        
        Format your response as a JSON object with these fields.
        """
        
        # Use few-shot prompting to guide the model's output format
        few_shot_examples = """
        Example 1:
        Input: "We are pleased to announce our quarterly earnings of $2.5M, which exceeded expectations."
        Output: {
            "topics": ["financial", "earnings report"],
            "entities": ["quarterly earnings", "$2.5M"],
            "summary": "The document announces quarterly earnings of $2.5M that exceeded expectations.",
            "sentiment": "positive"
        }
        
        Example 2:
        Input: "Customer complaints have increased by 15% this quarter, primarily regarding shipping delays."
        Output: {
            "topics": ["customer service", "complaints", "logistics"],
            "entities": ["shipping delays", "15% increase"],
            "summary": "Customer complaints increased by 15% this quarter. The main issue is shipping delays.",
            "sentiment": "negative"
        }
        """
        
        # Combine system message, few_shot examples, and input document
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": few_shot_examples},
            {"role": "user", "content": f"Document to analyze: {document_content}"}
        ]
        
        # Call Azure OpenAI API
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.3,
            max_tokens=1000
        )
        
        # Extract and parse the JSON response
        ai_response = response.choices[0].message.content
        try:
            # Try to parse as JSON directly
            result = json.loads(ai_response)
        except json.JSONDecodeError:
            # If parsing fails, try to extract JSON from the text response
            import re
            json_pattern = r'{[\s\S]*}'
            match = re.search(json_pattern, ai_response)
            if match:
                result = json.loads(match.group(0))
            else:
                result = {"error": "Failed to parse AI response", "raw_response": ai_response}
        
        return result
        
    except Exception as e:
        logging.error(f"Error in OpenAI processing: {str(e)}")
        raise  # Let the retry decorator handle the retry logic

def generate_mock_response(document_content):
    """
    Generate a mock response for development environments without Azure OpenAI access
    """
    logging.info("Generating mock analysis response")
    
    # Extract a summary from the first 200 characters
    summary = document_content[:200] + "..." if len(document_content) > 200 else document_content
    
    # Determine sentiment based on simple keyword matching
    sentiment = "neutral"
    positive_words = ["good", "great", "excellent", "positive", "success", "happy", "pleased", "increase", "profit"]
    negative_words = ["bad", "poor", "negative", "fail", "decrease", "problem", "issue", "complaint", "loss"]
    
    doc_lower = document_content.lower()
    positive_count = sum(1 for word in positive_words if word in doc_lower)
    negative_count = sum(1 for word in negative_words if word in doc_lower)
    
    if positive_count > negative_count:
        sentiment = "positive"
    elif negative_count > positive_count:
        sentiment = "negative"
      # Extract potential entities (simple implementation for mock data)
    import re
    potential_entities = re.findall(r'\b[A-Z][a-z]+ [A-Z][a-z]+\b|\b[A-Z][a-z]+\b|\$\d+(?:\.\d+)?[KMB]?|\d+%', document_content)
    entities = list(set(potential_entities))[:5]  # Limit to 5 unique entities
    
    # Add default entities if none were found
    if not entities:
        # Extract any words of interest from the document
        words_of_interest = re.findall(r'\b[a-zA-Z]{5,}\b', document_content)
        if words_of_interest:
            entities = [word.capitalize() for word in words_of_interest[:3]]
        
        # If still no entities, add defaults
        if not entities:
            entities = ["Document", "Content", "Analysis"]
    
    # Generate mock topics
    words = re.findall(r'\b[a-zA-Z]{4,}\b', document_content.lower())
    word_counts = {}
    for word in words:
        word_counts[word] = word_counts.get(word, 0) + 1
    
    # Sort by frequency and get top 3
    sorted_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)
    topics = [word for word, _ in sorted_words[:3]]
    
    # Add default topics if none were found
    if not topics:
        # Try to extract meaningful words
        meaningful_words = [word for word in words if len(word) > 3 and word not in ["this", "that", "with", "from", "have", "were"]]
        if meaningful_words:
            topics = meaningful_words[:3]
        else:
            topics = ["document", "analysis", "content"]
      # Construct the mock response
    mock_response = {
        "topics": topics,
        "entities": entities,
        "summary": f"[MOCK ANALYSIS] {summary}",
        "sentiment": sentiment
    }
    
    # Log the generated mock response for debugging
    logging.info(f"Generated mock response: topics={topics}, entities={entities}")
    
    return mock_response
