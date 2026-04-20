You are adding a new tool to the Findtools.net codebase.

Before doing anything:
1. Read AGENT.md
2. Read TOOL.md
3. Follow both strictly

Do not improvise architecture, styling, or patterns.

---

## TOOL DEFINITION (fill these in)

Tool Name:
{{TOOL_NAME}}

Slug (kebab-case, used in URL):
{{TOOL_SLUG}}

Category (must match existing categories exactly):
{{CATEGORY}}

Short Description (1 sentence, functional, no fluff):
{{SHORT_DESCRIPTION}}

Goal (what exact problem this solves):
{{GOAL_STATEMENT}}

Primary User Action (what the user is doing):
{{USER_ACTION}}

Input Type (textarea, inputs, file, etc.):
{{INPUT_TYPE}}

Output Type (text, formatted text, file, number, etc.):
{{OUTPUT_TYPE}}

Tags (comma separated):
{{TAGS}}

SEO Title:
{{SEO_TITLE}}

SEO Description:
{{SEO_DESCRIPTION}}

---

## FUNCTIONAL REQUIREMENTS

Define exactly what this tool should do:

{{FUNCTIONAL_REQUIREMENTS}}

---

## INPUT / OUTPUT EXAMPLES (optional but preferred)

Example Input:
{{EXAMPLE_INPUT}}

Example Output:
{{EXAMPLE_OUTPUT}}

---

## IMPLEMENTATION RULES

Follow these strictly:

1. Use the shared tool layout and components
2. Do not create a custom page layout unless absolutely necessary
3. Keep styling consistent with the rest of the site
4. Ensure the tool works entirely in the browser
5. Do not introduce backend logic or API calls
6. Ensure instant or near-instant feedback
7. Add copy functionality for outputs where relevant
8. Add clear/reset functionality
9. Add lightweight validation if needed
10. Keep the interaction simple:
   input → result → copy

---

## ARCHITECTURE TASKS

You must:

1. Add this tool to the centralized tool metadata registry
2. Assign the correct category
3. Register the route/page using the existing routing system
4. Use the shared tool shell/layout
5. Keep logic isolated and reusable where possible

---

## UX REQUIREMENTS

The tool must:

- be immediately understandable
- require no instructions to use
- not include unnecessary options
- not include modals unless required
- not include multi-step flows unless unavoidable

---

## DESIGN REQUIREMENTS

The tool must:

- match the shared design system
- use existing components
- maintain spacing and typography standards
- feel clean, fast, and minimal

Avoid:
- clutter
- excessive UI elements
- custom one-off styling

---

## VALIDATION CHECKLIST (must pass all)

- Works with no backend
- Runs entirely in browser
- Matches site design
- Uses shared layout
- Has metadata entry
- Has category assigned
- Supports copy/reset where applicable
- Handles invalid input safely
- Feels consistent with other tools

---

## OUTPUT

Return:

1. Tool implementation code
2. Metadata entry
3. Route/page integration
4. Any new reusable components (only if necessary)
5. Short explanation of how the tool fits the system

Do not overbuild. Do not add features beyond the defined scope.

Build exactly what is specified, nothing more.
