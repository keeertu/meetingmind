import json
import boto3
import os
import sys

sys.path.insert(0, '/opt/python')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))

from db import get_meeting
from bedrock_utils import invoke_claude, get_embedding
from s3_utils import get_json
from utils import cosine_similarity, get_logger, get_user_id_from_token

logger = get_logger(__name__)

bucket_name = os.environ.get('RECORDINGS_BUCKET')


def lambda_handler(event, context):
    """Chat with meeting using RAG"""
    try:
        body = json.loads(event.get('body', '{}'))
        meeting_id = event.get('pathParameters', {}).get('meetingId')
        question = body.get('question', '').strip()
        
        # Get user ID from Cognito JWT token
        user_id = get_user_id_from_token(event)
        if not user_id:
            logger.warning("Missing or invalid authentication token")
            return {
                'statusCode': 401,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Unauthorized'})
            }
        
        # Validate question is not empty
        if not question:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Question cannot be empty'})
            }
            
        if not meeting_id:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'meetingId is required'})
            }
        
        # Get meeting from DynamoDB
        meeting = get_meeting(meeting_id)
        if not meeting:
            return {
                'statusCode': 404,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Meeting not found'})
            }
        
        # Load embeddings from S3
        embeddings_key = f"embeddings/{meeting_id}.json"
        embeddings_data = load_embeddings(embeddings_key)
        if not embeddings_data:
            return {
                'statusCode': 404,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'This meeting hasn\'t been analyzed yet'})
            }
        
        # Embed the question using Titan
        try:
            question_embedding = get_embedding(question)
        except Exception as embed_e:
            logger.error(f"Failed to get question embedding: {str(embed_e)}")
            return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Unable to answer right now, please try again'})
            }
        
        # Find most relevant chunks
        relevant_chunks = get_relevant_chunks(question_embedding, embeddings_data, top_k=3)
        
        context_text = '\n\n'.join([chunk.get('text', '') for chunk in relevant_chunks])
        
        # Build prompt
        prompt = f"""You are answering a question about a meeting.

Meeting transcript excerpts:
{context_text}

Question: {question}

Answer concisely based only on the meeting content.
If the answer is not in the transcript, say so.
Include speaker names and timestamps when relevant."""
        
        # Call Claude
        try:
            answer = invoke_claude(prompt, "You are a meeting assistant.", max_tokens=500)
        except Exception as claude_e:
            logger.error(f"Claude invocation failed: {str(claude_e)}")
            return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Unable to answer right now, please try again'})
            }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'answer': answer,
                'meetingId': meeting_id
            })
        }
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Internal server error'})
        }


def load_embeddings(s3_key):
    """Load embeddings from S3"""
    try:
        return get_json(s3_key)
    except Exception as e:
        logger.error(f"Failed to load embeddings from {s3_key}: {str(e)}")
        return None


def get_relevant_chunks(query_vector, embeddings_data, top_k=3):
    """Get most relevant chunks using cosine similarity"""
    chunks = embeddings_data.get('chunks', [])
    embeddings = embeddings_data.get('embeddings', [])
    
    if not chunks or not embeddings:
        return []
    
    # Calculate similarity scores
    similarities = []
    for i, chunk_embedding in enumerate(embeddings):
        try:
            similarity = cosine_similarity(query_vector, chunk_embedding)
            similarities.append((similarity, i))
        except Exception as sim_e:
            logger.warning(f"Failed to calculate similarity for chunk {i}: {str(sim_e)}")
            continue
    
    if not similarities:
        return []
    
    # Sort by similarity (descending) and get top k
    similarities.sort(reverse=True, key=lambda x: x[0])
    
    # Return top chunks
    result = []
    for _, i in similarities[:top_k]:
        if i < len(chunks):
            result.append(chunks[i])
    
    return result