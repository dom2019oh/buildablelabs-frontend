

# Plan: Enhance Buildable AI Core Directive for In-Depth Full-Stack Generation

## Overview

You want to enhance the Buildable AI system to generate more in-depth, visually stunning web applications — similar to how Lovable operates. Even when a user asks for a "basic landing page," the system should generate production-ready, beautifully designed full-stack applications with no compromises.

The current system already has a solid foundation:
- **8-stage deterministic pipeline** (Intent → Plan → Generate → Validate → Repair)
- **Multi-model coordination** (Grok for coding, Gemini for planning, OpenAI for validation)
- **Core directive with code quality rules** and visual standards

This plan will **supercharge** the core directive and generation prompts to ensure every output is visually stunning, complete, and production-ready.

---

## Phase 1: Enhance Core Directive (Lovable-Inspired)

**File:** `supabase/functions/buildable-generate/pipeline/core-directive.ts`

### New Capabilities:
1. **Full-Stack Mindset Directive**
   - Generate complete applications, not basic pages
   - Always include navigation, multiple sections, animations, and footer
   - Even "simple" requests get the full treatment

2. **Visual Excellence Standards** (Enhanced)
   - Every project includes 6-12 Unsplash images automatically
   - Hero sections with gradient overlays are mandatory
   - Feature sections use icon cards with hover states
   - Gallery sections with real images, not placeholders
   - Testimonials with professional avatars
   - Call-to-action sections with gradient backgrounds

3. **Component Completeness Rules**
   - Every Navbar must have: logo, links, mobile hamburger menu, CTA button
   - Every Hero must have: full-bleed background, gradient overlay, headline, subheadline, 2 CTA buttons
   - Every Feature section: 4-6 feature cards with icons
   - Every Footer: multi-column links, social icons, copyright

4. **Animation & Polish Requirements**
   - Hover effects on all interactive elements
   - Smooth transitions (transition-all duration-300)
   - Gradient text for headings
   - Backdrop blur on navigation
   - Shadow effects on buttons

5. **Persona Updates** (Jarvis-Style)
   - Decisive language: "I'll create" not "I could create"
   - Confident: "Done!" not "I hope this works"
   - Never say: "it seems," "perhaps," "you might want to," "I'm sorry but"
   - Always suggest 2-3 next steps

---

## Phase 2: Enhance Generation Prompts

**File:** `supabase/functions/buildable-generate/pipeline/stages/generate.ts`

### Updates to CODER_SYSTEM_PROMPT:
1. **Minimum File Requirements**
   - New projects generate 8-12 files minimum (currently 6-10)
   - Always include: Gallery, Testimonials, About section

2. **Enhanced Visual Patterns**
   - Add gradient text utility patterns
   - Add glass-morphism card patterns  
   - Add animated hover card patterns
   - Add testimonial card patterns with avatars

3. **Image Auto-Selection**
   - Detect niche from prompt automatically
   - Inject 4-8 relevant Unsplash images
   - For unknown niches, use curated "professional" image set

4. **Section Templates**
   - Add pre-defined section patterns for:
     - Hero (3 variants)
     - Features (grid, list, alternating)
     - Gallery (masonry, slider, grid)
     - Testimonials (carousel, cards, quotes)
     - Pricing (3-column, toggle)
     - CTA (gradient, image, minimal)

---

## Phase 3: Enhance Planning Stage

**File:** `supabase/functions/buildable-generate/pipeline/stages/plan.ts`

### Updates to ARCHITECT_SYSTEM_PROMPT:
1. **Force Rich Architecture**
   - Even "simple" requests get full-featured plans
   - Minimum 6 components for any project
   - Always include gallery and testimonials sections

2. **Expanded Image Library**
   - 50+ curated images across 15 niches
   - Auto-detect industry from keywords
   - Fallback to professional/tech images

3. **Enhanced Section Planning**
   - Plans include specific sections with details
   - Each component gets feature requirements
   - Image assignments per section

---

## Phase 4: Strengthen Validation

**File:** `supabase/functions/buildable-generate/pipeline/validation.ts`

### New Validation Rules:
1. **Image Presence Check**
   - Flag if Hero has no background image
   - Warn if no Unsplash images detected

2. **Section Completeness Check**
   - Warn if under 5 components
   - Warn if no footer detected
   - Warn if no CTA section

3. **Polish Check**
   - Warn if no hover effects detected
   - Warn if no gradient usage detected

---

## Phase 5: Update Backend Documentation

**File:** `docs/backend-repo/BUILDABLE_AI_README.md`

Update to reflect:
- New visual excellence standards
- Enhanced file generation requirements
- Updated model routing (current models)
- New validation rules

**File:** `docs/backend-repo/src/services/ai/pipeline/stages/generate.ts`

Sync with the edge function version for consistency.

---

## Technical Changes Summary

| File | Changes |
|------|---------|
| `supabase/functions/buildable-generate/pipeline/core-directive.ts` | Add full-stack mindset, visual excellence v2, component completeness rules, animation requirements, Jarvis persona |
| `supabase/functions/buildable-generate/pipeline/stages/generate.ts` | Enhance CODER_SYSTEM_PROMPT with richer patterns, 8-12 file minimum, expanded templates |
| `supabase/functions/buildable-generate/pipeline/stages/plan.ts` | Force rich architecture, expanded image library (50+ images), section-level planning |
| `supabase/functions/buildable-generate/pipeline/validation.ts` | Add image presence, section completeness, and polish validation rules |
| `docs/backend-repo/BUILDABLE_AI_README.md` | Update documentation to reflect new standards |
| `docs/backend-repo/src/services/ai/pipeline/stages/generate.ts` | Sync generate.ts with edge function version |

---

## Expected Outcome

After implementation:
- User asks: "Build me a bakery landing page"
- System generates:
  - 10+ files (Navbar, Hero, About, Features, Gallery, Menu, Testimonials, CTA, Contact, Footer)
  - 6-8 bakery-specific Unsplash images
  - Animations and hover effects throughout
  - Mobile-responsive with hamburger menu
  - Dark mode color scheme with bakery accents
  - Gradient overlays and glass effects
  - Complete, production-ready code

The result will be indistinguishable from what a senior developer would build — beautiful, functional, and complete.

---

## Deployment Notes

1. Changes to edge functions deploy automatically
2. No database changes required
3. No new dependencies needed
4. Backend docs are for reference only (manual sync with external repo)

