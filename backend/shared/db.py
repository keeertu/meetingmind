import os
import boto3
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')

def _get_table(table_key_env):
    """Lazy load DynamoDB table with fail-fast check"""
    table_name = os.environ.get(table_key_env)
    if not table_name:
        # In a real AWS environment, this must be set.
        # Fail fast with an informative error rather than returning a dummy table that fails later.
        raise EnvironmentError(f"Missing required environment variable: {table_key_env}")
    return dynamodb.Table(table_name)

def _get_profiles_table():
    return _get_table('PROFILES_TABLE')

def _get_meetings_table():
    return _get_table('MEETINGS_TABLE')




import time
from botocore.exceptions import ClientError

def _retry_dynamo_op(operation, *args, **kwargs):
    """Execute DynamoDB operation with exponential backoff retries"""
    max_retries = 5  # Increased for reliability
    base_delay = 0.5
    
    for attempt in range(max_retries):
        try:
            return operation(*args, **kwargs)
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            # Check specifically for conditional check failure
            if error_code == 'ConditionalCheckFailedException':
                raise  # Don't retry conditional failures, they are intentional checks
            
            if error_code in ['ProvisionedThroughputExceededException', 'ThrottlingException', 'InternalServerError']:
                if attempt == max_retries - 1:
                    raise
                time.sleep(base_delay * (2 ** attempt))
            else:
                raise
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(base_delay * (2 ** attempt))

def get_profile(user_id):
    """Fetch user profile from DynamoDB"""
    response = _retry_dynamo_op(_get_profiles_table().get_item, Key={'userId': user_id})
    return response.get('Item') if response else None


def save_profile(profile_dict):
    """Save or update user profile"""
    profile_dict['updatedAt'] = datetime.utcnow().isoformat() + 'Z'
    if 'createdAt' not in profile_dict:
        profile_dict['createdAt'] = profile_dict['updatedAt']
    _retry_dynamo_op(_get_profiles_table().put_item, Item=profile_dict)
    return profile_dict


def get_meeting(meeting_id):
    """Fetch meeting by ID"""
    response = _retry_dynamo_op(_get_meetings_table().get_item, Key={'meetingId': meeting_id})
    return response.get('Item') if response else None


def save_meeting(meeting_dict):
    """Save new meeting"""
    # Convert floats to Decimal for DynamoDB
    meeting_dict = _convert_floats_to_decimal(meeting_dict)
    _retry_dynamo_op(_get_meetings_table().put_item, Item=meeting_dict)
    return meeting_dict


def update_meeting_status(meeting_id, status, extra_fields=None, expected_status=None):
    """Update meeting status and optional extra fields. 
    If expected_status is provided, acts as a conditional check to prevent race conditions."""
    update_expr = "SET #status = :status"
    expr_attr_names = {"#status": "status"}
    expr_attr_values = {":status": status}
    condition_expr = None
    
    if expected_status:
        condition_expr = "#status = :expected_status"
        expr_attr_values[":expected_status"] = expected_status
    
    if extra_fields:
        extra_fields = _convert_floats_to_decimal(extra_fields)
        for key, value in extra_fields.items():
            # Avoid using reserved words by putting `#` directly
            safe_key = f"#{key}"
            update_expr += f", {safe_key} = :{key}"
            expr_attr_names[safe_key] = key
            expr_attr_values[f":{key}"] = value
    
    kwargs = {
        'Key': {'meetingId': meeting_id},
        'UpdateExpression': update_expr,
        'ExpressionAttributeNames': expr_attr_names,
        'ExpressionAttributeValues': expr_attr_values
    }
    
    if condition_expr:
        kwargs['ConditionExpression'] = condition_expr
        
    try:
        _retry_dynamo_op(_get_meetings_table().update_item, **kwargs)
        return True
    except ClientError as e:
        if e.response.get('Error', {}).get('Code') == 'ConditionalCheckFailedException':
            print(f"Failed conditional status update for meeting {meeting_id}. Expected {expected_status}, attempted to set {status}.")
            return False
        raise


def list_user_meetings(user_id):
    """List all meetings for a user, sorted by upload time"""
    response = _get_meetings_table().query(
        IndexName='userId-uploadedAt-index',
        KeyConditionExpression='userId = :userId',
        ExpressionAttributeValues={':userId': user_id},
        ScanIndexForward=False  # Descending order
    )
    return response.get('Items', [])


def _convert_floats_to_decimal(obj):
    """Recursively convert floats to Decimal for DynamoDB"""
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: _convert_floats_to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_convert_floats_to_decimal(item) for item in obj]
    return obj
