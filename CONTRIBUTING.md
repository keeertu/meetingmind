# Contributing

## Development Setup

1. Clone the repo
2. Install AWS SAM CLI and configure AWS credentials
3. Copy .env.example to .env and fill in your keys
4. Follow Local Development steps in README

## Project Conventions

**Backend**
- Each Lambda is self-contained with its own
  requirements.txt
- Shared utilities live in backend/shared/
- Always copy shared modules to Lambda directory
  before deploying
- All handlers follow: parse event → validate →
  execute → return response
- Status values: TRANSCRIBING, ANALYZING,
  COMPLETED, FAILED

**Frontend**
- API calls go through frontend/src/api/client.js
- userId is hardcoded as "demo-user" for now
- Aurora dark theme — do not change core CSS vars

## Adding a New Lambda

1. Create backend/lambdas/your_function/handler.py
2. Create backend/lambdas/your_function/requirements.txt
3. Copy shared modules into the directory
4. Add resource to backend/infrastructure/template.yaml
5. Follow existing IAM policy patterns for Bedrock access
6. sam build && sam deploy