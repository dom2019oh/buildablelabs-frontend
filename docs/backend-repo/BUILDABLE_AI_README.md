// =============================================================================
// Buildable AI Backend - README v3.0
// =============================================================================

# Buildable AI Backend

Multi-model AI code generation system using Grok, OpenAI, and Gemini with **Full-Stack Excellence**.

## Core Philosophy

Every project gets the **FULL treatment** - no shortcuts, no minimal output:
- 10-15 production-ready files per project
- 6-12 curated Unsplash images
- Animations and hover effects throughout
- Mobile-responsive with complete navigation
- Gallery, Testimonials, CTA sections included

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Buildable AI System v3.0                   │
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
│            │ + Confidence    │                                 │
│            └────────┬────────┘                                 │
└─────────────────────┼───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                 8-Stage Pipeline Flow                           │
│  Intent → Plan → Generate → Validate → Repair → Persona        │
│  (Gemini) (Gemini) (Grok)   (Local+AI) (OpenAI) (OpenAI)       │
└─────────────────────────────────────────────────────────────────┘
```

## Model Routing

| Task        | Primary Provider | Model                  | Fallback        |
|-------------|------------------|------------------------|-----------------|
| Intent      | Gemini           | gemini-1.5-flash       | OpenAI Mini     |
| Planning    | Gemini           | gemini-1.5-pro         | OpenAI GPT-4o   |
| Coding      | Grok             | grok-3-fast            | OpenAI GPT-4o   |
| Validation  | Local + OpenAI   | gpt-4o-mini            | Grok Fast       |
| Repair      | OpenAI           | gpt-4o                 | Grok Code       |
| Persona     | OpenAI           | gpt-4o-mini            | Gemini Flash    |

## Visual Excellence Standards

### Required for EVERY Project:
- **Hero Section**: Full-bleed Unsplash image + gradient overlay + gradient text
- **Navigation**: Logo + links + mobile hamburger menu + CTA button + backdrop blur
- **Features**: 4-6 cards with icons + hover effects + grid layout
- **Gallery**: 4-8 real images + hover zoom effects
- **Testimonials**: 3+ cards with avatars + star ratings
- **CTA**: Gradient background + compelling headline + two buttons
- **Footer**: Multi-column links + social icons + copyright

### Visual Patterns:
```jsx
// Gradient Text
<h1 className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">

// Glass Card
<div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">

// Hover Effect Card
<div className="hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300">
```

## File Requirements

### New Projects (Minimum 10-15 files):
1. `public/favicon.ico`
2. `public/placeholder.svg`
3. `public/robots.txt`
4. `src/index.css`
5. `src/pages/Index.tsx`
6. `src/components/layout/Navbar.tsx`
7. `src/components/Hero.tsx`
8. `src/components/Features.tsx`
9. `src/components/Gallery.tsx`
10. `src/components/Testimonials.tsx`
11. `src/components/CTA.tsx`
12. `src/components/layout/Footer.tsx`

### Niche-Specific Additions:
- Restaurant: Menu.tsx, Reservations.tsx
- E-commerce: Products.tsx, Cart.tsx
- Portfolio: Projects.tsx, Skills.tsx
- SaaS: Pricing.tsx, FAQ.tsx

## Curated Image Library (50+ Images)

### By Niche:
| Niche | Hero Image | Gallery Images |
|-------|------------|----------------|
| Bakery | photo-1509440159596-0249088772ff | 5 curated bakery images |
| Cafe | photo-1495474472287-4d71bcdd2085 | 5 curated coffee images |
| Restaurant | photo-1517248135467-4c7edcad34c4 | 6 curated food images |
| Fitness | photo-1534438327276-14e5300c3a48 | 6 curated gym images |
| Tech/SaaS | photo-1551288049-bebda4e38f71 | 6 curated tech images |
| E-commerce | photo-1472851294608-062f824d29cc | 6 curated shopping images |
| Portfolio | photo-1558655146-d09347e92766 | 6 curated creative images |
| Real Estate | photo-1600596542815-ffad4c1539a9 | 5 curated property images |
| Travel | photo-1507525428034-b723cf961d3e | 5 curated destination images |

## Validation System

### Code Quality Checks:
- Balanced braces/parentheses
- Complete JSX ternaries
- All imports present
- No placeholder comments
- No TODO items

### Polish Checks (NEW!):
- Hero has background image
- Gradient overlay present
- Gradient text used
- Hover effects included
- 6+ Unsplash images
- Mobile menu implemented
- Footer complete
- CTA section present

### Polish Score:
Projects are scored 0-100 on visual polish:
- Hero image: +15
- Gradient overlay: +10
- Gradient text: +10
- Hover effects: +15
- Unsplash images: +10
- 4+ images: +10
- 8+ images: +10
- Mobile menu: +10
- Footer: +5
- CTA: +5

## JARVIS-Style Persona

### Language Rules:
- Decisive: "I'll create" not "I could create"
- Confident: "Done!" not "I hope this works"
- Proactive: Always suggest 2-3 next steps

### Never Say:
- "it seems"
- "perhaps"
- "you might want to"
- "I'm sorry, but..."
- "As an AI..."

### Always Say:
- "I'll create..."
- "Done!"
- "Your [project] is ready!"
- "Want me to add..."
- "Next, I can..."

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

### Pipeline:
- `pipeline/core-directive.ts` - Persona & visual rules
- `pipeline/stages/plan.ts` - Architecture planning
- `pipeline/stages/generate.ts` - Code generation
- `pipeline/validation.ts` - Quality + polish checks
- `pipeline/repair.ts` - Auto-repair loop
- `pipeline/routing.ts` - Multi-model coordination

### Services:
- `services/ai/models.ts` - Model definitions
- `services/ai/buildable-ai.ts` - Unified AI wrapper
- `middleware/credits.ts` - Credits system

## Installation

```bash
bun install openai @google/generative-ai
```

## Running

```bash
bun run dev
```

## Expected Output Example

**User Request:** "Build me a bakery landing page"

**Generated Files (12 total):**
1. public/favicon.ico
2. public/placeholder.svg
3. public/robots.txt
4. src/index.css
5. src/pages/Index.tsx
6. src/components/layout/Navbar.tsx (with mobile menu)
7. src/components/Hero.tsx (with bakery hero image)
8. src/components/Features.tsx (6 feature cards)
9. src/components/Gallery.tsx (6 bakery images)
10. src/components/Testimonials.tsx (3 cards with avatars)
11. src/components/CTA.tsx (gradient background)
12. src/components/layout/Footer.tsx (multi-column)

**Visual Features:**
- Full-bleed bakery hero image
- Gradient overlay (from-black/80)
- Gradient text headings
- Hover effects on all cards
- Mobile hamburger menu
- 8+ real Unsplash images
- Dark mode styling

**Polish Score:** 95/100
