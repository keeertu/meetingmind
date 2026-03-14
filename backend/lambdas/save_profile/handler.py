import json
import logging
import os

from db import save_profile
from utils import get_logger, get_user_id_from_token

# Set up detailed logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Define CORS headers to use consistently
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
}

def lambda_handler(event, context):
    """Save or update user profile"""
    
    # Log the entire event for debugging
    logger.info(f"Event: {json.dumps(event)}")
    
    # Handle preflight OPTIONS request
    if event.get("httpMethod") == "OPTIONS":
        logger.info("Handling OPTIONS preflight request")
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": ""
        }
    
    try:
        # Get user ID from Cognito JWT token
        user_id = get_user_id_from_token(event)
        if not user_id:
            logger.warning("Missing or invalid authentication token")
            return {
                'statusCode': 401,
                'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Unauthorized'})
            }
        
        # Parse request body
        body_str = event.get('body', '{}')
        logger.info(f"Raw body: {body_str}")
        
        try:
            body = json.loads(body_str)
            logger.info(f"Parsed body: {json.dumps(body)}")
        except Exception as e:
            logger.error(f"Body parse error: {e}")
            return {
                'statusCode': 400,
                'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Invalid JSON in request body'})
            }
        
        # Add userId to the body
        body['userId'] = user_id
        logger.info(f"Added userId to body: {user_id}")
        
        # Validate other required fields
        name = body.get('name')
        role = body.get('role')
        if not name or not role:
            logger.warning(f"Missing required fields - name: {name}, role: {role}")
            return {
                'statusCode': 400,
                'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Missing required fields: name and role'})
            }
        
        logger.info(f"Saving profile for user: {user_id}")
        
        # Save profile
        profile = save_profile(body)
        logger.info(f"Profile saved successfully: {json.dumps(profile, default=str)}")
        
        return {
            'statusCode': 200,
            'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
            'body': json.dumps(profile, default=str)
        }
        
    except Exception as e:
        logger.error(f"Error saving profile: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }
