import json
import os

from db import get_profile
from utils import get_logger

logger = get_logger(__name__)


def lambda_handler(event, context):
    """Get user profile"""
    try:
        user_id = event.get('pathParameters', {}).get('userId')
        if not user_id:
            user_id = event.get('queryStringParameters', {}).get('userId')
            
        if not user_id:
            logger.warning("Missing userId in request")
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing userId'})
            }
        
        profile = get_profile(user_id)
        
        if not profile:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Profile not found'})
            }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(profile)
        }
        
    except Exception as e:
        logger.error(f"Error getting profile: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
