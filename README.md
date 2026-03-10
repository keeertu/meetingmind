# MeetingMind

<div align="center">

> **Stop attending meetings you missed.**
> **Start knowing what matters to you.**

[![AWS](https://img.shields.io/badge/AWS-Bedrock-orange?style=flat-square&logo=amazonaws)](https://aws.amazon.com/bedrock/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Built for](https://img.shields.io/badge/AWS-10%2C000%20AIdeas-yellow?style=flat-square)](https://aws.amazon.com)

</div>

---

## The Story

My sister works in product. Her calendar is back-to-back meetings.

When she could attend, she'd sit through hour-long calls where
maybe 10 minutes actually mattered to her. When she missed one,
she'd block time to watch the full recording — scrubbing through
an hour of discussion to find the two decisions that affected her work.

That's not a productivity problem. That's a **relevance** problem.

Every person in a meeting has different priorities. A Project Manager
cares about budget and decisions. A UI Designer cares about interface
requirements. An Engineer cares about technical constraints. A generic
AI summary gives everyone the same document — which means it's truly
useful to no one.

**MeetingMind fixes this.**

Upload a recording. Set your role and projects. Get a briefing built
specifically for you — not a summary of everything that was said, but
a digest of what matters to **you**.

---

## What It Does

```
Audio Recording
↓
AssemblyAI Transcription ← speaker-labeled, timestamped
↓
Semantic Chunking + Titan Embeddings
↓
Role-Conditioned RAG Retrieval ← the magic happens here
↓
Amazon Nova Pro Analysis
↓
Your Personalized Digest
```

The key insight: **retrieval is role-conditioned.**

Chunks fetched for a Project Manager (budget, decisions, timelines)
are semantically different from chunks fetched for a UI Designer
(buttons, usability, interface). Personalization happens at retrieval
AND generation — not just in the prompt.

---

## Features

| Feature | What it does |
|---------|-------------|
| 🎯 **Role-Conditioned Digests** | Same meeting, completely different briefing per role |
| 🔍 **RAG-Powered Retrieval** | Cosine similarity against your profile embedding |
| 💬 **Meeting Chat** | Ask anything — "What did Alima say about buttons?" |
| ❓ **Open Questions** | Unresolved questions surfaced automatically |
| ✅ **Action Item Tracking** | Aggregated across all meetings on your dashboard |
| ⚡ **Time Saved Metric** | 17-min meeting → 74-sec read → 87% time saved |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                   Frontend                  │
│            React 18 · Vite · Tailwind      │
└──────────────────┬──────────────────────────┘
                   │ REST
┌──────────────────▼──────────────────────────┐
│                API Gateway                  │
└──┬───────────┬───────────┬───────────┬───────┘
   │           │           │           │
┌──▼────┐ ┌───▼───┐ ┌─────▼───┐ ┌────▼────┐
│Upload │ │ Poll  │ │ Analyze │ │  Chat   │
│Meeting│ │Trans. │ │ Meeting │ │ Meeting │
└──┬────┘ └───┬───┘ └─────┬───┘ └────┬────┘
   │          │           │          │
┌──▼──────────▼────────────▼──────────▼──────┐
│                AWS Services                │
│         S3 · DynamoDB · Bedrock · Lambda   │
└─────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Transcription | AssemblyAI — speaker-labeled |
| Embeddings | Amazon Titan Embed Text G1 |
| LLM | Amazon Nova Pro via Bedrock |
| Vector Store | Amazon S3 — JSON embeddings |
| Database | Amazon DynamoDB |
| Compute | AWS Lambda — 7 serverless functions |
| API | Amazon API Gateway |
| IaC | AWS SAM |
| Frontend | React 18 + Vite + Tailwind CSS |

---

## API

```
POST /profile                → Save user profile
GET  /profile/{userId}       → Get user profile
POST /meetings/upload-url    → Presigned S3 URL
POST /meetings/process       → Trigger pipeline
GET  /meetings/{id}/status   → Poll status
GET  /meetings/{id}          → Get digest
GET  /meetings?userId={id}   → List all meetings
POST /meetings/{id}/chat     → RAG chat
```

---

## Local Development

**Prerequisites:** AWS CLI, AWS SAM CLI, Node 18+, Python 3.11+

```bash
# Clone
git clone https://github.com/keeertu/meetingmind.git
cd meetingmind

# Backend
cp .env.example .env  # Fill in ASSEMBLYAI_API_KEY and AWS config

cd backend/infrastructure
sam build
sam deploy --config-file samconfig.toml

# Frontend
cd ../../frontend
npm install
npm run dev
```

**Required environment variables:**
```
ASSEMBLYAI_API_KEY=your_key
BEDROCK_MODEL_ID=us.amazon.nova-pro-v1:0
RECORDINGS_BUCKET=your-s3-bucket
PROFILES_TABLE=meetingmind-profiles
MEETINGS_TABLE=meetingmind-meetings
VITE_API_URL=https://your-api-gateway-url/prod
```

**Project Structure**
```
meetingmind/
├── backend/
│   ├── infrastructure/
│   │   ├── template.yaml         # SAM — all Lambda + API config
│   │   └── samconfig.toml        # Deploy config
│   ├── lambdas/
│   │   ├── upload_meeting/       # Presigned S3 + DynamoDB record
│   │   ├── poll_transcription/   # AssemblyAI polling loop
│   │   ├── analyze_meeting/      # RAG pipeline + Nova Pro
│   │   ├── get_meeting_digest/   # Digest retrieval
│   │   ├── chat_meeting/         # RAG chat endpoint
│   │   ├── save_profile/         # User profile management
│   │   └── list_meetings/        # Meeting list per user
│   └── shared/
│       ├── bedrock_utils.py      # Nova Pro client + retry logic
│       ├── db.py                 # DynamoDB helpers
│       ├── s3_utils.py           # S3 helpers
│       └── utils.py              # Chunking + RAG pipeline
└── frontend/
    └── src/
        ├── components/           # React pages + components
        └── api/client.js         # Typed API client
```

**Why Not Just Use ChatGPT?**

Most AI meeting tools do this:
```
Transcript → LLM → Summary
```

MeetingMind does this:
```
Transcript → Chunks → Embeddings → Role-Conditioned Retrieval → LLM → Your Digest
```

The difference: your profile (role + projects + keywords) is embedded and used to retrieve only the chunks relevant to you before the LLM ever sees the content. Two people get fundamentally different digests from the same recording — not because the prompt changed, but because the retrieved context changed.

**Built With**
[AWS SAM](https://aws.amazon.com/serverless/sam/) · [Amazon Bedrock](https://aws.amazon.com/bedrock/) · [AssemblyAI](https://www.assemblyai.com/) · [React](https://react.dev/)

<div align="center">

Built for the **AWS 10,000 AIdeas Competition 2025**<br>
by [Keerat Khanuja](https://github.com/keeertu)

</div>