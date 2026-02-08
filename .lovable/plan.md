

# Upgrade AI Generation Quality, Library Integration, and Page Completion

## Overview

This plan addresses three core issues with the AI generation system:
1. **Design quality** -- Generated designs need to be more visually polished and creative
2. **Library integration** -- Users should be able to request backgrounds, components, and templates by name and have them injected automatically
3. **Page completeness** -- The AI must finish what it starts (no half-built pages)

---

## Problem Analysis

From exploring the codebase, here are the root causes:

**Design Quality Issues:**
- The `CODER_SYSTEM_PROMPT` includes the core directive sections, but the actual generation prompt sent to the AI model is very compact and lacks specificity on modern design patterns (animations, spacing, typography hierarchy, micro-interactions)
- The hardcoded template fallbacks (hero, features, gallery, etc.) are basic and use minimal styling
- Polish Score threshold is set to 70 but the scoring system only gives points for basic things (gradients, hover, images) -- it doesn't check for spacing, typography, or visual hierarchy

**Library Integration Issues:**
- The three libraries exist in the frontend (`component-library.ts`, `background-library.ts`, `page-library.ts`) but the backend pipeline has **zero awareness** of them
- The intent stage doesn't detect library references like "use the Ocean Blue background" or "add the Glass Navbar"
- There's no mechanism to look up a library item by name and inject its code into the generation context

**Page Completeness Issues:**
- The validation system only checks for syntax errors (braces, parentheses, imports) -- it doesn't verify that all planned components/sections are actually present in the output
- When the AI produces 5 files instead of the planned 10, there's no enforcement loop
- The repair system only fixes syntax, not missing content

---

## Implementation Plan

### Part 1: Inject Library Awareness into the Backend Pipeline

**File: `supabase/functions/buildable-generate/pipeline/libraries.ts` (NEW)**

Create a server-side copy of all three library definitions (backgrounds, components, pages) as a single module the pipeline can reference. This includes:
- A lookup function `findLibraryItem(query: string)` that fuzzy-matches user prompts against library item names/IDs
- An export of all library names as a reference catalog that can be injected into the AI prompt

**File: `supabase/functions/buildable-generate/pipeline/stages/intent.ts` (MODIFY)**

Add library detection to the intent stage:
- Scan the user prompt for known library item names (e.g., "Ocean Blue", "Glass Navbar", "Mesh Gradient", "Pricing Cards")
- Add a new intent type `"use_library"` that flags when a user is requesting a specific library asset
- Return matched library items in the intent result so downstream stages can use them

**File: `supabase/functions/buildable-generate/pipeline/types.ts` (MODIFY)**

- Add `libraryMatches` field to `IntentResult` to carry matched library items through the pipeline
- Add `"use_library"` to the `IntentType` union

### Part 2: Wire Library Items into Code Generation

**File: `supabase/functions/buildable-generate/pipeline/stages/generate.ts` (MODIFY)**

- When library matches are found in the intent, inject the actual library code into the AI prompt as reference material (e.g., "The user wants the 'Ocean Blue' background. Here is the exact code to use: ...")
- For background requests specifically, inject the background CSS/classes directly rather than asking the AI to recreate them
- For component requests, provide the full component code from the library as a starting template

**File: `supabase/functions/buildable-generate/pipeline/stages/plan.ts` (MODIFY)**

- When library items are detected, include them in the architecture plan with their exact code references
- This ensures the generate stage knows exactly which library assets to incorporate

### Part 3: Improve Design Quality

**File: `supabase/functions/buildable-generate/pipeline/core-directive.ts` (MODIFY)**

Add a new `DESIGN_EXCELLENCE` section to the core directive that enforces:
- **Typography hierarchy**: Specific font size scales (hero text at text-5xl to text-7xl, section headings at text-3xl to text-4xl, proper line-height and letter-spacing)
- **Spacing system**: Consistent use of py-24 for sections, gap-8 for grids, proper padding ratios
- **Micro-interactions**: Required animations on scroll, staggered card appearances, smooth hover transitions with transform and shadow
- **Visual depth**: Layered backgrounds with multiple gradient overlays, glassmorphism with varied blur levels, subtle border gradients
- **Color sophistication**: Beyond basic purple-pink gradients -- provide specific color palettes for different project types (warm, cool, earthy, neon)
- **Real content**: Never use "Lorem ipsum" or single-word placeholders -- generate realistic copy that matches the project niche

**File: `supabase/functions/buildable-generate/pipeline/stages/generate.ts` (MODIFY)**

Upgrade the hardcoded template fallbacks:
- Replace the compact, minified template strings with properly formatted, visually richer templates
- Add better spacing, animations (fade-in on scroll), more detailed section content
- Include more image variety per niche (use 4-5 images instead of 2-3)

### Part 4: Enforce Page Completeness

**File: `supabase/functions/buildable-generate/pipeline/validation.ts` (MODIFY)**

Add completeness checks to the validation system:
- Compare generated files against the architecture plan -- if the plan calls for 10 files and only 6 were generated, flag as incomplete
- Check that every planned component path exists in the generated output
- Verify that component files contain actual rendered JSX (not just empty exports)
- Add a `completeness` score separate from the `polish` score, both required to pass

**File: `supabase/functions/buildable-generate/pipeline/repair.ts` (MODIFY)**

Enhance the repair loop to handle incompleteness:
- When files are missing from the plan, trigger a targeted generation call specifically for the missing files
- Pass the existing files as context so the new files maintain consistency
- The repair prompt should explicitly list which files are missing and what they should contain based on the plan

**File: `supabase/functions/buildable-generate/pipeline/index.ts` (MODIFY)**

Add a completeness gate between generation and validation:
- After generation, compare output against the plan
- If less than 80% of planned files were generated, trigger a "completion pass" that generates only the missing files
- This runs before validation so the full set of files gets validated together

---

## Technical Details

### Library Matching Algorithm

The `findLibraryItem` function will use a simple but effective approach:
1. Normalize the user prompt to lowercase
2. Check for exact ID matches (e.g., "ocean-blue", "glass-navbar")
3. Check for name substring matches (e.g., "ocean blue" matches "Ocean Blue")
4. Check for category mentions with adjectives (e.g., "blue gradient" matches gradients with "blue")
5. Return all matches with confidence scores

### Completeness Validation Logic

```text
Plan says:          Generated:          Action:
10 files            10 files            -> Pass (validate normally)
10 files            7 files             -> Completion pass (generate 3 missing)
10 files            3 files             -> Re-generate (too few, full retry)
```

### Files Changed Summary

| File | Action | Purpose |
|------|--------|---------|
| `pipeline/libraries.ts` | Create | Server-side library catalog with fuzzy matching |
| `pipeline/stages/intent.ts` | Modify | Detect library references in user prompts |
| `pipeline/types.ts` | Modify | Add library match types to pipeline context |
| `pipeline/stages/plan.ts` | Modify | Include library items in architecture plan |
| `pipeline/stages/generate.ts` | Modify | Inject library code into AI prompt, upgrade templates |
| `pipeline/core-directive.ts` | Modify | Add design excellence standards |
| `pipeline/validation.ts` | Modify | Add completeness checking |
| `pipeline/repair.ts` | Modify | Handle missing files in repair loop |
| `pipeline/index.ts` | Modify | Add completeness gate before validation |

All changes are within the `supabase/functions/buildable-generate/pipeline/` directory. The edge function will be redeployed after changes.

