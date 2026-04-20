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
2. Implement the tool inside the relevant file in `src/tools/`, or create a new grouped tool module if the category grows.
3. Build the UI with the shared `ToolShell` and shared primitives.
4. Add the metadata entry to `src/data/toolRegistry.js`.
5. Verify that homepage search, category views, and the direct tool route all work automatically from the registry entry.

## Static hosting

The app is designed for static frontend hosting. All tool logic is client-side. If you deploy with clean browser routes, configure your host to serve `index.html` for app routes.
