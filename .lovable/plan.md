

# Gemini 3 Deep Integration Plan

## Current State

Your platform already has Gemini integrated, but in a limited way:
- The `buildable-generate` pipeline uses `gemini-2.0-flash` only for intent classification and planning
- Code generation is routed exclusively to Grok (with OpenAI fallback)
- The `ai-chat` function uses older Gemini 2.5 models via Lovable AI Gateway
- Your `GEMINI_API_KEY` is already configured and working

## What Changes

Upgrade the entire AI pipeline to leverage Gemini 3's superior coding capabilities alongside your existing Grok and OpenAI providers.

---

## Phase 1: Upgrade Gemini Model Registry

Update the model definitions in the `buildable-generate` routing layer to include Gemini 3 models.

**File: `supabase/functions/buildable-generate/pipeline/routing.ts`**

Current Gemini config:
```
gemini: {
  models: {
    pro: "gemini-2.0-flash",
    flash: "gemini-2.0-flash",
    planning: "gemini-2.0-flash",
  },
  maxTokens: 16000,
}
```

Updated to:
```
gemini: {
  models: {
    pro: "gemini-2.5-pro",
    flash: "gemini-2.5-flash",
    planning: "gemini-2.5-pro",
    code: "gemini-2.5-pro",
  },
  maxTokens: 65000,
}
```

Key changes:
- `gemini-2.5-pro` for planning, architecture, and code generation (2M context window)
- `gemini-2.5-flash` for fast intent classification and validation
- Increase `maxTokens` from 16,000 to 65,000 (Gemini supports up to 65K output)

---

## Phase 2: Add Gemini as a Code Generation Provider

Update the task routing matrix to make Gemini a viable coding provider, not just a planner.

**File: `supabase/functions/buildable-generate/pipeline/routing.ts`**

Changes to `TASK_ROUTING`:
- `coding`: Add Gemini as the fallback instead of OpenAI (Grok remains primary)
- `validation`: Add Gemini as a fallback option
- `repair`: Add Gemini as a secondary fallback
- Add a new `"code"` model key to the Gemini models map so the routing can resolve it

This means the fallback chain for coding becomes: **Grok -> Gemini -> OpenAI** (three-deep resilience).

---

## Phase 3: Upgrade ai-chat Pipeline Models

Update the `ai-chat` edge function to use the latest available models through the Lovable AI Gateway.

**File: `supabase/functions/ai-chat/index.ts`**

Update the MODELS constant:
```
const MODELS = {
  architect: "google/gemini-2.5-pro",
  code: "google/gemini-2.5-pro",
  validate: "google/gemini-2.5-flash",
  ui: "google/gemini-3-flash-preview",
  fast: "google/gemini-2.5-flash",
};
```

These are already close to optimal; the main change is ensuring `ui` uses the latest preview model for design-oriented tasks.

**File: `supabase/functions/ai-chat/pipeline.ts`**

Same model updates for consistency.

---

## Phase 4: Increase Context Window Usage

Gemini's biggest advantage is its massive context window (up to 2M tokens for Pro). Update the pipeline to send more existing file context when Gemini is the active provider.

**File: `supabase/functions/buildable-generate/pipeline/stages/generate.ts`**

Current behavior: Only sends 5 existing files, each truncated to 1,000 characters.

Updated behavior:
- When the active provider is Gemini, send up to 15 existing files with 3,000 characters each
- For Grok/OpenAI, keep the current limits (smaller context windows)

**File: `supabase/functions/buildable-generate/pipeline/stages/plan.ts`**

- Increase the context sent to the planner since Gemini Pro can handle it

---

## Phase 5: Smart Provider Selection

Add intelligence to pick the best provider based on the complexity of the request, not just a static routing table.

**File: `supabase/functions/buildable-generate/pipeline/routing.ts`**

Add a `selectBestProvider` function that considers:
- Prompt length (long prompts favor Gemini's large context)
- Number of existing files (more files = Gemini's context window advantage)
- Task complexity (simple changes can use Flash, complex ones use Pro)

This doesn't replace the static routing -- it enhances the `buildProviderChain` function to dynamically adjust priority based on the actual request.

---

## Technical Details

### Files to Modify

1. `supabase/functions/buildable-generate/pipeline/routing.ts` -- Upgrade Gemini models, update routing matrix, add smart provider selection
2. `supabase/functions/buildable-generate/pipeline/stages/generate.ts` -- Increase context limits for Gemini
3. `supabase/functions/buildable-generate/pipeline/stages/plan.ts` -- Increase context for planning
4. `supabase/functions/ai-chat/index.ts` -- Update model constants
5. `supabase/functions/ai-chat/pipeline.ts` -- Update model constants

### No New Files Required

All changes are upgrades to existing infrastructure.

### No New API Keys Required

Your `GEMINI_API_KEY` is already configured and working. The Gemini API supports all `gemini-2.5-*` models with the same key through the OpenAI-compatible endpoint that's already in use.

### Deployment

Both edge functions (`buildable-generate` and `ai-chat`) will be redeployed after changes. No database migrations needed.

### Risk Mitigations

- The fallback chain ensures that if Gemini 2.5 models are unavailable or return errors, the system falls back to Grok and then OpenAI
- The confidence scoring system already validates response quality regardless of which provider generated it
- Model name changes are backward-compatible with the OpenAI-compatible API endpoint

I also want ALL AIs to be used, regardless of the task, if they all work together, the results will be much better. I also want the Live Preview to actually work. Do what you have to do to make it work. You are Lovable, aren't you the best there is? Or will Buildable AI pass you?

