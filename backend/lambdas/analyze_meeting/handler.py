import json
import logging
import os
import sys

sys.path.insert(0, '/opt/python')

from db import get_meeting, get_profile, update_meeting_status
from bedrock_utils import invoke_claude, parse_claude_json
from prompts import SYSTEM_PROMPT, build_user_prompt, FALLBACK_DIGEST
from rag import chunk_and_embed_transcript, embed_profile, retrieve_relevant_chunks, save_embeddings_to_s3, load_embeddings_from_s3
from utils import get_logger, get_user_id_from_token

logger = get_logger(__name__)


def lambda_handler(event, context):
    """Analyze meeting and generate personalized digest"""
    meeting_id = None
    try:
        # Check if this is a direct invocation (from poll_transcription) or API call
        if 'body' in event and event.get('httpMethod'):
            # API call - could be analyze-text endpoint
            # Get user ID from Cognito JWT token for authorization
            authenticated_user_id = get_user_id_from_token(event)
            if not authenticated_user_id:
                logger.warning("Missing or invalid authentication token")
                return error_response('Unauthorized', 401)
                
            try:
                body = json.loads(event['body'])
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in request body: {str(e)}")
                return error_response('Invalid JSON in request body', 400)
                
            path_params = event.get('pathParameters') or {}
            meeting_id = path_params.get('meetingId')
            
            # Check if this is analyze-text endpoint
            if not meeting_id and 'transcript_text' in body:
                return handle_analyze_text(body)
            
            if not meeting_id:
                return error_response('Missing meetingId', 400)
        else:
            # Direct invocation from poll_transcription
            meeting_id = event.get('meetingId')
            authenticated_user_id = None  # No auth check for internal calls
            if not meeting_id:
                logger.error("No meetingId provided in direct invocation")
                return error_response('Missing meetingId', 400)
        
        # Get meeting from DynamoDB
        try:
            meeting = get_meeting(meeting_id)
        except Exception as e:
            logger.error(f"Failed to retrieve meeting {meeting_id}: {str(e)}")
            return error_response('Failed to retrieve meeting data', 500)
            
        if not meeting:
            return error_response('Meeting not found', 404)
        
        # For API calls, verify the authenticated user owns this meeting
        if authenticated_user_id and meeting.get('userId') != authenticated_user_id:
            logger.warning(f"Unauthorized access attempt by {authenticated_user_id} for meeting {meeting_id}")
            return error_response('Forbidden', 403)
        
        # Get user profile
        user_id = meeting.get('userId')
        if not user_id:
            logger.error(f"Meeting {meeting_id} has no userId field")
            return error_response('Meeting has no associated user', 400)
        try:
            profile = get_profile(user_id)
        except Exception as e:
            logger.error(f"Failed to retrieve profile for user {user_id}: {str(e)}")
            return error_response('Failed to retrieve user profile', 500)
            
        if not profile:
            return error_response('User profile not found', 404)
        
        # Get transcript - defensive field access
        transcript_text = meeting.get('transcriptRaw', '')
        words_array = meeting.get('transcriptWithTimestamps', [])
        title = meeting.get('title', 'Untitled Meeting')
        duration = meeting.get('duration', '00:00:00')
        
        if not transcript_text:
            logger.error(f"Transcript not available for meeting {meeting_id}")
            try:
                update_meeting_status(meeting_id, 'FAILED', {'error_message': 'Transcript not available'})
            except Exception as update_err:
                logger.error(f"Failed to update meeting status to FAILED: {str(update_err)}")
            return error_response('Transcript not available', 400)
            
        # Security: Validate transcript length (max 500k chars for Bedrock context safety)
        if len(transcript_text) > 500000:
            logger.warning(f"Transcript too long ({len(transcript_text)}), truncating for analysis")
            transcript_text = transcript_text[:500000]
        
        # Check if embeddings already exist (duplicate execution protection)
        try:
            embeddings = load_embeddings_from_s3(meeting_id)
        except Exception as e:
            logger.warning(f"Failed to load embeddings from S3: {str(e)}")
            embeddings = None
            
        chunks = meeting.get('chunks')
        
        if embeddings and chunks:
            logger.info("Embeddings and chunks already exist, skipping regeneration")
        else:
            # Run RAG pipeline
            try:
                logger.info("Chunking and embedding transcript...")
                chunks, embeddings = chunk_and_embed_transcript(transcript_text, words_array)
                logger.info("Saving embeddings to S3...")
                save_embeddings_to_s3(meeting_id, {'chunks': chunks, 'embeddings': embeddings})
                
                # Save chunks immediately so we have them if Bedrock fails
                update_meeting_status(meeting_id, 'ANALYZING', {
                    'chunks': chunks
                })
            except Exception as e:
                logger.error(f"Failed during RAG pipeline: {str(e)}")
                try:
                    update_meeting_status(meeting_id, 'FAILED', {'error_message': f'RAG pipeline failed: {str(e)}'})
                except Exception as update_err:
                    logger.error(f"Failed to update meeting status to FAILED: {str(update_err)}")
                return error_response(f'RAG pipeline failed: {str(e)}', 500)
        
        try:
            logger.info("Embedding user profile...")
            query_vector = embed_profile(profile)
            
            logger.info("Retrieving relevant chunks...")
            relevant_chunks = retrieve_relevant_chunks(query_vector, chunks, embeddings, top_k=5, threshold=0.15)
        except Exception as e:
            logger.error(f"Failed during profile embedding or chunk retrieval: {str(e)}")
            try:
                update_meeting_status(meeting_id, 'FAILED', {'error_message': f'Profile embedding failed: {str(e)}'})
            except Exception as update_err:
                logger.error(f"Failed to update meeting status to FAILED: {str(update_err)}")
            return error_response(f'Profile embedding failed: {str(e)}', 500)
        
        # Build prompt
        try:
            prompt = build_user_prompt(profile, relevant_chunks, title, duration)
        except Exception as e:
            logger.error(f"Failed to build prompt: {str(e)}")
            try:
                update_meeting_status(meeting_id, 'FAILED', {'error_message': f'Prompt building failed: {str(e)}'})
            except Exception as update_err:
                logger.error(f"Failed to update meeting status to FAILED: {str(update_err)}")
            return error_response(f'Prompt building failed: {str(e)}', 500)
        
        # Call Claude
        try:
            logger.info("Invoking Claude...")
            response_text = invoke_claude(prompt, SYSTEM_PROMPT, max_tokens=2000)
        except Exception as e:
            logger.error(f"Claude invocation failed: {str(e)}")
            try:
                update_meeting_status(meeting_id, 'FAILED', {'error_message': f'AI analysis failed: {str(e)}'})
            except Exception as update_err:
                logger.error(f"Failed to update meeting status to FAILED: {str(update_err)}")
            return error_response(f'AI analysis failed: {str(e)}', 500)
        
        # Parse JSON with retry - defensive parsing
        digest = None
        try:
            digest, error = parse_claude_json(response_text)
            
            if error == "RETRY_NEEDED":
                logger.warning("First parse failed, retrying...")
                try:
                    retry_prompt = "Your previous response was not valid JSON. Return ONLY the JSON object, no other text."
                    response_text = invoke_claude(retry_prompt, SYSTEM_PROMPT, max_tokens=2000)
                    digest, error = parse_claude_json(response_text, retry_prompt=True)
                except Exception as retry_e:
                    logger.error(f"Retry invocation failed: {str(retry_e)}")
                    error = f"Retry failed: {str(retry_e)}"
            
            if error or not digest:
                logger.error(f"JSON parsing failed: {error}")
                # Create fallback digest with raw response as standard_briefing
                digest = FALLBACK_DIGEST.copy()
                if response_text:
                    digest['standard_briefing'] = f"**Raw AI Response**\n\n{response_text[:1000]}..."
                    digest['error'] = True
                # Ensure open_questions exists
                if 'open_questions' not in digest:
                    digest['open_questions'] = []
        except Exception as e:
            logger.error(f"Digest parsing completely failed: {str(e)}")
            digest = FALLBACK_DIGEST.copy()
            digest['open_questions'] = []
            digest['error'] = True
        
        # Calculate time saved metrics - defensive calculation
        time_metrics = {}
        try:
            word_count = len(transcript_text.split()) if transcript_text else 0
            reading_time_minutes = word_count / 238 if word_count > 0 else 0  # avg reading speed
            digest_words = len(str(digest).split()) if digest else 0
            digest_reading_seconds = int((digest_words / 238) * 60) if digest_words > 0 else 0
            meeting_duration_seconds = int(reading_time_minutes * 60) if reading_time_minutes > 0 else 0
            time_saved_percent = int(((meeting_duration_seconds - digest_reading_seconds) / meeting_duration_seconds) * 100) if meeting_duration_seconds > 0 else 0
            
            time_metrics = {
                'wordCount': word_count,
                'digestReadingSeconds': digest_reading_seconds,
                'meetingDurationSeconds': meeting_duration_seconds,
                'timeSavedPercent': time_saved_percent
            }
        except Exception as e:
            logger.warning(f"Time saved calculation failed: {str(e)}")
            time_metrics = {
                'wordCount': None,
                'digestReadingSeconds': None,
                'meetingDurationSeconds': None,
                'timeSavedPercent': None
            }
        
        # Update meeting with digest, chunks, and time saved metrics
        analysis_successful = False
        try:
            update_data = {
                'digest': digest,
                'chunks': chunks,  # Store chunk metadata (not embeddings)
            }
            update_data.update(time_metrics)
            
            update_meeting_status(meeting_id, 'COMPLETE', update_data)
            analysis_successful = True
            logger.info(f"Successfully updated meeting {meeting_id} status to COMPLETE")
        except Exception as e:
            logger.error(f"Failed to update meeting status to COMPLETE: {str(e)}")
            # Still return success since analysis completed
            logger.warning("Analysis completed but failed to save to database")
        
        logger.info(f"Analysis complete for meeting {meeting_id}")
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'meetingId': meeting_id,
                'status': 'COMPLETE',
                'digest': digest
            })
        }
        
    except Exception as e:
        logger.error(f"Unexpected error during analysis: {str(e)}", exc_info=True)
        
        # Only set to FAILED if analysis actually failed (not if we just had issues after successful completion)
        if meeting_id:
            try:
                # Check if we already successfully completed the analysis
                current_meeting = get_meeting(meeting_id)
                if current_meeting and current_meeting.get('status') == 'COMPLETE':
                    logger.info(f"Meeting {meeting_id} already marked as COMPLETE, not overriding to FAILED")
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({
                            'meetingId': meeting_id,
                            'status': 'COMPLETE',
                            'digest': current_meeting.get('digest', {})
                        })
                    }
                
                # Still save a fallback digest so frontend can fail somewhat gracefully
                fallback_digest = FALLBACK_DIGEST.copy()
                fallback_digest['open_questions'] = []
                fallback_digest['error'] = True
                update_meeting_status(meeting_id, 'FAILED', {
                    'digest': fallback_digest,
                    'error_message': str(e)
                })
            except Exception as update_err:
                logger.error(f"Failed to update status to FAILED: {str(update_err)}")
        
        return error_response(f'Analysis failed: {str(e)}', 500)


