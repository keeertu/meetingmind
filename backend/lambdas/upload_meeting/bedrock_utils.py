import json
import boto3
import os

bedrock_runtime = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_REGION_NAME', 'us-east-1'))

# Centralized Model ID as environment variable
DEFAULT_MODEL_ID = 'us.anthropic.claude-sonnet-4-20250514-v1:0'
MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', DEFAULT_MODEL_ID)
EMBEDDING_MODEL_ID = 'amazon.titan-embed-text-v1'


import re
import time
from botocore.exceptions import ClientError

def _retry_bedrock_op(operation, *args, **kwargs):
    max_retries = 4
    base_delay = 1.0
    
    for attempt in range(max_retries):
        try:
            return operation(*args, **kwargs)
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            # Handle rate limiting and transient Bedrock errors
            if error_code in ['ThrottlingException', 'ModelStreamErrorException', 'InternalServerException', 'ModelNotReadyException', 'ServiceUnavailableException']:
                if attempt == max_retries - 1:
                    raise
                time.sleep(base_delay * (2 ** attempt))
            else:
                raise
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(base_delay * (2 ** attempt))

def invoke_claude(prompt, system_prompt, max_tokens=2000):
    """Invoke Claude via Bedrock"""
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "system": system_prompt,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.7
    }
    
    response = _retry_bedrock_op(
        bedrock_runtime.invoke_model,
        modelId=MODEL_ID,
        body=json.dumps(body)
    )
    
    response_body = json.loads(response['body'].read())
    return response_body['content'][0]['text']


def get_embedding(text):
    """Get embedding vector using Titan Embeddings G1"""
    body = {
        "inputText": text
    }
    
    response = _retry_bedrock_op(
        bedrock_runtime.invoke_model,
        modelId=EMBEDDING_MODEL_ID,
        body=json.dumps(body)
    )
    
    response_body = json.loads(response['body'].read())
    return response_body['embedding']


def parse_claude_json(response_text, retry_prompt=None):
    """Parse Claude response as JSON with strict extraction via regex and one retry on failure"""
    text = response_text.strip()
    
    # Extract JSON object from the text using non-greedy regex
    # Matches the first { to the last } found in the string
    # This handles cases where Claude includes preamble or concluding text.
    try:
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        
        if json_match:
            extracted_json = json_match.group(0)
            parsed = json.loads(extracted_json)
            
            # Validation: ensure expected keys are present to distinguish from random JSON
            required_keys = ['relevance', 'quick_scan', 'standard_briefing']
            if all(key in parsed for key in required_keys):
                return parsed, None
            else:
                return None, "RETRY_NEEDED"
        else:
            return None, "RETRY_NEEDED"
            
    except (json.JSONDecodeError, ValueError):
        if retry_prompt:
            return None, f"JSON parse failed after retry. Text: {text[:100]}..."
        return None, "RETRY_NEEDED"
