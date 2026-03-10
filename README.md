# MeetingMind

> Stop attending meetings you missed. Start knowing
> what matters to you.

MeetingMind is a role-conditioned meeting intelligence
system. Upload any meeting recording and get a
personalized digest — filtered through your role,
your projects, and your priorities.

Not a summary. A briefing built for you.

---

## The Problem

Everyone in a meeting walks away with different
priorities. A Project Manager cares about budget and
decisions. A UI Designer cares about interface
requirements. A generic AI summary gives everyone
the same document.

MeetingMind fixes this.

---

## How It Works

Audio Recording
↓
AssemblyAI Transcription (speaker-labeled)
↓
Semantic Chunking + Titan Embeddings
↓
Role-Conditioned RAG Retrieval
↓
Amazon Nova Pro Analysis
↓
Personalized Digest

The retrieval step is role-conditioned — chunks
fetched for a Project Manager are semantically
different from chunks fetched for a UI Designer.
Personalization happens at retrieval AND generation.

---

## Features

**Role-Conditioned Digests**
Every user gets a digest filtered through their
role and project keywords. Same meeting, different
lens.

**RAG-Powered Relevance**
Transcript is chunked, embedded with Amazon Titan,
and retrieved via cosine similarity against the
user's profile embedding. Only what matters to you
reaches the LLM.

**Meeting Chat**
Ask anything about the meeting. The RAG pipeline
retrieves relevant chunks and answers in context.
"What did Alima say about button sizes?"

**Open Questions Extraction**
Unresolved questions from the meeting are surfaced
automatically.

**Action Item Tracking**
Action items aggregated across all your meetings
in one dashboard view.

**Time Saved Metric**
Quantified impact. 17-minute meeting → 74-second
read → 87% time saved.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Transcription | AssemblyAI (speaker-labeled) |
| Embeddings | Amazon Titan Embed Text G1 |
| LLM | Amazon Nova Pro (Bedrock) |
| Vector Store | Amazon S3 (JSON embeddings) |
| Database | Amazon DynamoDB |
| Compute | AWS Lambda (7 functions) |
| API | Amazon API Gateway |
| IaC | AWS SAM |
| Frontend | React 18 + Vite + Tailwind CSS |

---

## Architecture

```
┌─────────────────────────────────────────┐
│                Frontend                 │
│           React + Vite + Tailwind       │
└────────────────┬────────────────────────┘
                 │ REST API
┌────────────────▼────────────────────────┐
│              API Gateway                │
└──┬──────────┬──────────┬───────────┬────┘
   │          │          │           │
┌──▼──┐ ┌───▼───┐ ┌───▼───┐ ┌───▼────┐
│Upload│ │ Poll  │ │Analyze│ │ Chat   │
│Meet. │ │Trans. │ │Meet.  │ │Meeting │
└──┬──┘ └───┬───┘ └───┬───┘ └───┬────┘
   │        │        │         │
┌──▼─────────▼───────────▼──────────▼────┐
│              AWS Services              │
│    S3    │ DynamoDB │ Bedrock │ SAM   │
└────────────────────────────────────────┘
```

---

## API Reference

```
POST /profile                Save user profile
GET  /profile/{userId}       Get user profile
POST /meetings/upload-url    Get presigned S3 URL
POST /meetings/process       Trigger pipeline
GET  /meetings/{id}/status   Poll status
GET  /meetings/{id}          Get digest
GET  /meetings?userId={id}   List meetings
POST /meetings/{id}/chat     RAG chat
```

---

## Local Development

```bash
# Backend
cd backend/infrastructure
sam build
sam deploy --config-file samconfig.toml

# Frontend
cd frontend
npm install
npm run dev
```

**Environment variables required:**
```
ASSEMBLYAI_API_KEY=your_key
BEDROCK_MODEL_ID=us.amazon.nova-pro-v1:0
RECORDINGS_BUCKET=your_bucket
PROFILES_TABLE=meetingmind-profiles
MEETINGS_TABLE=meetingmind-meetings
```

---

## Project Structure

```
meetingmind/
├── backend/
│   ├── infrastructure/
│   │   ├── template.yaml       # SAM template
│   │   └── samconfig.toml      # Deploy config
│   ├── lambdas/
│   │   ├── upload_meeting/     # S3 upload + DynamoDB
│   │   ├── poll_transcription/ # AssemblyAI polling
│   │   ├── analyze_meeting/    # RAG + Nova Pro
│   │   ├── get_meeting_digest/ # Digest retrieval
│   │   ├── chat_meeting/       # RAG chat
│   │   ├── save_profile/       # User profiles
│   │   └── list_meetings/      # Meeting list
│   └── shared/
│       ├── bedrock_utils.py    # Nova Pro client
│       ├── db.py               # DynamoDB helpers
│       ├── s3_utils.py         # S3 helpers
│       └── utils.py            # RAG pipeline
└── frontend/
    └── src/
        ├── components/         # React components
        └── api/                # API client
```

---

## Built With

- [AWS SAM](https://aws.amazon.com/serverless/sam/)
- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [AssemblyAI](https://www.assemblyai.com/)
- [React](https://react.dev/)

---

Built for the AWS 10,000 AIdeas Competition 2025.