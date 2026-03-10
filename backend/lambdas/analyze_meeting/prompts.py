SYSTEM_PROMPT = """You are MeetingMind, an AI that analyzes meeting transcripts and creates hyper-personalized briefings based on a person's specific role and projects. You are ruthlessly specific. You never waste the user's time with information irrelevant to their work. You always return valid JSON and nothing else."""


def build_user_prompt(profile, retrieved_chunks, title, duration, full_transcript=""):
    """Build the user prompt for Claude"""
    
    # Format retrieved chunks
    chunks_text = "\n\n".join([
        f"[{chunk['timestamp_start']} - {chunk['timestamp_end']}]\n{chunk['text']}"
        for chunk in retrieved_chunks
    ])
    
    # Format profile
    projects_str = ", ".join(profile.get('projects', []))
    keywords_str = ", ".join(profile.get('keywords', []))
    
    prompt = f"""USER PROFILE:
Name: {profile.get('name', 'Unknown')}
Role: {profile.get('role', 'Unknown')}
Current Projects: {projects_str}
Keywords to watch for: {keywords_str}

RELEVANT MEETING CONTENT (retrieved for this user's profile):
{chunks_text}

FULL MEETING CONTEXT:
Title: {title}
Duration: {duration}

Your tasks:
1. Score relevance 1-10 for THIS specific person based on their role and projects. Be honest — if this meeting has nothing to do with them, score it LOW.

2. Extract only decisions that directly impact their role or projects. Skip everything else.

3. Find action items that mention them by name or reference their projects. Flag items assigned to others that still affect their work.

4. Extract questions that were explicitly asked during the meeting but were NOT definitively answered. Look for phrases like "I don't know", "we need to figure out", "good question", "let me look into that". Return 2-5 open questions as strings. If none found return empty array.

5. Write one "why_this_matters" sentence. Be specific — reference their actual role title and project names.
   Bad: "This meeting is relevant to your work."
   Good: "As the frontend engineer on payments-dashboard, the API deadline change discussed at 14:32 directly affects your sprint timeline."

6. Write 5 quick_scan bullets. Most important facts only. Each bullet max 15 words.

7. Write standard_briefing as 3 paragraphs in markdown:
   - Para 1: What this meeting was about (2-3 sentences)
   - Para 2: Key decisions and their impact on this person
   - Para 3: What they need to do or watch out for

A frontend engineer and a product manager must get completely different outputs from the same meeting. That is your north star.

Return ONLY valid JSON matching this exact schema:
{{
  "relevance": "HIGH" | "MEDIUM" | "LOW",
  "relevance_score": 1-10,
  "why_this_matters": "one specific sentence",
  "decisions": [
    {{
      "summary": "string",
      "timestamp": "MM:SS",
      "affects_user": true | false
    }}
  ],
  "action_items": [
    {{
      "task": "string",
      "assigned_to": "string",
      "timestamp": "MM:SS",
      "involves_user": true | false
    }}
  ],
  "open_questions": ["Question that was raised but not resolved", "Another unresolved question"],
  "quick_scan": ["bullet 1", "bullet 2", "bullet 3", "bullet 4", "bullet 5"],
  "standard_briefing": "3 paragraph markdown string",
  "key_moments": [
    {{
      "timestamp": "MM:SS",
      "description": "string",
      "relevance_to_user": "string"
    }}
  ],
  "error": false
}}

No preamble, no explanation, no markdown fences. Just JSON."""
    
    return prompt


FALLBACK_DIGEST = {
    "relevance": "UNKNOWN",
    "relevance_score": 5,
    "why_this_matters": "Unable to analyze this meeting due to a processing error.",
    "decisions": [],
    "action_items": [],
    "open_questions": [],
    "quick_scan": [
        "Meeting analysis failed",
        "Please try again or contact support",
        "Transcript is available below",
        "Manual review recommended",
        "Error details logged"
    ],
    "standard_briefing": "**Analysis Error**\n\nWe encountered an error while analyzing this meeting. The transcript has been saved and is available for manual review.\n\nPlease try re-analyzing this meeting or contact support if the issue persists.\n\nYou can still view the full transcript below.",
    "key_moments": [],
    "error": True
}
