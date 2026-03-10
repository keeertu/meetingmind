import pytest
import sys
import os
import json
from unittest.mock import patch, MagicMock

# Set dummy environment variables for testing before imports
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'
os.environ['AWS_REGION_NAME'] = 'us-east-1'
os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
os.environ['AWS_SECURITY_TOKEN'] = 'testing'
os.environ['AWS_SESSION_TOKEN'] = 'testing'
os.environ['RECORDINGS_BUCKET'] = 'test-bucket'
os.environ['MEETINGS_TABLE'] = 'test-meetings'
os.environ['PROFILES_TABLE'] = 'test-profiles'

# Add shared utilities and relevant lambdas to path for testing
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(base_dir, 'shared'))
sys.path.insert(0, os.path.join(base_dir, 'lambdas', 'analyze_meeting'))

from bedrock_utils import parse_claude_json
from rag import retrieve_relevant_chunks
from db import _retry_dynamo_op

class TestBedrockUtils:
    def test_parse_claude_json_clean(self):
        """Test parsing valid clean JSON"""
        valid_json = '{"relevance": "High", "quick_scan": ["Point 1"], "standard_briefing": "Test"}'
        result, err = parse_claude_json(valid_json)
        assert err is None
        assert result['relevance'] == "High"
        
    def test_parse_claude_json_with_markdown(self):
        """Test stripping markdown fences"""
        markdown_json = '''Here is your result:
```json
{
    "relevance": "Medium",
    "quick_scan": ["Point A", "Point B"],
    "standard_briefing": "Test briefing"
}
```
Hope this helps!'''
        result, err = parse_claude_json(markdown_json)
        assert err is None
        assert result['relevance'] == "Medium"
        
    def test_parse_claude_json_invalid_schema(self):
        """Test failing when required keys are missing"""
        bad_json = '{"wrong_key": "High", "other": []}'
        result, err = parse_claude_json(bad_json)
        assert err == "RETRY_NEEDED"
        assert result is None
        
    def test_parse_claude_json_malformed(self):
        """Test totally invalid JSON"""
        bad_json = 'This is literally just text no brace anywhere'
        result, err = parse_claude_json(bad_json)
        assert err == "RETRY_NEEDED"
        assert result is None

class TestRAGUtils:
    def test_retrieve_relevant_chunks_filtering(self):
        """Test that chunks below threshold are dropped"""
        query_vector = [1.0, 0.0, 0.0]
        chunks = [{'id': 1}, {'id': 2}, {'id': 3}]
        # Embeddings: 1 is perfectly aligned, 2 is orthogonal (0), 3 is completely opposite (-1)
        embeddings = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [-1.0, 0.0, 0.0]]
        
        # High threshold should only keep the first one
        results = retrieve_relevant_chunks(query_vector, chunks, embeddings, top_k=5, threshold=0.5)
        assert len(results) == 1
        assert results[0] == {'id': 1}
        
    def test_retrieve_relevant_chunks_fallback(self):
        """Test that the best chunk is returned even if all fall below threshold"""
        query_vector = [1.0, 0.0, 0.0]
        chunks = [{'id': 1}, {'id': 2}]
        # Both are below 0.5 threshold (0.2 and 0)
        embeddings = [[0.2, 0.8, 0.0], [0.0, 1.0, 0.0]]
        
        results = retrieve_relevant_chunks(query_vector, chunks, embeddings, top_k=5, threshold=0.5)
        
        # Should fallback to the single best chunk
        assert len(results) == 1
        assert results[0] == {'id': 1}

class TestDBUtils:
    @patch('time.sleep', return_value=None) # Don't actually sleep in tests
    def test_dynamodb_retries(self, mock_sleep):
        """Test exponential backoff retries transient errors"""
        mock_op = MagicMock()
        
        # Fail twice with a retriable error, then succeed
        from botocore.exceptions import ClientError
        error_response = {'Error': {'Code': 'ProvisionedThroughputExceededException'}}
        mock_op.side_effect = [
            ClientError(error_response, 'PutItem'),
            ClientError(error_response, 'PutItem'),
            "Success!"
        ]
        
        result = _retry_dynamo_op(mock_op, max_retries=3)
        assert result == "Success!"
        assert mock_op.call_count == 3
        
    @patch('time.sleep', return_value=None)
    def test_dynamodb_fails_on_terminal_error(self, mock_sleep):
        """Test that non-transient errors bubble up immediately"""
        mock_op = MagicMock()
        
        from botocore.exceptions import ClientError
        error_response = {'Error': {'Code': 'ConditionalCheckFailedException'}}
        mock_op.side_effect = ClientError(error_response, 'UpdateItem')
        
        try:
            _retry_dynamo_op(mock_op)
            assert False, "Should have raised exception"
        except ClientError as e:
            assert e.response['Error']['Code'] == 'ConditionalCheckFailedException'
        assert mock_op.call_count == 1
