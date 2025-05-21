import json
import logging
from functools import wraps
import time

def retry_with_exponential_backoff(max_retries=3, backoff_in_seconds=1):
    """
    Decorator for implementing exponential backoff retry logic for functions
    that might encounter transient errors (like Azure OpenAI rate limits)
    
    Args:
        max_retries: Maximum number of retries before giving up
        backoff_in_seconds: Initial backoff in seconds (will increase exponentially)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            retries = 0
            wait_time = backoff_in_seconds
            
            while retries < max_retries:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    retries += 1
                    if retries >= max_retries:
                        logging.error(f"Max retries ({max_retries}) exceeded. Function {func.__name__} failed.")
                        raise
                    
                    # Calculate wait time with exponential backoff
                    wait_time = backoff_in_seconds * (2 ** (retries - 1))
                    
                    # Add some randomness to prevent thundering herd problem
                    import random
                    wait_time = wait_time + (wait_time * random.uniform(0, 0.1))
                    
                    logging.warning(f"Attempt {retries} failed with error: {str(e)}. Retrying in {wait_time:.2f} seconds...")
                    time.sleep(wait_time)
            
        return wrapper
    
    return decorator

def batch_cosmos_db_items(items, batch_size=100):
    """
    Helper function to batch items for efficient Cosmos DB writes
    to avoid exceeding request unit limits
    
    Args:
        items: List of items to batch
        batch_size: Size of each batch (default 100)
    
    Returns:
        List of batched items
    """
    return [items[i:i + batch_size] for i in range(0, len(items), batch_size)]
