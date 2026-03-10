import json
import logging
import os

from db import save_profile
from utils import get_logger

logger = get_logger(__name__)


def lambda_handler(event, context):
    """Save or update user profile"""
    try:
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('userId')
        
        if user_id:
            logger = logging.LoggerAdapter(logger, {'user_id': user_id})
        
        # Validate required fields
        if not user_id:
            logger.warning("Missing userId in save_profile request")
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing userId'})
            }
        
        # Save profile
        profile = save_profile(body)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(profile)
        }
        
    except Exception as e:
        # Avoid logger adapter crash if parser failed
        if isinstance(logger, logging.LoggerAdapter):
            logger.error(f"Error saving profile: {str(e)}", exc_info=True)
        else:
            get_logger(__name__).error(f"Error saving profile: {str(e)}", exc_info=True)
            
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
