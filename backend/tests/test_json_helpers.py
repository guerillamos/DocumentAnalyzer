import unittest
import sys
import os
import json

# Add the parent directory to the path so we can import the function code
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from SharedCode.json_helpers import flatten_nested_json, transform_json_response

class TestJsonHelpers(unittest.TestCase):
    def test_flatten_nested_json(self):
        # Arrange
        nested_data = {
            "person": {
                "name": "John Doe",
                "address": {
                    "street": "123 Main St",
                    "city": "Anytown",
                    "zip": "12345"
                },
                "hobbies": ["reading", "hiking"]
            },
            "status": "active"
        }
        
        # Act
        flattened = flatten_nested_json(nested_data)
        
        # Assert
        self.assertEqual(flattened["person_name"], "John Doe")
        self.assertEqual(flattened["person_address_street"], "123 Main St")
        self.assertEqual(flattened["person_address_city"], "Anytown")
        self.assertEqual(flattened["person_address_zip"], "12345")
        self.assertEqual(flattened["person_hobbies"], "['reading', 'hiking']")
        self.assertEqual(flattened["status"], "active")
    
    def test_flatten_nested_json_with_array_of_objects(self):
        # Arrange
        nested_data = {
            "people": [
                {"name": "John", "age": 30},
                {"name": "Jane", "age": 25}
            ]
        }
        
        # Act
        flattened = flatten_nested_json(nested_data)
        
        # Assert
        self.assertEqual(flattened["people_0_name"], "John")
        self.assertEqual(flattened["people_0_age"], 30)
        self.assertEqual(flattened["people_1_name"], "Jane")
        self.assertEqual(flattened["people_1_age"], 25)
    
    def test_transform_json_response(self):
        # Arrange
        input_data = {
            "topics": ["finance", "business"],
            "entities": ["quarterly earnings", "revenue growth"],
            "summary": "This is a summary of the document.",
            "sentiment": "positive",
            "confidence": 0.95,
            "extra_field": "This should be ignored"
        }
        
        # Act
        transformed = transform_json_response(input_data)
        
        # Assert
        self.assertEqual(transformed["topics"], ["finance", "business"])
        self.assertEqual(transformed["entities"], ["quarterly earnings", "revenue growth"])
        self.assertEqual(transformed["summary"], "This is a summary of the document.")
        self.assertEqual(transformed["sentiment"], "positive")
        self.assertEqual(transformed["confidence_score"], 0.95)
        self.assertNotIn("extra_field", transformed)
    
    def test_transform_json_response_with_missing_fields(self):
        # Arrange
        input_data = {
            "summary": "Just a summary with no other fields"
        }
        
        # Act
        transformed = transform_json_response(input_data)
        
        # Assert
        self.assertEqual(transformed["summary"], "Just a summary with no other fields")
        self.assertEqual(transformed["topics"], [])
        self.assertEqual(transformed["entities"], [])
        self.assertEqual(transformed["sentiment"], "neutral")
        self.assertEqual(transformed["confidence_score"], 0.0)
    
    def test_transform_json_response_with_type_mismatch(self):
        # Arrange
        input_data = {
            "topics": "finance,business",  # String instead of list
            "entities": "quarterly earnings",  # String instead of list
            "summary": ["Point 1", "Point 2"],  # List instead of string
            "sentiment": "positive"
        }
        
        # Act
        transformed = transform_json_response(input_data)
        
        # Assert
        self.assertEqual(transformed["topics"], ["finance", "business"])
        self.assertEqual(transformed["entities"], ["quarterly earnings"])
        self.assertEqual(transformed["summary"], "['Point 1', 'Point 2']")
        self.assertEqual(transformed["sentiment"], "positive")

if __name__ == '__main__':
    unittest.main()
