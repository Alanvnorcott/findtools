# TOOL.md

This file defines how every tool in the site must be designed, implemented, categorized, and documented.

Every new tool must follow this contract.

## Tool purpose

A tool on this site is a focused browser-based utility that solves one clear micro-problem quickly and with minimal friction.

A tool is not:
- a dashboard
- a workflow app
- a SaaS product
- a multi-step wizard unless absolutely necessary
- a backend service
- a feature that requires login

## Hard constraints

Every tool must:
1. run entirely in the browser
2. require no backend
3. require no authentication
4. avoid sending user data to any server
5. be usable without an account
6. be understandable within seconds

## Required metadata contract

Each tool must define:

- `name`
- `slug`
- `category`
- `shortDescription`
- `seoTitle`
- `seoDescription`
- `tags`
- `keywords`
- `inputType`
- `outputType`
- `supportsCopy`
- `supportsClear`
- `supportsSampleData`
- `supportsFileInput`
- `relatedTools`

## Allowed categories

Every tool must belong to one primary category.

Allowed categories:
- Text + Data
- File Tools
- Calculators
- Dev + Tech
- Generators
- Conversion
- Comparison

If a tool could fit multiple categories, choose the one that best matches user intent.

## Tool page structure

Unless a different layout is clearly required, a tool page should follow this structure:

1. Tool title
2. Short one-sentence description
3. Main input section
4. Primary action section
5. Output section
6. Utility actions such as copy, clear, reset
7. Optional helper text
8. Optional related tools section

The page should be scannable and usable without reading long instructions.

## Design rules

Each tool should visually match the site-wide design system.

Default design expectations:
- shared page shell
- consistent spacing
- common typography scale
- common input styling
- common button styling
- common card/result container styling
- common validation styles

Do not create a custom visual style for a tool unless the tool would otherwise become less usable.

## Interaction rules

A tool should aim for the smallest possible interaction loop:

input → action or instant processing → output → copy/export/reset

Where sensible, prefer instant updates over forcing an extra click.

Each tool should support these behaviors where relevant:
- copy output
- clear input
- reset all
- sample input
- drag and drop for local files
- inline validation

Do not introduce unnecessary confirmations.

## Input rules

Inputs should be obvious and forgiving.

Good patterns:
- textarea for paste-heavy input
- field grouping for calculators
- file dropzone for local file tools
- toggles only when they materially change output

Bad patterns:
- hidden options
- over-configured forms
- long multi-step flows for a simple result

## Output rules

Output should be immediately visible and easy to use.

Good output properties:
- readable
- copyable
- clearly separated from input
- optionally downloadable if generated locally
- preserves formatting where needed

If the output is large, support scrolling cleanly.
If the output is structured, preserve alignment and readability.

## Validation rules

Validation should be lightweight and immediate.

Use short, direct messages.
Do not interrupt the user with modal errors.
Do not make the page feel fragile.

Examples:
- invalid JSON
- unsupported file type
- missing required numeric input

## File tool rules

If the tool accepts files:
1. processing must happen locally
2. do not upload files anywhere
3. communicate that processing happens in-browser if useful
4. support multiple file selection only when the task demands it
5. provide clear file state feedback

Examples of valid file tools:
- PDF merge
- PDF split
- image resize
- image compress
- image convert

## Calculator rules

A calculator should:
- make inputs explicit
- explain results clearly
- show units where relevant
- avoid ambiguous labels
- handle invalid numbers safely

A calculator should not require reading documentation.

## Dev + Tech tool rules

Dev tools should be fast and minimal.
They should feel keyboard-friendly and copy-friendly.

Examples:
- JSON formatter
- base64 encoder/decoder
- JWT decoder
- timestamp converter
- hash generator

Avoid overloading the page with advanced options unless they are truly useful.

## Generator rules

A generator should produce a useful result instantly.
It should make regeneration easy.
It should allow copying the result quickly.

Examples:
- password generator
- username generator
- UUID generator
- lorem ipsum generator

## SEO rules

Each tool should target one clear user intent.

That means:
- one page per tool
- clear page title
- clear meta description
- human-readable route
- useful H1
- concise supporting copy

Each tool should also define or derive:
- one primary keyword target
- 3 to 10 long-tail keyword variants
- missing variants that may deserve their own pages later
- 5 to 10 related tools for internal linking
- 150 to 300 words of real explanatory content

Do not stuff pages with filler text.

## Shared implementation expectation

Each tool should be built from a common internal pattern.

Suggested structure:
- metadata
- input schema or config
- core processing logic
- page component
- tests if included
- SEO enrichment or programmatic SEO data when relevant

Recommended test structure:
- move main logic into `src/lib/toolLogic/<category>.js` when practical
- add `src/lib/toolLogic/<category>.test.js`
- keep the test baseline small:
  - valid path
  - one important edge case
  - invalid handling if applicable

Keep tool logic isolated from presentation where possible.

## Unit test baseline

Each new tool should be able to add a very small unit test without mounting React.

Preferred pattern:
1. extract the main deterministic logic into a pure function
2. test that pure function with 2-3 focused assertions
3. leave UI rendering to the shared shell unless the tool has unusual rendering logic

Testing is expected for new tools by default.

Skip tests only when the tool is clearly very low-tier / low-demand, extremely trivial, and not worth ongoing maintenance overhead.
If you skip tests, that should be a deliberate judgment call, not the default path.

Do not import test code into runtime modules.
Do not add testing helpers to the production entry path.

## Goal statement requirement

Every tool must have a simple internal goal statement in code comments or metadata.

Format:
`Goal: Help the user <specific job> quickly and locally in the browser.`

Examples:
- `Goal: Help the user format and validate JSON quickly and locally in the browser.`
- `Goal: Help the user compare two blocks of text quickly and locally in the browser.`

## Definition of done

A tool is done when:
1. it solves one micro-problem clearly
2. it runs fully in-browser
3. it matches the shared design system
4. it is easy to understand immediately
5. it has metadata and category assignment
6. it supports the expected utility actions
7. it has a small unit test unless it was deliberately treated as low-tier / low-demand
8. it has real explanatory content and internal links when it is a meaningful search-targeted tool
9. it does not visually or architecturally drift from the rest of the site
