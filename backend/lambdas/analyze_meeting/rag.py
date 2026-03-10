import sys
import os

sys.path.insert(0, '/opt/python')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))

from bedrock_utils import get_embedding
from s3_utils import upload_json, get_json
from utils import chunk_transcript, cosine_similarity, get_logger

logger = get_logger(__name__)


def chunk_and_embed_transcript(transcript_text, words_array, chunk_size=500):
    """Chunk transcript and generate embeddings for each chunk"""
    chunks = chunk_transcript(transcript_text, words_array, chunk_size)
    
    embeddings = []
    valid_chunks = []
    
    for chunk in chunks:
        try:
            embedding = get_embedding(chunk['text'])
            embeddings.append(embedding)
            valid_chunks.append(chunk)
        except Exception as e:
            logger.warning(f"Failed to embed chunk: {str(e)}. Skipping chunk.")
            
    if not embeddings:
        raise ValueError("Failed to generate embeddings for any chunks")
    
    return valid_chunks, embeddings


def embed_profile(profile):
    """Create query vector from user profile"""
    # Combine profile fields into a query string
    query_parts = [
        f"Role: {profile.get('role', '')}",
        f"Projects: {', '.join(profile.get('projects', []))}",
        f"Keywords: {', '.join(profile.get('keywords', []))}"
    ]
    query_text = " ".join(query_parts)
    
    return get_embedding(query_text)


def retrieve_relevant_chunks(query_vector, chunks, embeddings, top_k=5, threshold=0.15):
    """Retrieve top K most relevant chunks using cosine similarity, filtered by threshold"""
    if not chunks or not embeddings:
        return []
    
    # Calculate similarity scores
    similarities = []
    for i, chunk_embedding in enumerate(embeddings):
        similarity = cosine_similarity(query_vector, chunk_embedding)
        similarities.append((similarity, i))
    
    # Sort by similarity (descending)
    similarities.sort(reverse=True, key=lambda x: x[0])
    
    filtered_indices = []
    
    logger.info(f"Top {top_k} similarity scores:")
    for sim, idx in similarities[:top_k]:
        logger.info(f"Chunk {idx} similarity: {sim:.4f}")
        if sim >= threshold:
            filtered_indices.append(idx)
        else:
            logger.info(f"Chunk {idx} rejected (below threshold {threshold})")
            
    if not filtered_indices and similarities:
        # Fallback if everything is below threshold but we want at least one chunk context
        logger.info(f"All chunks below threshold. Using best chunk anyway: {similarities[0][0]:.4f}")
        filtered_indices.append(similarities[0][1])
    
    # Return top thresholded chunks
    return [chunks[i] for i in filtered_indices]


def save_embeddings_to_s3(meeting_id, embeddings_data):
    """Save embeddings and chunks to S3"""
    key = f"embeddings/{meeting_id}.json"
    upload_json(embeddings_data, key)


def load_embeddings_from_s3(meeting_id):
    """Load embeddings from S3"""
    key = f"embeddings/{meeting_id}.json"
    return get_json(key)
