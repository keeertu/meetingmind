import json
import os
import sys

sys.path.insert(0, '/opt/python')

import boto3
# TEMPORARY - revert to Transcribe later
import requests as http_requests
from db import get_meeting, update_meeting_status
from s3_utils import get_json
from utils import format_duration, get_logger

logger = get_logger(__name__)

transcribe_client = boto3.client('transcribe')
lambda_client = boto3.client('lambda')


# TEMPORARY - revert to Transcribe later
def poll_assemblyai_job(transcript_id):
    """Poll AssemblyAI transcription job status"""
    try:
        response = http_requests.get(
            f'https://api.assemblyai.com/v2/transcript/{transcript_id}',
            headers={
                'authorization': '64e179b62f9549ce8a49b872a1c30c78'
            }
        )
        
        result = response.json()
        status = result.get('status')
        
        # Handle unexpected status strings - log but don't crash
        known_statuses = ['completed', 'error', 'queued', 'processing']
        if status not in known_statuses:
            logger.warning(f"Unknown AssemblyAI status '{status}' for transcript {transcript_id}, treating as processing")
            return 'TRANSCRIBING', None, None
        
        if status == 'completed':
            # Build speaker-labeled transcript
            utterances = result.get('utterances', [])
            if utterances:
                # Format with speaker labels for better role-conditioned analysis by Claude
                text = '\n'.join([
                    f"Speaker {u.get('speaker', 'Unknown')}: {u.get('text', '')}"
                    for u in utterances
                ])
            else:
                text = result.get('text', '')
            
            # Build word-level timestamps from words array
            words_with_timestamps = []
            for word in result.get('words', []):
                words_with_timestamps.append({
                    'start': float(word.get('start', 0)) / 1000.0,  # Convert ms to seconds
                    'end': float(word.get('end', 0)) / 1000.0,
                    'text': word.get('text', '')
                })
            
            return 'COMPLETED', text, words_with_timestamps
        elif status == 'error':
            error_msg = result.get('error', 'Unknown error')
            logger.error(f"AssemblyAI error: {error_msg}")
            return 'FAILED', None, None
        else:
            # queued or processing
            return 'TRANSCRIBING', None, None
            
    except Exception as e:
        logger.error(f"Error polling AssemblyAI job {transcript_id}: {str(e)}")
        return 'TRANSCRIBING', None, None


