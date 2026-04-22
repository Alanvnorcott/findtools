# AGENT.md

Findtools.net is a frontend-only utility platform made up of many small, fast, browser-based tools.

The goal is not to build “features.”  
The goal is to build a large, consistent surface of highly usable tools that solve small problems instantly.

This site should feel like a clean workspace users keep open while working.

---

## Core Product Identity

Findtools.net = fast, reliable, no-friction utilities.

Every decision should reinforce:
- speed
- clarity
- consistency
- low visual noise
- zero friction

This is not:
- a SaaS product
- a dashboard
- a feature-heavy application
- a marketing site

---

## Hard Constraints

These are absolute and must never be violated:

1. No backend
2. No authentication
3. No database
4. No server-side processing
5. No sending user data to external services
6. All tools must run entirely in the browser
7. The site must remain deployable as static hosting

---

## Source of Truth

Before building or modifying any tool:

READ `TOOL.md`

`TOOL.md` defines:
- how tools are structured
- how they behave
- how they are categorized
- how they look and feel

If anything conflicts with assumptions, follow `TOOL.md`.

---

## Product Philosophy

Users come here to:
- solve something quickly
- not think
- not sign up
- not wait

Every tool should feel:
- instant
- obvious
- reliable

If a tool requires explanation, it is too complex.

---

## UX Rules

Every tool must:

- show its purpose immediately
- make input obvious
- produce output quickly
- allow easy copy of results
- allow quick reset/clear

Avoid:
- multi-step flows
- hidden options
- modals
- unnecessary clicks

The interaction loop should be:

input → result → copy → done

---

## Design System Rules

Most styling must be shared across the entire site.

The design should feel:
- clean
- modern
- minimal
- calm
- work-focused

Avoid:
- clutter
- loud colors
- heavy shadows
- visual noise
- “startup landing page” aesthetics

Users should be able to keep this open all day without fatigue.

---

## Layout Expectations

Every tool page should follow a consistent structure:

1. Tool title
2. One-line description
3. Input section
4. Output section
5. Utility actions (copy, clear, reset)
6. Optional helper text
7. Related tools (if applicable)

No page should feel custom or inconsistent without strong reason.

---

## Tool Architecture

All tools must follow a standardized pattern:

- centralized metadata
- category assignment
- shared page shell
- reusable components
- isolated logic
- SEO metadata expansion
- internal linking
- repeatable long-tail coverage rules

Each tool must be easy to:
- add
- modify
- scale
- reuse patterns from

This project should scale cleanly to 100+ tools.
It should also scale cleanly to hundreds of search-targeted pages without becoming a hand-authored mess.

## Shared Coding Tool Rule

If a tool behaves differently by programming language, do not build a separate implementation for each language.

Use the shared `codingLanguageEngine` instead:
- register language capabilities in the engine
- route tool behavior through `format`, `minify`, `validate`, or `transform`
- keep UI wrappers thin and registry-driven

If a new high-value language variant page is needed, add a registry entry or generated variant that preselects the language.
Do not fork the logic into a new component just to support one language-specific page.

## Code Editor Rule

If a tool meaningfully edits, formats, validates, generates, or displays code, config, markup, queries, or command text, use the shared highlighted code editor surface instead of a plain textarea whenever practical.

Use:
- the shared `CodeEditor` components for code input/output
- the shared language mapping rather than per-tool syntax setup
- lazy loading so code editor dependencies do not affect non-code tools

Do not introduce Monaco for ordinary code fields.
Use lightweight shared editor infrastructure by default.

## IDE Rule

IDE-style pages are a special case.

They must:
- use the shared `ideEngine`
- lazy-load their editor/runtime assets
- avoid increasing the main app bundle for non-IDE users
- keep drafts local in browser storage only

Prefer lightweight in-browser runners first.
Do not introduce massive language payloads into the main app path just to make IDE pages exist.
If a language runtime must be heavier, isolate it behind per-language lazy loading.

Every runnable IDE language should have:
- a starter snippet that actually produces output
- a deterministic runtime test
- clear UI copy about whether it uses a worker sandbox or lightweight local runner

## SEO System Requirement

Findtools is not just a UI catalog.
It is a search coverage engine built from tools.

Every meaningful tool should be treated as an independent SEO surface with:
- one primary keyword
- several long-tail variants
- a clear canonical slug
- dense internal links
- real explanatory content

Avoid vague, broad targets like "math tool" or "text utility".
Prefer high-intent phrases like "percentage increase calculator" or "json formatter".

Where possible, reuse the programmatic SEO graph layer instead of hand-writing disconnected metadata.
If a new repeatable SEO rule emerges, document it in `TOOL.md` and/or `README.md`.

