import json
import logging
from typing import Dict, Any, List, Union

def flatten_nested_json(nested_data: Dict[str, Any], parent_key: str = '', separator: str = '_') -> Dict[str, Any]:
    """
    Recursively flatten nested JSON structures for easier storage and querying in databases like Cosmos DB.
    
    Args:
        nested_data: The nested dictionary to flatten
        parent_key: The base key for the current recursion level
        separator: The character to use when joining keys
    
    Returns:
        A flattened dictionary with no nested structures
    """
    items = []
    for k, v in nested_data.items():
        new_key = f"{parent_key}{separator}{k}" if parent_key else k
        
        if isinstance(v, dict):
            items.extend(flatten_nested_json(v, new_key, separator).items())
        elif isinstance(v, list):
            # Handle lists by converting them to string or flattening if they contain dicts
            if len(v) > 0 and isinstance(v[0], dict):
                for i, item in enumerate(v):
                    items.extend(flatten_nested_json(item, f"{new_key}{separator}{i}", separator).items())
            else:
                items.append((new_key, str(v)))
        else:
            items.append((new_key, v))
    
    return dict(items)

def transform_json_response(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform a JSON response from Azure OpenAI to a standardized format
    for consistent storage and retrieval.
    
    Args:
        data: The JSON data to transform
    
    Returns:
        Transformed JSON with standardized format
    """
    # Define schema for expected properties
    expected_schema = {
        "topics": list,
        "entities": list,
        "summary": str,
        "sentiment": str
    }
    
    # Initialize result with default values
    result = {
        "topics": [],
        "entities": [],
        "summary": "",
        "sentiment": "neutral",
        "confidence_score": 0.0
    }
    
    # Map incoming data to expected schema
    for key, expected_type in expected_schema.items():
        if key in data and isinstance(data[key], expected_type):
            result[key] = data[key]
        elif key in data:
            # Type mismatch but key exists, try to convert
            try:
                if expected_type == list and isinstance(data[key], str):
                    # Try to convert string to list by splitting
                    result[key] = [item.strip() for item in data[key].split(',')]
                elif expected_type == str and isinstance(data[key], (list, dict)):
                    # Convert list/dict to string
                    result[key] = str(data[key])
                else:
                    # Default fallback
                    logging.warning(f"Type mismatch for key '{key}', using default value")
            except Exception as e:
                logging.error(f"Error transforming key '{key}': {str(e)}")
    
    # Add additional derived fields if possible
    if "confidence" in data and isinstance(data["confidence"], (int, float)):
        result["confidence_score"] = float(data["confidence"])
    
    return result
