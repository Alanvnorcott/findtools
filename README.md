# Findtools

Findtools is a frontend-only utility workspace with 30 browser-based tools across text, files, calculators, developer workflows, and generators. Everything runs locally in the browser with no backend, no auth, and no server-side processing.

## Stack

- React
- Vite
- React Router
- `pdf-lib` for local PDF merge and split
- Browser APIs for clipboard, crypto, canvas, file handling, and local storage

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Unit tests:

```bash
npm run test:run
```

## GitHub Pages

This app must be deployed from the Vite production build output, not from the raw repository source.

For GitHub Pages:

1. Push the repo with `.github/workflows/deploy.yml`
2. In repository Settings -> Pages, set **Source** to **GitHub Actions**
3. Let the workflow build and deploy `dist`

If Pages is left on `Deploy from a branch` with `main`, GitHub serves the source `index.html`, which references `/src/main.jsx`, and the site fails with the `text/jsx` MIME-type error / blank screen.

## Project structure

- `src/data/toolRegistry.js`: single source of truth for tool metadata and component mapping
- `src/data/categories.js`: shared category system
- `src/components/ToolShell.jsx`: standardized layout for tool pages
- `src/tools/`: grouped tool implementations
- `src/styles/global.css`: shared design system and layout styling
- `AGENT.md`: global agent rules for the repo
- `TOOL.md`: required tool contract and design rules

## Adding a new tool

1. Read `AGENT.md` and `TOOL.md`.
2. Extract the core logic into a small pure function in `src/lib/toolLogic/` when the behavior is testable without React.
3. Add a tiny adjacent `*.test.js` file with the baseline coverage: one valid path, one edge case, and invalid handling if the tool has it.
4. Implement the UI inside the relevant file in `src/tools/`, or create a new grouped tool module if the category grows.
5. Build the UI with the shared `ToolShell` and shared primitives.
6. Add the metadata entry to `src/data/toolRegistry.js`.
7. Verify that homepage search, category views, and the direct tool route all work automatically from the registry entry.

## Unit test pattern

- Keep tool tests focused on pure logic, not full component rendering.
- Put shared tool logic in `src/lib/toolLogic/<category>.js`.
- Keep tests next to that logic as `src/lib/toolLogic/<category>.test.js`.
- Do not import test helpers into runtime code.
- GitHub Actions runs `npm run test:run` before build/deploy, so failed tests block deployment.

Example pattern:

```text
src/lib/toolLogic/textData.js
src/lib/toolLogic/textData.test.js
src/lib/toolLogic/calculators.js
src/lib/toolLogic/calculators.test.js
```

This stays out of the production bundle because `vitest` is a dev dependency, test files are never imported by runtime code, and Vite only bundles the app entry graph.

## Static hosting

The app is designed for static frontend hosting. All tool logic is client-side. If you deploy with clean browser routes, configure your host to serve `index.html` for app routes.