---

## Categories

Tools must be grouped into clear categories:

- Text + Data
- File Tools
- Calculators
- Dev + Tech
- Generators
- Conversion
- Comparison

Categories are used for:
- navigation
- SEO structure
- user discovery

---

## Search and Discovery

The site must support:

- search by tool name
- search by tags
- category browsing

Optional (preferred):
- recent tools (local storage)
- pinned tools (local storage)

---

## Performance Rules

Speed is a core feature.

Prioritize:
- minimal dependencies
- code reuse
- small bundles

## Test Expectation

New deterministic logic should ship with a small unit test by default.

The baseline test mix should now include:
- pure logic tests for the main deterministic behavior
- registry validation for slug and alias uniqueness when touching shared metadata
- lightweight jsdom render smoke tests for app startup and any unusual UI surface
- crash-boundary coverage so startup failures do not collapse into a blank page

If a change can break first render, routing, or a high-value shared component, add or update a UI smoke test.
Do not skip this for shared shells, routing, editor systems, registry systems, or IDE pages.

Preferred pattern:
- put shared coding logic in `src/lib/codingLanguageEngine.js` or `src/lib/toolLogic/*.js`
- test valid path plus one or two meaningful edge cases
- if a tool is very low-tier filler with almost no demand, a missing test can be acceptable, but that should be the exception rather than the rule
- fast load times

Avoid:
- large libraries for simple problems
- global dependencies used by only one tool

---

## File Handling Rules

If a tool uses files:

- processing must happen locally in the browser
- no uploads to servers
- no hidden network calls

Examples:
- PDF tools
- image tools

---

## State Rules

Use local state by default.

If persistence is needed, use:
- localStorage
- sessionStorage

Never require stored state for core functionality.

---

## Content Rules

Keep all text:

- short
- direct
- functional

Do not include:
- marketing copy
- hype language
- fake features
- upsells
- pricing language

---

## Adding a New Tool

When adding a tool:

1. Read `TOOL.md`
2. Define metadata
3. Assign category
4. Use shared layout
5. Follow input/output standards
6. Implement logic fully in browser
7. Add copy/reset behavior
8. Add or update a small unit test for the core logic unless the tool is intentionally marked as very low-tier / low-demand filler

## Testing Requirement

Testing is the default, not an afterthought.

For any tool with real demand, reuse potential, or meaningful logic:
- extract core deterministic logic into `src/lib/toolLogic/` when practical
- add or extend a small Vitest file
- cover:
  - the main valid path
  - one important edge case
  - invalid handling if applicable

Only skip tests when the tool is clearly very low-tier, trivial, and unlikely to justify maintenance overhead.
If you skip tests, keep the implementation especially simple and do not skip them by accident.
8. Add tags for search
9. Ensure visual consistency

---

## Editing a Tool

When modifying a tool:

- preserve shared design system
- reduce complexity if possible
- avoid one-off patterns
- keep behavior predictable

---

## What Success Looks Like

A good tool:

- solves one specific problem
- works instantly
- requires no explanation
- matches every other tool visually
- feels like part of a system, not a one-off page

---

## What Failure Looks Like

- tool feels like a mini-app
- tool requires explanation
- UI differs from rest of site
- unnecessary features are added
- backend assumptions appear

---

## Final Standard

Findtools.net should feel like:

“A fast, clean, reliable place to fix small problems instantly.”

If a change does not reinforce that, it should not be added.

ALSO, it should be optimized for ADs when the time comes. EVERYWHERE.

## Layout Discipline

This site is a working utility surface. Layout must feel controlled.

Rules:
1. Tool pages must not grow vertically without restraint.
2. Input and output sections should remain visually contained.
3. Output panels must have max heights where appropriate and scroll internally.
4. Long content must scroll inside the result container instead of expanding the page excessively.
5. Large pasted input or output should not break the page layout.
6. Tools should feel compact enough to keep open beside other work.
7. ALLOW FUTURE AD OPTIMIZATION BY PROVIDER STANDARDS.

Prefer a dense but readable layout over oversized spacing.
Do not design for screenshots. Design for repeated daily use.

## Styling Rules

Use a restrained visual system.

Preferred defaults:
- small or medium border radius only
- thin borders
- subtle contrast
- minimal shadow or no shadow
- neutral backgrounds
- clear section separation
- compact spacing
- modest heading scale

Do not default to:
- large rounded corners
- giant padded cards
- soft-shadow-on-everything
- oversized hero-style spacing
- big glossy CTA buttons

Inputs and outputs should resemble serious productivity software, browser devtools, documentation tooling, or standard desktop utilities more than consumer SaaS marketing pages.
