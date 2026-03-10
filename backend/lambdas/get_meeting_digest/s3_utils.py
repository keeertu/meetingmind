import os
import json
import boto3

def _get_bucket_name():
    """Lazy load bucket name from environment with fail-fast"""
    bucket = os.environ.get('RECORDINGS_BUCKET')
    if not bucket:
        raise EnvironmentError("Missing required environment variable: RECORDINGS_BUCKET")
    return bucket

s3_client = boto3.client('s3')


import time
from botocore.exceptions import ClientError

def _retry_s3_op(operation, *args, **kwargs):
    max_retries = 3
    base_delay = 0.5
    
    for attempt in range(max_retries):
        try:
            return operation(*args, **kwargs)
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            # Don't retry NoSuchKey as it means the file genuinely doesn't exist yet
            if error_code == 'NoSuchKey':
                raise
                
            if error_code in ['SlowDown', 'InternalError', 'ServiceUnavailable', 'RequestTimeout', 'InternalServerError']:
                if attempt == max_retries - 1:
                    raise
                time.sleep(base_delay * (2 ** attempt))
            else:
                raise
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(base_delay * (2 ** attempt))


def upload_file(file_bytes, key, content_type='application/octet-stream'):
    """Upload file bytes to S3"""
    _retry_s3_op(
        s3_client.put_object,
        Bucket=_get_bucket_name(),
        Key=key,
        Body=file_bytes,
        ContentType=content_type
    )
    return f"s3://{_get_bucket_name()}/{key}"


def get_file(key):
    """Download file from S3"""
    response = _retry_s3_op(s3_client.get_object, Bucket=_get_bucket_name(), Key=key)
    return response['Body'].read()


def upload_json(data, key):
    """Upload JSON data to S3"""
    _retry_s3_op(
        s3_client.put_object,
        Bucket=_get_bucket_name(),
        Key=key,
        Body=json.dumps(data),
        ContentType='application/json'
    )


def get_json(key):
    """Download and parse JSON from S3"""
    try:
        response = _retry_s3_op(s3_client.get_object, Bucket=_get_bucket_name(), Key=key)
        return json.loads(response['Body'].read())
    except ClientError as e:
        if e.response.get('Error', {}).get('Code') == 'NoSuchKey':
            return None
        raise
    except s3_client.exceptions.NoSuchKey:
        return None
