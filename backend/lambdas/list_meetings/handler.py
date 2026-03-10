import json
import os

from db import list_user_meetings
from utils import get_logger

logger = get_logger(__name__)


def lambda_handler(event, context):
    """List all meetings for a user"""
    try:
        user_id = event.get('queryStringParameters', {}).get('userId')
        
        if not user_id:
            logger.warning("Missing userId in request, falling back to demo-user")
            user_id = 'demo-user'
        meetings = list_user_meetings(user_id)
        
        # Return preview data only (not full transcript)
        preview_meetings = []
        for meeting in meetings:
            preview = {
                'meetingId': meeting.get('meetingId'),
                'title': meeting.get('title'),
                'uploadedAt': meeting.get('uploadedAt'),
                'status': meeting.get('status'),
                'duration': meeting.get('duration'),
            }
            
            # Add digest preview if available
            if 'digest' in meeting:
                digest = meeting['digest']
                preview['digest'] = {
                    'relevance': digest.get('relevance'),
                    'relevance_score': digest.get('relevance_score'),
                    'why_this_matters': digest.get('why_this_matters'),
                    'quick_scan': digest.get('quick_scan', [])[:3]  # First 3 bullets only
                }
            
            preview_meetings.append(preview)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'meetings': preview_meetings}, default=str)
        }
        
    except Exception as e:
        logger.error(f"Error listing meetings: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
