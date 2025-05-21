import unittest

def test_suite():
    """Create a test suite with all the test cases"""
    from test_analysis_function import TestAnalysisFunction
    from test_json_helpers import TestJsonHelpers
    from test_retry_helpers import TestRetryHelpers

    suite = unittest.TestSuite()
    
    # Add all test cases
    suite.addTest(unittest.makeSuite(TestAnalysisFunction))
    suite.addTest(unittest.makeSuite(TestJsonHelpers))
    suite.addTest(unittest.makeSuite(TestRetryHelpers))
    
    return suite

if __name__ == '__main__':
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(test_suite())
