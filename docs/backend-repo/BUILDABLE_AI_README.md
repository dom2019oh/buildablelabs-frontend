// =============================================================================
// Buildable AI Backend - README
// =============================================================================

# Buildable AI Backend

Multi-model AI code generation system using Grok, OpenAI, and Gemini.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Buildable AI System                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                     │
│  │  Grok   │    │ OpenAI  │    │ Gemini  │                     │
│  │(xAI)    │    │         │    │(Google) │                     │
│  │Coding   │    │Reasoning│    │Planning │                     │
│  └────┬────┘    └────┬────┘    └────┬────┘                     │
│       └──────────────┼──────────────┘                          │
│                      ▼                                          │
│            ┌─────────────────┐                                 │
│            │ Dynamic Routing │                                 │
│            │ (Task-Based)    │                                 │
│            └────────┬────────┘                                 │
└─────────────────────┼───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Pipeline Flow                               │
│  Architect → Coder → Validator → Refiner                       │
│  (Gemini)   (Grok)   (Grok)     (OpenAI)                       │
└─────────────────────┼───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌─────────┐  ┌─────────────┐  ┌───────────────┐ │
│  │ Supabase │  │ BullMQ  │  │ Realtime    │  │ Credits       │ │
│  │ DB + RLS │  │ Queue   │  │ Updates     │  │ System        │ │
│  └──────────┘  └─────────┘  └─────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Model Routing

| Task        | Primary Provider | Model                  | Fallback        |
|-------------|------------------|------------------------|-----------------|
| Planning    | Gemini           | gemini-2.5-pro         | OpenAI GPT-5    |
| Coding      | Grok             | grok-code-fast-1       | OpenAI GPT-5    |
| Debugging   | Grok             | grok-code-fast-1       | OpenAI GPT-5    |
| Reasoning   | OpenAI           | gpt-5.2                | Gemini Pro      |
| Multimodal  | Gemini           | gemini-3-pro-preview   | Grok Vision     |
| Validation  | Grok             | grok-4.1-fast          | OpenAI Nano     |

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# AI Providers (at least one required)
GROK_API_KEY=your_grok_api_key
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key

# Redis (for job queue)
REDIS_URL=redis://localhost:6379

# Credits
CREDITS_COST_MULTIPLIER=0.001
DAILY_FREE_CREDITS=5
```

## API Endpoints

### Generation
- `POST /generate/:workspaceId` - Start generation
- `POST /generate/:workspaceId/refine` - Refine existing
- `POST /generate/:workspaceId/estimate` - Estimate credits
- `GET /generate/session/:sessionId` - Get status
- `POST /generate/session/:sessionId/cancel` - Cancel

### Credits
- `GET /user/credits` - Get balance
- `POST /user/credits/claim-daily` - Claim daily bonus
- `GET /user/credits/history` - Transaction history

## Key Files

- `src/services/ai/models.ts` - Model definitions
- `src/services/ai/buildable-ai.ts` - Unified AI wrapper
- `src/services/ai/pipeline.ts` - Generation orchestration
- `src/services/ai/architect.ts` - Planning (Gemini)
- `src/services/ai/coder.ts` - Code generation (Grok)
- `src/services/ai/validator.ts` - Validation (Grok+OpenAI)
- `src/middleware/credits.ts` - Credits system
- `src/api/generate.ts` - Generation routes
- `src/api/credits.ts` - Credits routes

## Installation

```bash
bun install openai @google/generative-ai
```

## Running

```bash
bun run dev
```
