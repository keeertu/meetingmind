import json
import os

from db import get_meeting
from utils import get_logger

logger = get_logger(__name__)


def lambda_handler(event, context):
    """Get meeting digest"""
    try:
        meeting_id = event.get('pathParameters', {}).get('meetingId')
        
        # User Scoping Prep
        query_params = event.get('queryStringParameters') or {}
        user_id = query_params.get('userId', 'demo-user')
            
        if not meeting_id:
            logger.warning("Missing meetingId in request")
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing meetingId'})
            }
        
        meeting = get_meeting(meeting_id)
        
        if not meeting:
            logger.warning(f"Meeting {meeting_id} not found")
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Meeting not found'})
            }
            
        # Enforce scoping
        if meeting.get('userId') != user_id:
            logger.warning(f"Unauthorized access attempt by {user_id} for meeting {meeting_id}")
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Unauthorized'})
            }
        
        # Remove embedding vectors if present (they're in S3)
        # Keep chunks metadata but remove any embedding data
        if 'chunks' in meeting:
            for chunk in meeting.get('chunks', []):
                if isinstance(chunk, dict):
                    chunk.pop('embedding', None)
        
        # If digest field is missing or malformed, return meeting data anyway with digest: null
        if 'digest' not in meeting or meeting.get('digest') is None:
            meeting['digest'] = None
            logger.warning(f"Meeting {meeting_id} has missing or null digest field")
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(meeting, default=str)
        }
        
    except Exception as e:
        logger.error(f"Error fetching meeting digest: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Internal server error'})
        }
