import unittest
import sys
import os
import time
from unittest.mock import patch, MagicMock

# Add the parent directory to the path so we can import the function code
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from SharedCode.retry_helpers import retry_with_exponential_backoff, batch_cosmos_db_items

class TestRetryHelpers(unittest.TestCase):
    @patch('time.sleep')  # Mock sleep to make tests faster
    def test_retry_decorator_success_first_try(self, mock_sleep):
        # Arrange
        mock_function = MagicMock(return_value="success")
        decorated_function = retry_with_exponential_backoff()(mock_function)
        
        # Act
        result = decorated_function("arg1", kwarg1="kwarg1")
        
        # Assert
        self.assertEqual(result, "success")
        mock_function.assert_called_once_with("arg1", kwarg1="kwarg1")
        mock_sleep.assert_not_called()

    @patch('time.sleep')  # Mock sleep to make tests faster
    def test_retry_decorator_success_after_retries(self, mock_sleep):
        # Arrange
        mock_function = MagicMock(side_effect=[
            Exception("Temporary failure"),
            Exception("Still failing"),
            "success"  # Succeeds on third try
        ])
        
        decorated_function = retry_with_exponential_backoff(max_retries=3, backoff_in_seconds=1)(mock_function)
        
        # Act
        result = decorated_function()
        
        # Assert
        self.assertEqual(result, "success")
        self.assertEqual(mock_function.call_count, 3)
        # Should have slept twice (after first and second failures)
        self.assertEqual(mock_sleep.call_count, 2)
        
        # Verify exponential backoff timing
        # First sleep should be ~1 second (plus small random factor)
        self.assertGreaterEqual(mock_sleep.call_args_list[0][0][0], 1.0)
        self.assertLess(mock_sleep.call_args_list[0][0][0], 1.2)  # Account for randomness
        
        # Second sleep should be ~2 seconds (plus small random factor)
        self.assertGreaterEqual(mock_sleep.call_args_list[1][0][0], 2.0)
        self.assertLess(mock_sleep.call_args_list[1][0][0], 2.4)  # Account for randomness
    
    @patch('time.sleep')  # Mock sleep to make tests faster
    def test_retry_decorator_max_retries_exceeded(self, mock_sleep):
        # Arrange
        exception = Exception("Persistent failure")
        mock_function = MagicMock(side_effect=exception)
        
        decorated_function = retry_with_exponential_backoff(max_retries=3, backoff_in_seconds=1)(mock_function)
        
        # Act & Assert
        with self.assertRaises(Exception) as context:
            decorated_function()
        
        # Verify the same exception is raised after max retries
        self.assertEqual(str(context.exception), "Persistent failure")
        self.assertEqual(mock_function.call_count, 4)  # Initial + 3 retries
        self.assertEqual(mock_sleep.call_count, 3)  # Should have slept 3 times
    
    def test_batch_cosmos_db_items(self):
        # Arrange
        items = [i for i in range(250)]
        
        # Act
        batches = batch_cosmos_db_items(items)
        batches_custom_size = batch_cosmos_db_items(items, batch_size=50)
        
        # Assert
        self.assertEqual(len(batches), 3)  # Default batch size is 100, so we get 3 batches
        self.assertEqual(len(batches[0]), 100)
        self.assertEqual(len(batches[1]), 100)
        self.assertEqual(len(batches[2]), 50)
        
        self.assertEqual(len(batches_custom_size), 5)  # With batch size 50, we get 5 batches
        for i in range(5):
            expected_size = 50 if i < 4 else 50
            self.assertEqual(len(batches_custom_size[i]), expected_size)

if __name__ == '__main__':
    unittest.main()
