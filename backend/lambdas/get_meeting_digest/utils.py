import uuid
import re
import logging
import json
from datetime import timedelta


def get_logger(name):
    """Get structured logger for lambdas"""
    logger = logging.getLogger(name)
    if logger.hasHandlers():
        logger.handlers.clear()
        
    handler = logging.StreamHandler()
    
    # Custom formatter for structured CloudWatch logs
    class JSONFormatter(logging.Formatter):
        def format(self, record):
            log_obj = {
                "timestamp": self.formatTime(record, self.datefmt),
                "level": record.levelname,
                "name": record.name,
                "message": record.getMessage()
            }
            if hasattr(record, 'meeting_id'):
                log_obj['meeting_id'] = record.meeting_id
            if hasattr(record, 'user_id'):
                log_obj['user_id'] = record.user_id
            
            if record.exc_info:
                log_obj['exc_info'] = self.formatException(record.exc_info)
                
            return json.dumps(log_obj)
            
    handler.setFormatter(JSONFormatter())
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    return logger


def generate_meeting_id():
    """Generate unique meeting ID"""
    return f"mtg-{uuid.uuid4()}"


def format_duration(seconds):
    """Format seconds as HH:MM:SS"""
    td = timedelta(seconds=int(seconds))
    hours = td.seconds // 3600
    minutes = (td.seconds % 3600) // 60
    secs = td.seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def find_timestamp_position(timestamp_str, words_array):
    """
    Convert timestamp string (MM:SS or HH:MM:SS) to position in words array.
    Returns index of nearest word.
    """
    # Parse timestamp to seconds
    parts = timestamp_str.split(':')
    if len(parts) == 2:  # MM:SS
        target_seconds = int(parts[0]) * 60 + int(parts[1])
    elif len(parts) == 3:  # HH:MM:SS
        target_seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    else:
        return 0
    
    # Find nearest word by start time
    if not words_array:
        return 0
    
    min_diff = float('inf')
    best_index = 0
    
    for i, word in enumerate(words_array):
        word_start = word.get('start', 0)
        diff = abs(word_start - target_seconds)
        if diff < min_diff:
            min_diff = diff
            best_index = i
        # If we've passed the target by more than 5 seconds, stop searching
        if word_start > target_seconds + 5:
            break
    
    return best_index


def chunk_transcript(transcript_text, words_array, chunk_size=500):
    """
    Chunk transcript into ~chunk_size token segments at sentence boundaries.
    Returns list of dicts with text, timestamp_start, timestamp_end.
    """
    if not transcript_text.strip():
        return []
        
    # Split into sentences (simple approach)
    sentences = [s.strip() for s in re.split(r'[.!?]+\s+', transcript_text) if s.strip()]
    
    if not sentences:
        # Transcript might just be a single word or sentence without punctuation
        sentences = [transcript_text.strip()]
    
    chunks = []
    current_chunk = []
    current_tokens = 0
    chunk_start_time = None
    chunk_end_time = None
    word_index = 0
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        
        # Rough token estimate (words * 1.3)
        sentence_tokens = len(sentence.split()) * 1.3
        
        # Find timestamp for this sentence
        sentence_words = sentence.split()
        sentence_start_idx = word_index
        word_index += len(sentence_words)
        
        if sentence_start_idx < len(words_array):
            sentence_time = words_array[sentence_start_idx].get('start', 0)
            if chunk_start_time is None:
                chunk_start_time = sentence_time
            chunk_end_time = sentence_time
        
        if current_tokens + sentence_tokens > chunk_size and current_chunk:
            # Save current chunk
            chunks.append({
                'text': ' '.join(current_chunk),
                'timestamp_start': _seconds_to_mmss(chunk_start_time or 0),
                'timestamp_end': _seconds_to_mmss(chunk_end_time or 0)
            })
            current_chunk = [sentence]
            current_tokens = sentence_tokens
            chunk_start_time = sentence_time
            chunk_end_time = sentence_time
        else:
            current_chunk.append(sentence)
            current_tokens += sentence_tokens
    
    # Add final chunk
    if current_chunk:
        chunks.append({
            'text': ' '.join(current_chunk),
            'timestamp_start': _seconds_to_mmss(chunk_start_time or 0),
            'timestamp_end': _seconds_to_mmss(chunk_end_time or 0)
        })
    
    return chunks


def _seconds_to_mmss(seconds):
    """Convert seconds to MM:SS format"""
    minutes = int(seconds) // 60
    secs = int(seconds) % 60
    return f"{minutes:02d}:{secs:02d}"


def cosine_similarity(vec_a, vec_b):
    """Calculate cosine similarity between two vectors using numpy"""
    try:
        import numpy as np
        vec_a = np.array(vec_a)
        vec_b = np.array(vec_b)
        return float(np.dot(vec_a, vec_b) / (np.linalg.norm(vec_a) * np.linalg.norm(vec_b)))
    except ImportError:
        # Fallback without numpy (shouldn't happen with layer)
        dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
        mag_a = sum(a * a for a in vec_a) ** 0.5
        mag_b = sum(b * b for b in vec_b) ** 0.5
        return dot_product / (mag_a * mag_b) if mag_a and mag_b else 0.0


def get_user_id_from_token(event):
    """Extract user ID from Cognito JWT token claims in API Gateway event"""
    try:
        # Get user ID directly from API Gateway authorizer claims
        claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
        user_id = claims.get("sub")
        
        if not user_id:
            return None
            
        return user_id
        
    except Exception as e:
        logger = get_logger(__name__)
        logger.error(f"Error extracting user ID from claims: {str(e)}")
        return None