def lambda_handler(event, context):
    """Poll transcription job status and trigger analysis when complete"""
    meeting_id = None
    try:
        # Get meeting ID from path
        meeting_id = event.get('pathParameters', {}).get('meetingId')
        if not meeting_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing meetingId'})
            }
        
        # Get meeting from DynamoDB
        meeting = get_meeting(meeting_id)
        if not meeting:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Meeting not found'})
            }
        
        # If already complete or analyzing, return current status
        if meeting.get('status') in ['COMPLETE', 'COMPLETED', 'ANALYZING']:
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'meetingId': meeting_id,
                    'status': meeting.get('status')
                })
            }
        
        # TEMPORARY - revert to Transcribe later
        # Poll AssemblyAI job status
        transcript_id = meeting.get('transcribeJobName')
        if not transcript_id:
            logger.error(f"Missing transcribeJobName for meeting {meeting_id}")
            update_meeting_status(meeting_id, 'FAILED', {'error_message': 'Missing transcript job ID'})
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing transcript job ID'})
            }
            
        job_status, transcript_text, words_with_timestamps = poll_assemblyai_job(transcript_id)
        
        if job_status == 'COMPLETED':
            # Calculate duration
            duration_seconds = words_with_timestamps[-1]['end'] if words_with_timestamps else 0
            duration = format_duration(duration_seconds)
            
            # Conditional Update: Only advance if still TRANSCRIBING to prevent duplicate invoke
            success = update_meeting_status(meeting_id, 'ANALYZING', {
                'transcriptRaw': transcript_text,
                'transcriptWithTimestamps': words_with_timestamps,
                'duration': duration
            }, expected_status='TRANSCRIBING')
            
            if not success:
                logger.info(f"Meeting {meeting_id} already advanced from TRANSCRIBING. Skipping async invocation.")
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'meetingId': meeting_id,
                        'status': 'ANALYZING'
                    })
                }
            
            # Invoke analyze_meeting Lambda asynchronously
            try:
                lambda_client.invoke(
                    FunctionName='meetingmind-analyze-meeting',
                    InvocationType='Event',
                    Payload=json.dumps({
                        'meetingId': meeting_id
                    })
                )
                logger.info(f"Successfully invoked analyze_meeting for {meeting_id}")
            except Exception as invoke_e:
                logger.error(f"Failed to invoke analyze_meeting for {meeting_id}: {str(invoke_e)}")
                # Retry once after 2 seconds
                try:
                    import time
                    time.sleep(2)
                    lambda_client.invoke(
                        FunctionName='meetingmind-analyze-meeting',
                        InvocationType='Event',
                        Payload=json.dumps({
                            'meetingId': meeting_id
                        })
                    )
                    logger.info(f"Successfully invoked analyze_meeting for {meeting_id} on retry")
                except Exception as retry_e:
                    logger.error(f"Failed to invoke analyze_meeting for {meeting_id} on retry: {str(retry_e)}")
                    update_meeting_status(meeting_id, 'FAILED', {'error_message': 'Failed to start analysis phase'})
                    return {
                        'statusCode': 500,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Failed to start analysis phase'})
                    }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'meetingId': meeting_id,
                    'status': 'ANALYZING'
                })
            }
        
        # TEMPORARY DISABLED - revert to Transcribe later
        # # Check Transcribe job status
        # job_name = meeting['transcribeJobName']
        # response = transcribe_client.get_transcription_job(TranscriptionJobName=job_name)
        # job = response['TranscriptionJob']
        # job_status = job['TranscriptionJobStatus']
        # 
        # if job_status == 'COMPLETED':
        #     # Download transcript from S3
        #     transcript_key = f"transcripts/{meeting_id}.json"
        #     transcript_data = get_json(transcript_key)
        #     
        #     if not transcript_data or 'results' not in transcript_data:
        #         logger.error(f"Transcript data missing or malformed for {meeting_id}")
        #         return {
        #             'statusCode': 500,
        #             'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        #             'body': json.dumps({'error': 'Transcript data unavailable'})
        #         }
        #     
        #     # Extract transcript text and word-level timestamps
        #     results = transcript_data.get('results', {})
        #     transcript_text = results.get('transcripts', [{}])[0].get('transcript', '')
        #     
        #     # Extract word-level timestamps
        #     words_with_timestamps = []
        #     for item in results.get('items', []):
        #         if item.get('type') == 'pronunciation':
        #             words_with_timestamps.append({
        #                 'start': float(item.get('start_time', 0)),
        #                 'end': float(item.get('end_time', 0)),
        #                 'text': item.get('alternatives', [{}])[0].get('content', '')
        #             })
        #     
        #     # Calculate duration
        #     duration_seconds = words_with_timestamps[-1]['end'] if words_with_timestamps else 0
        #     duration = format_duration(duration_seconds)
        
        elif job_status == 'FAILED':
            update_meeting_status(meeting_id, 'FAILED', {'error_message': 'Transcription failed'})
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'meetingId': meeting_id,
                    'status': 'FAILED',
                    'error': 'Transcription failed'
                })
            }
        
        else:
            # Still in progress
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'meetingId': meeting_id,
                    'status': 'TRANSCRIBING'
                })
            }
        
    except Exception as e:
        logger.error(f"Error in poll_transcription: {str(e)}", exc_info=True)
        # Attempt to mark as FAILED if we have meeting_id
        if meeting_id:
            try:
                update_meeting_status(meeting_id, 'FAILED', {'error_message': f'Polling error: {str(e)}'})
            except Exception as update_e:
                logger.error(f"Failed to update meeting status to FAILED: {str(update_e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Internal server error'})
        }
