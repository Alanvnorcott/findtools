import { useEffect, useMemo, useRef } from "react";
import { basicSetup } from "codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { autocompletion, closeBrackets } from "@codemirror/autocomplete";
import { searchKeymap } from "@codemirror/search";
import { tags as t } from "@lezer/highlight";
import { loadEditorLanguageExtension } from "../lib/codeEditorLanguageLoaders";

const languageCompartment = new Compartment();
const editableCompartment = new Compartment();

const darkTheme = EditorView.theme(
  {
    "&": {
      minHeight: "100%",
      fontSize: "0.92rem",
      backgroundColor: "var(--surface-muted)",
      color: "var(--text)"
    },
    ".cm-scroller": {
      fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, monospace',
      lineHeight: "1.5"
    },
    ".cm-content": {
      padding: "0.75rem 0"
    },
    ".cm-line": {
      padding: "0 0.75rem"
    },
    ".cm-gutters": {
      backgroundColor: "var(--surface)",
      color: "var(--muted)",
      borderRight: "1px solid var(--border)"
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(159, 183, 255, 0.06)"
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "var(--text)"
    },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(159, 183, 255, 0.22)"
    },
    "&.cm-focused": {
      outline: "none"
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--accent)"
    },
    ".cm-tooltip": {
      backgroundColor: "var(--surface-strong)",
      border: "1px solid var(--border-strong)",
      color: "var(--text)"
    }
  },
  { dark: true }
);

const highlightStyle = syntaxHighlighting(
  HighlightStyle.define([
    { tag: [t.keyword, t.modifier], color: "#a7c3ff" },
    { tag: [t.string, t.special(t.string)], color: "#b5e48c" },
    { tag: [t.number, t.bool], color: "#f7b267" },
    { tag: [t.comment], color: "#7f8b99" },
    { tag: [t.variableName, t.name], color: "#edf1f5" },
    { tag: [t.typeName, t.className], color: "#8fd3ff" },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#ffd39a" },
    { tag: [t.operator], color: "#f7cad0" }
  ])
);

export default function CodeEditorImpl({
  value,
  onChange,
  language = "javascript",
  readOnly = false,
  minHeight = 220,
  ariaLabel = "Code editor"
}) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);

  const extensions = useMemo(
    () => [
      basicSetup,
      keymap.of(searchKeymap),
      closeBrackets(),
      autocompletion(),
      darkTheme,
      highlightStyle,
      EditorView.lineWrapping,
      languageCompartment.of([]),
      editableCompartment.of(EditorView.editable.of(!readOnly)),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && typeof onChange === "function") {
          onChange(update.state.doc.toString());
        }
      }),
      EditorView.contentAttributes.of({ "aria-label": ariaLabel })
    ],
    [ariaLabel, language, onChange, readOnly]
  );

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const view = new EditorView({
      state: EditorState.create({ doc: value, extensions }),
      parent: hostRef.current
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [extensions]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (value !== current) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    let cancelled = false;
    loadEditorLanguageExtension(language).then((extension) => {
      if (cancelled || !viewRef.current) return;
      view.dispatch({
        effects: [
          languageCompartment.reconfigure(extension),
          editableCompartment.reconfigure(EditorView.editable.of(!readOnly))
        ]
      });
    });
    return () => {
      cancelled = true;
    };
  }, [language, readOnly]);

  return <div className="code-editor-shell" ref={hostRef} style={{ minHeight }} />;
}
