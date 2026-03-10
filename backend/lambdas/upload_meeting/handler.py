import json
import logging
import os
import sys
import base64
import mimetypes
import re
import uuid
from datetime import datetime

sys.path.insert(0, '/opt/python')

import boto3
# TEMPORARY - revert to Transcribe later
import requests as http_requests
from db import save_meeting, list_user_meetings
from s3_utils import upload_file
from utils import generate_meeting_id, get_logger

logger = get_logger(__name__)

transcribe_client = boto3.client('transcribe')
s3_client = boto3.client('s3')
bucket_name = os.environ.get('RECORDINGS_BUCKET')


# TEMPORARY - revert to Transcribe later
def start_assemblyai_job(s3_key):
    """Start AssemblyAI transcription job"""
    # Generate presigned URL so AssemblyAI can download the file from our private S3 bucket
    download_url = s3_client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': bucket_name,
            'Key': s3_key
        },
        ExpiresIn=21600  # 6 hours
    )
    
    response = http_requests.post(
        'https://api.assemblyai.com/v2/transcript',
        headers={
            'authorization': '64e179b62f9549ce8a49b872a1c30c78',
            'content-type': 'application/json'
        },
        json={
            'audio_url': download_url,
            'speaker_labels': True,
            'language_detection': True,
            'speech_models': ['universal-3-pro', 'universal-2']
        }
    )
    
    result = response.json()
    if 'id' not in result:
        raise Exception(f"AssemblyAI error: {result}")
    
    return result['id']


def check_duplicate_meeting(user_id, filename):
    """Check if a meeting with the same filename already exists for this user"""
    try:
        # Get filename without extension for comparison
        title_without_ext = filename.rsplit('.', 1)[0] if '.' in filename else filename
        
        # Get all meetings for this user
        meetings = list_user_meetings(user_id)
        
        # Check for duplicates (exclude FAILED meetings)
        for meeting in meetings:
            if meeting.get('status') == 'FAILED':
                continue
                
            meeting_title = meeting.get('title', '')
            # Compare titles without extensions
            meeting_title_clean = meeting_title.rsplit('.', 1)[0] if '.' in meeting_title else meeting_title
            
            if meeting_title_clean.lower() == title_without_ext.lower():
                return meeting.get('meetingId')
        
        return None
    except Exception as e:
        logger.error(f"Error checking for duplicate meetings: {str(e)}")
        return None


def handle_presigned_url(event):
    try:
        body = event.get('body', '{}')
        if event.get('isBase64Encoded'):
            body = base64.b64decode(body).decode('utf-8')
        
        data = json.loads(body)
        user_id = data.get('userId')
        if not user_id:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'userId is required'})
            }
            
        filename = data.get('filename', 'recording.wav')
        title = data.get('title')
        if not title:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'title is required'})
            }
        
        # Check for duplicate meetings
        duplicate_meeting_id = check_duplicate_meeting(user_id, filename)
        if duplicate_meeting_id:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({
                    'meetingId': duplicate_meeting_id,
                    'presignedUrl': None,
                    'duplicate': True,
                    'message': 'Meeting already exists'
                })
            }
        
        # Sanitize filename
        safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
        ext = safe_filename.rsplit('.', 1)[-1].lower() \
            if '.' in safe_filename else 'wav'
        
        meeting_id = str(uuid.uuid4())
        s3_key = f"recordings/{meeting_id}.{ext}"
        
        # Determine content type based on extension
        content_type_map = {
            'wav': 'audio/wav',
            'mp3': 'audio/mpeg',
            'mp4': 'video/mp4',
            'm4a': 'audio/mp4',
            'flac': 'audio/flac',
            'ogg': 'audio/ogg',
            'webm': 'audio/webm'
        }
        file_content_type = content_type_map.get(ext, 'audio/wav')
        
        # Generate presigned URL (1 hour expiry)
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket_name,
                'Key': s3_key,
                'ContentType': file_content_type
            },
            ExpiresIn=3600
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'presignedUrl': presigned_url,
                'meetingId': meeting_id,
                's3Key': s3_key,
                'title': title,
                'userId': user_id,
                'contentType': file_content_type
            })
        }
    except Exception as e:
        logger.error(f"Error generating presigned URL: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Failed to generate upload URL'})
        }


