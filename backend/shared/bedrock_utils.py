import json
import boto3
import os

bedrock_runtime = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_REGION_NAME', 'us-east-1'))

# Centralized Model ID as environment variable
DEFAULT_MODEL_ID = 'us.amazon.nova-pro-v1:0'
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
            error_msg = e.response.get('Error', {}).get('Message', str(e))
            
            # Log every retry attempt with the error reason
            if attempt < max_retries - 1:
                print(f"Bedrock operation retry {attempt + 1}/{max_retries}: {error_code} - {error_msg}")
            
            # Handle rate limiting and transient Bedrock errors
            if error_code in ['ThrottlingException', 'ModelStreamErrorException', 'InternalServerException', 'ModelNotReadyException', 'ServiceUnavailableException']:
                if attempt == max_retries - 1:
                    raise Exception(f"Bedrock operation failed after {max_retries} retries: {error_code} - {error_msg}")
                time.sleep(base_delay * (2 ** attempt))
            else:
                raise Exception(f"Bedrock operation failed: {error_code} - {error_msg}")
        except Exception as e:
            # Log every retry attempt with the error reason
            if attempt < max_retries - 1:
                print(f"Bedrock operation retry {attempt + 1}/{max_retries}: {str(e)}")
            
            if attempt == max_retries - 1:
                raise Exception(f"Bedrock operation failed after {max_retries} retries: {str(e)}")
            time.sleep(base_delay * (2 ** attempt))

def invoke_claude(prompt, system_prompt, max_tokens=2000):
    """Invoke Nova via Bedrock"""
    model_id = "us.amazon.nova-pro-v1:0"
    
    request_body = {
        "schemaVersion": "messages-v1",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "text": prompt
                    }
                ]
            }
        ],
        "system": [
            {
                "text": system_prompt
            }
        ],
        "inferenceConfig": {
            "maxTokens": max_tokens,
            "temperature": 0.1
        }
    }
    
    try:
        response = _retry_bedrock_op(
            bedrock_runtime.invoke_model,
            modelId=model_id,
            body=json.dumps(request_body)
        )
        
        response_body = json.loads(response['body'].read())
        
        # If response body is malformed, raise ValueError with raw response for debugging
        if 'output' not in response_body:
            raise ValueError(f"Malformed response body from {model_id}: {response_body}")
            
        if 'message' not in response_body.get('output', {}):
            raise ValueError(f"Malformed response body from {model_id}: {response_body}")
            
        if 'content' not in response_body['output'].get('message', {}):
            raise ValueError(f"Malformed response body from {model_id}: {response_body}")
            
        content = response_body['output']['message']['content']
        if not content or not isinstance(content, list) or len(content) == 0:
            raise ValueError(f"Malformed response body from {model_id}: {response_body}")
            
        if 'text' not in content[0]:
            raise ValueError(f"Malformed response body from {model_id}: {response_body}")
        
        response_text = content[0]['text']
        return response_text
        
    except Exception as e:
        # If invoke_claude fails after all retries, raise a clear exception with the model ID and error
        raise Exception(f"Failed to invoke {model_id}: {str(e)}")


def get_embedding(text):
    """Get embedding vector using Titan Embeddings G1"""
    body = {
        "inputText": text
    }
    
    try:
        response = _retry_bedrock_op(
            bedrock_runtime.invoke_model,
            modelId=EMBEDDING_MODEL_ID,
            body=json.dumps(body)
        )
        
        response_body = json.loads(response['body'].read())
        
        # If response body is malformed, raise ValueError with raw response for debugging
        if 'embedding' not in response_body:
            raise ValueError(f"Malformed embedding response from {EMBEDDING_MODEL_ID}: {response_body}")
            
        return response_body['embedding']
        
    except Exception as e:
        # If get_embedding fails after all retries, raise a clear exception with the model ID and error
        raise Exception(f"Failed to get embedding from {EMBEDDING_MODEL_ID}: {str(e)}")


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
