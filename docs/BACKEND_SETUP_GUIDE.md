# Buildable AI Backend Setup Guide

Complete guide for setting up the Buildable AI unified agent backend.

---

## Quick Start

### 1. Clone Your Backend Repository

```bash
git clone https://github.com/dom2019oh/buildablelabs-backend.git
cd buildablelabs-backend
```

### 2. Copy Files from This Project

Copy all files from `docs/backend-repo/` to your backend repository root:

```bash
# From your Lovable project directory (after downloading/cloning)
cp -r docs/backend-repo/* /path/to/buildablelabs-backend/
```

### 3. Directory Structure

Your backend should have this structure after copying:

```
buildablelabs-backend/
├── src/
│   ├── index.ts                    # Server entry point
│   ├── config/
│   │   └── env.ts                  # Environment configuration
│   ├── api/
│   │   ├── workspace.ts            # Workspace endpoints
│   │   ├── generate.ts             # Generation endpoints (POST /generate, /refine)
│   │   ├── preview.ts              # Preview server management
│   │   └── credits.ts              # Credit balance endpoints
│   ├── services/
│   │   └── ai/
│   │       ├── models.ts           # ✨ NEW: Model registry & routing
│   │       ├── buildable-ai.ts     # ✨ NEW: Unified AI agent wrapper
│   │       ├── pipeline.ts         # ✨ NEW: Multi-agent orchestration
│   │       ├── architect.ts        # Planning agent (Gemini)
│   │       ├── coder.ts            # Coding agent (Grok primary)
│   │       └── validator.ts        # Validation agent (Grok/OpenAI)
│   ├── middleware/
│   │   └── credits.ts              # ✨ NEW: Credit estimation & deduction
│   ├── db/
│   │   ├── client.ts               # Supabase client
│   │   └── queries.ts              # Database queries
│   ├── queue/
│   │   └── worker.ts               # BullMQ job processor
│   ├── utils/
│   │   └── logger.ts               # Pino logger
│   └── types/
│       └── database.ts             # TypeScript types
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env.example
├── .env                            # Your actual secrets (DO NOT COMMIT)
├── README.md
└── BUILDABLE_AI_README.md          # AI system documentation
```

---

## 4. Install Dependencies

```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install

# Required packages for Buildable AI:
bun add openai @google/generative-ai
# Note: xAI Grok uses OpenAI-compatible API, no separate SDK needed
```

---

## 5. Configure Environment Variables

Create `.env` from the example:

```bash
cp .env.example .env
```

Edit `.env` with your actual API keys:

```bash
# =============================================================================
# REQUIRED: AI PROVIDERS
# =============================================================================

# OpenAI - For advanced reasoning, refinement, fallbacks
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key

# xAI Grok - Primary coding engine (2M context, fast)
# Get from: https://console.x.ai/
GROK_API_KEY=xai-your-grok-key

# Google Gemini - Planning, multimodal, intent parsing
# Get from: https://aistudio.google.com/apikey
GEMINI_API_KEY=your-gemini-key

# =============================================================================
# REQUIRED: SUPABASE
# =============================================================================

# From your Lovable Cloud / Supabase project
SUPABASE_URL=https://jbhoyxnnyprjebdbeuxi.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# =============================================================================
# SERVER CONFIG
# =============================================================================

NODE_ENV=development
PORT=3000
VERSION=1.0.0
CORS_ORIGINS=http://localhost:5173,https://buildablelabs.dev

# =============================================================================
# OPTIONAL: DEFAULTS
# =============================================================================

DEFAULT_AI_PROVIDER=grok
DEFAULT_ARCHITECT_MODEL=gemini-2.5-pro
DEFAULT_CODER_MODEL=grok-code-fast-1
```

---

## 6. Run the Backend

```bash
# Development (with hot reload)
bun run dev

# Production build
bun run build
bun run start

# Test health endpoint
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"healthy","version":"1.0.0","timestamp":"2024-..."}
```

---

## 7. Test the AI Pipeline

```bash
# Test generation endpoint (requires auth token)
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
  -d '{
    "workspaceId": "your-workspace-id",
    "prompt": "Create a landing page with a hero section"
  }'
```

---

## Model Routing Summary

| Task | Primary Provider | Fallback |
|------|-----------------|----------|
| **Planning/Intent** | Gemini 2.5 Pro | OpenAI GPT-5 |
| **Code Generation** | Grok Code Fast | OpenAI GPT-5 |
| **Debugging/Fixes** | Grok 4.1 Fast | OpenAI GPT-5 |
| **Validation** | Grok 4.1 Fast | OpenAI GPT-5 Mini |
| **Refinement** | OpenAI GPT-5.2 | Gemini 3 Pro |
| **Multimodal** | Gemini 2.5 Flash | Gemini 3 Flash |

---

## Troubleshooting

### "Invalid API key" errors
- Verify each key is correct in `.env`
- Grok keys start with `xai-`
- OpenAI keys start with `sk-`

### "Rate limited" errors
- The system auto-falls back to alternative providers
- Check logs for `[FALLBACK]` messages

### Database connection issues
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Ensure the service key has proper permissions

### CORS errors
- Add your frontend URL to `CORS_ORIGINS`
- Restart the server after changing

---

## Next Steps

1. ✅ Backend running locally
2. ⬜ Deploy to Railway/Fly.io
3. ⬜ Configure production secrets
4. ⬜ Set up Redis for BullMQ (optional)
5. ⬜ Enable preview server infrastructure