def handle_process(event):
    try:
        body = event.get('body', '{}')
        if event.get('isBase64Encoded'):
            body = base64.b64decode(body).decode('utf-8')
        
        data = json.loads(body)
        user_id = data.get('userId')
        if not user_id:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'userId is required'})
            }
            
        meeting_id = data.get('meetingId')
        s3_key = data.get('s3Key')
        title = data.get('title')
        
        if not meeting_id or not s3_key:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'meetingId and s3Key required'})
            }
            
        if not title:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'title is required'})
            }
        
        # TEMPORARY - revert to Transcribe later
        # Start AssemblyAI transcription job
        try:
            assemblyai_id = start_assemblyai_job(s3_key)
            transcribe_job_name = assemblyai_id
        except Exception as transcribe_e:
            logger.error(f"Failed to start transcription job: {str(transcribe_e)}")
            return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Failed to start transcription'})
            }
        
        # TEMPORARY DISABLED - revert to Transcribe later
        # # Get file extension from s3_key
        # ext = s3_key.rsplit('.', 1)[-1].lower() \
        #     if '.' in s3_key else 'wav'
        # 
        # # Determine media format for Transcribe
        # media_format_map = {
        #     'mp3': 'mp3', 'mp4': 'mp4', 'wav': 'wav',
        #     'm4a': 'mp4', 'flac': 'flac', 'ogg': 'ogg',
        #     'amr': 'amr', 'webm': 'webm'
        # }
        # media_format = media_format_map.get(ext, 'wav')
        # 
        # # Start Transcribe job
        # transcribe_job_name = f"meetingmind-{meeting_id}"
        # s3_uri = f"s3://{bucket_name}/{s3_key}"
        # 
        # transcribe_client.start_transcription_job(
        #     TranscriptionJobName=transcribe_job_name,
        #     Media={'MediaFileUri': s3_uri},
        #     MediaFormat=media_format,
        #     LanguageCode='en-US',
        #     OutputBucketName=bucket_name,
        #     OutputKey=f"transcripts/{meeting_id}.json"
        # )
        
        # Save meeting to DynamoDB
        meeting_data = {
            'meetingId': meeting_id,
            'userId': user_id,
            'title': title,
            'uploadedAt': datetime.utcnow().isoformat() + 'Z',
            'status': 'TRANSCRIBING',
            's3Key': s3_key,
            's3Bucket': bucket_name,
            'transcribeJobName': transcribe_job_name,
            'duration': '00:00:00'
        }
        
        try:
            save_meeting(meeting_data)
        except Exception as db_e:
            # Log DynamoDB error but still return meetingId so frontend can continue
            logger.error(f"Failed to save meeting to DynamoDB: {str(db_e)}")
            # Still return success so frontend can poll for status
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'meetingId': meeting_id,
                'status': 'TRANSCRIBING',
                'message': 'Processing started'
            })
        }
    except Exception as e:
        logger.error(f"Error in handle_process: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Failed to process meeting'})
        }


