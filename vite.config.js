import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("pdfjs-dist")) {
            return "pdf-renderer";
          }

          if (
            id.includes("/node_modules/codemirror/") ||
            id.includes("/node_modules/@codemirror/view/") ||
            id.includes("/node_modules/@codemirror/state/") ||
            id.includes("/node_modules/@codemirror/search/") ||
            id.includes("/node_modules/@codemirror/commands/") ||
            id.includes("/node_modules/@codemirror/language/") ||
            id.includes("/node_modules/@codemirror/autocomplete/") ||
            id.includes("/node_modules/@lezer/highlight/")
          ) {
            return "code-editor-core";
          }

          return undefined;
        }
      }
    }
  }
});