def handle_analyze_text(body):
    """Handle analyze-text test endpoint"""
    try:
        user_id = body.get('userId')
        if not user_id:
            return error_response('Missing userId in request body', 400)
        transcript_text = body.get('transcript_text', '')
        title = body.get('title', 'Test Meeting')
        
        if not transcript_text:
            return error_response('Missing transcript_text', 400)
        
        # Get user profile
        try:
            profile = get_profile(user_id)
        except Exception as e:
            logger.error(f"Failed to retrieve profile for user {user_id}: {str(e)}")
            return error_response('Failed to retrieve user profile', 500)
            
        if not profile:
            return error_response('User profile not found', 404)
        
        # Create fake words array for chunking
        try:
            words = transcript_text.split()
            words_array = [
                {'start': i * 2, 'end': i * 2 + 1.5, 'text': word}
                for i, word in enumerate(words)
            ]
        except Exception as e:
            logger.error(f"Failed to create words array: {str(e)}")
            return error_response('Failed to process transcript text', 500)
        
        # Run RAG pipeline
        try:
            chunks, embeddings = chunk_and_embed_transcript(transcript_text, words_array)
            query_vector = embed_profile(profile)
            relevant_chunks = retrieve_relevant_chunks(query_vector, chunks, embeddings, top_k=5)
        except Exception as e:
            logger.error(f"RAG pipeline failed: {str(e)}")
            return error_response(f'RAG pipeline failed: {str(e)}', 500)
        
        # Build prompt and call Claude
        try:
            prompt = build_user_prompt(profile, relevant_chunks, title, "00:10:00")
            response_text = invoke_claude(prompt, SYSTEM_PROMPT, max_tokens=2000)
        except Exception as e:
            logger.error(f"Claude invocation failed: {str(e)}")
            return error_response(f'AI analysis failed: {str(e)}', 500)
        
        # Parse JSON with retry - defensive parsing
        digest = None
        try:
            digest, error = parse_claude_json(response_text)
            
            if error == "RETRY_NEEDED":
                try:
                    retry_prompt = "Your previous response was not valid JSON. Return ONLY the JSON object, no other text."
                    response_text = invoke_claude(retry_prompt, SYSTEM_PROMPT, max_tokens=2000)
                    digest, error = parse_claude_json(response_text, retry_prompt=True)
                except Exception as retry_e:
                    logger.error(f"Retry invocation failed: {str(retry_e)}")
                    error = f"Retry failed: {str(retry_e)}"
            
            if error or not digest:
                logger.warning(f"JSON parsing failed, using fallback: {error}")
                digest = FALLBACK_DIGEST.copy()
                if 'open_questions' not in digest:
                    digest['open_questions'] = []
        except Exception as e:
            logger.error(f"Digest parsing completely failed: {str(e)}")
            digest = FALLBACK_DIGEST.copy()
            digest['open_questions'] = []
            digest['error'] = True
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'digest': digest,
                'chunks_retrieved': len(relevant_chunks) if relevant_chunks else 0
            })
        }
        
    except Exception as e:
        logger.error(f"Unexpected error in test endpoint: {str(e)}", exc_info=True)
        return error_response(f'Test analysis failed: {str(e)}', 500)


def error_response(message, status_code):
    """Return error response"""
    return {
        'statusCode': status_code,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': message})
    }