def lambda_handler(event, context):
    """Handle meeting upload and start transcription"""
    try:
        # Route handling
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        
        if path.endswith('/upload-url') and http_method == 'POST':
            return handle_presigned_url(event)
        
        if path.endswith('/process') and http_method == 'POST':
            return handle_process(event)
        
        # Original upload logic
        # Parse multipart form data
        content_type = event.get('headers', {}).get('content-type', '')
        body = event.get('body', '')
        is_base64 = event.get('isBase64Encoded', False)
        
        if is_base64:
            body = base64.b64decode(body)
        else:
            body = body.encode('utf-8')
        
        # Simple multipart parsing (for production, use proper library)
        # For now, expect JSON with base64 file
        try:
            data = json.loads(body if isinstance(body, str) else body.decode('utf-8'))
            file_b64 = data.get('file', '')
            if not file_b64:
                raise ValueError("Missing file data")
                
            # Security: Validate file size (20MB limit)
            # base64 size is approx 4/3 of original size
            if len(file_b64) > (20 * 1024 * 1024 * 1.4):
                return {
                    'statusCode': 413,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'File too large (max 20MB)'})
                }
                
            file_data = base64.b64decode(file_b64)
            
            # Validate required fields
            user_id = data.get('userId')
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'userId is required'})
                }
                
            title = data.get('title')
            if not title:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'title is required'})
                }
                
            filename = data.get('filename', 'recording.mp4')
            
            # Add user_id to log context
            logger = logging.LoggerAdapter(logger, {'user_id': user_id})
            
        except Exception as parse_err:
            logger.error(f"Failed to parse upload request: {str(parse_err)}")
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': str(parse_err) if isinstance(parse_err, ValueError) else 'Invalid request format'})
            }
        
        # Sanitize filename and meeting ID
        meeting_id = generate_meeting_id()
        safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
        
        # Determine file extension and media format
        ext = filename.split('.')[-1].lower()
        media_format_map = {
            'mp3': 'mp3',
            'mp4': 'mp4',
            'wav': 'wav',
            'm4a': 'mp4',
            'flac': 'flac',
            'ogg': 'ogg',
            'webm': 'webm'
        }
        media_format = media_format_map.get(ext, 'mp4')
        
        # Upload to S3
        s3_key = f"recordings/{meeting_id}.{ext}"
        content_type = mimetypes.guess_type(safe_filename)[0] or 'application/octet-stream'
        
        try:
            upload_file(file_data, s3_key, content_type)
        except Exception as s3_e:
            logger.error(f"S3 upload failed: {str(s3_e)}")
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'File upload failed'})
            }
        
        bucket_name = os.environ['RECORDINGS_BUCKET']
        
        # Save meeting to DynamoDB FIRST as TRANSCRIBING so we have a record if Transcribe fails
        transcribe_job_name = f"meetingmind-{meeting_id}"
        meeting_data = {
            'meetingId': meeting_id,
            'userId': user_id,
            'title': title,
            'uploadedAt': datetime.utcnow().isoformat() + 'Z',
            'status': 'TRANSCRIBING',
            's3Key': s3_key,
            's3Bucket': bucket_name,
            'transcribeJobName': transcribe_job_name,
            'duration': '00:00:00'
        }
        
        try:
            save_meeting(meeting_data)
        except Exception as db_e:
            # Log DynamoDB error but still return meetingId so frontend can continue
            logger.error(f"Failed to save meeting to DynamoDB after S3 upload: {str(db_e)}")
            # Still return success so frontend can poll for status
        
        # Start Transcribe job
        try:
            logger.info(f"Starting Transcribe job {transcribe_job_name}")
            transcribe_client.start_transcription_job(
                TranscriptionJobName=transcribe_job_name,
                Media={'MediaFileUri': f"s3://{bucket_name}/{s3_key}"},
                MediaFormat=media_format,
                LanguageCode='en-US',
                OutputBucketName=bucket_name,
                OutputKey=f"transcripts/{meeting_id}.json",
                Settings={
                    'ShowSpeakerLabels': False,
                    'MaxSpeakerLabels': 0
                }
            )
        except transcribe_client.exceptions.ConflictException:
            logger.warning(f"Transcribe job {transcribe_job_name} already exists. This might be a retry.")
            # We can either fail or assume it's fine. 
            # Since we already updated DynDB to TRANSCRIBING, we'll let it proceed.
        except Exception as transcribe_err:
            logger.error(f"Failed to start transcribe job: {str(transcribe_err)}")
            try:
                from db import update_meeting_status
                update_meeting_status(meeting_id, 'FAILED', {'error_message': 'Failed to start transcription'})
            except Exception as update_e:
                logger.error(f"Failed to update meeting status to FAILED: {str(update_e)}")
            raise transcribe_err
        
        logger.info(f"Successfully started meeting processing for {meeting_id}")
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'meetingId': meeting_id,
                'status': 'TRANSCRIBING'
            })
        }
        
    except Exception as e:
        # Fallback raw logger in case we failed before setting up LoggerAdapter
        if isinstance(logger, logging.LoggerAdapter):
            logger.error(f"Error handling upload: {str(e)}", exc_info=True)
        else:
            get_logger(__name__).error(f"Error handling upload: {str(e)}", exc_info=True)
            
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Internal server error'})
        }
