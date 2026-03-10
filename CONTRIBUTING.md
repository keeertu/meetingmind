# Contributing to MeetingMind

Thanks for your interest. This doc covers everything you need to work on MeetingMind effectively.

## Setup

```bash
git clone https://github.com/keeertu/meetingmind.git
cd meetingmind
cp .env.example .env
```

Fill in `.env` with your AssemblyAI key and AWS config. Then follow the Local Development steps in the README.

## How the Codebase Works

**Backend — 7 Lambda functions**

Each Lambda is fully self-contained with its own `requirements.txt`. Shared utilities live in `backend/shared/` and must be copied into each Lambda directory before deploying (SAM packages each function independently).

Pipeline flow:
```
upload_meeting
    → poll_transcription  (EventBridge, every 6s)
        → analyze_meeting  (invoked directly)
            → get_meeting_digest  (on demand)
```

Status lifecycle:
```
TRANSCRIBING → ANALYZING → COMPLETED
                        → FAILED
```

All handlers follow this pattern:
```python
def lambda_handler(event, context):
    # 1. Parse + validate input
    # 2. Execute business logic
    # 3. Return response with CORS headers
```

**Frontend — React 18**

All API calls go through `frontend/src/api/client.js`. Do not make fetch calls directly from components.

The aurora dark theme is defined in `index.css` as CSS variables. Do not hardcode colors in components — use `var(--accent)`, `var(--bg)`, etc.

`userId` is currently hardcoded as `demo-user`. This is intentional for the demo.

## Adding a New Lambda

```bash
# 1. Create the function directory
mkdir backend/lambdas/your_function

# 2. Create handler
touch backend/lambdas/your_function/handler.py
touch backend/lambdas/your_function/requirements.txt

# 3. Copy shared modules
cp backend/shared/*.py backend/lambdas/your_function/

# 4. Add to SAM template
# See backend/infrastructure/template.yaml
# Follow the pattern of existing functions exactly
# Include Bedrock IAM policies if calling Nova Pro

# 5. Deploy
cd backend/infrastructure
sam build && sam deploy --config-file samconfig.toml
```

**IAM note:** If your Lambda calls Bedrock, add the same inline policy as `AnalyzeMeetingFunction`. The SAM template has the pattern — copy it exactly.

## Adding a New Frontend Route

```javascript
// 1. Create component in frontend/src/components/
// 2. Add route in frontend/src/App.jsx
// 3. Add API method in frontend/src/api/client.js
// 4. Use existing CSS variables for styling
```

## Before You Push

```bash
# Make sure these are NOT tracked
git status | grep -E "\.env|policy\.json|input\.json|venv/"

# Run a quick deploy check
cd backend/infrastructure && sam build

# Test the frontend builds
cd frontend && npm run build
```

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `ASSEMBLYAI_API_KEY` | Lambda env | Transcription |
| `BEDROCK_MODEL_ID` | Lambda env | Nova Pro model ID |
| `RECORDINGS_BUCKET` | Lambda env | S3 bucket name |
| `PROFILES_TABLE` | Lambda env | DynamoDB table |
| `MEETINGS_TABLE` | Lambda env | DynamoDB table |
| `VITE_API_URL` | Frontend .env | API Gateway URL |

All Lambda env vars are set via `template.yaml`. Never hardcode them in handler code.

## Questions

Open an issue or reach out via the AWS Builder Center article comments.