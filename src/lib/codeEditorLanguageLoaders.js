import { StreamLanguage } from "@codemirror/language";

const languageCache = new Map();

function loadAndCache(language, loader) {
  if (!languageCache.has(language)) {
    languageCache.set(language, loader());
  }
  return languageCache.get(language);
}

export function loadEditorLanguageExtension(language) {
  switch (language) {
    case "javascript":
      return loadAndCache(language, () =>
        import("@codemirror/lang-javascript").then(({ javascript }) => javascript({ jsx: true }))
      );
    case "typescript":
      return loadAndCache(language, () =>
        import("@codemirror/lang-javascript").then(({ javascript }) => javascript({ typescript: true }))
      );
    case "python":
      return loadAndCache(language, () => import("@codemirror/lang-python").then(({ python }) => python()));
    case "php":
      return loadAndCache(language, () => import("@codemirror/lang-php").then(({ php }) => php()));
    case "html":
      return loadAndCache(language, () => import("@codemirror/lang-html").then(({ html }) => html()));
    case "css":
      return loadAndCache(language, () => import("@codemirror/lang-css").then(({ css }) => css()));
    case "json":
      return loadAndCache(language, () => import("@codemirror/lang-json").then(({ json }) => json()));
    case "sql":
    case "plsql":
      return loadAndCache(language, () => import("@codemirror/lang-sql").then(({ sql }) => sql()));
    case "java":
      return loadAndCache(language, () => import("@codemirror/lang-java").then(({ java }) => java()));
    case "c":
    case "cpp":
      return loadAndCache(language, () => import("@codemirror/lang-cpp").then(({ cpp }) => cpp()));
    case "go":
      return loadAndCache(language, () => import("@codemirror/lang-go").then(({ go }) => go()));
    case "rust":
      return loadAndCache(language, () => import("@codemirror/lang-rust").then(({ rust }) => rust()));
    case "markdown":
      return loadAndCache(language, () => import("@codemirror/lang-markdown").then(({ markdown }) => markdown()));
    case "yaml":
      return loadAndCache(language, () => import("@codemirror/lang-yaml").then(({ yaml }) => yaml()));
    case "xml":
      return loadAndCache(language, () =>
        import("@codemirror/legacy-modes/mode/xml").then(({ xml }) => StreamLanguage.define(xml))
      );
    case "ruby":
      return loadAndCache(language, () =>
        import("@codemirror/legacy-modes/mode/ruby").then(({ ruby }) => StreamLanguage.define(ruby))
      );
    case "perl":
      return loadAndCache(language, () =>
        import("@codemirror/legacy-modes/mode/perl").then(({ perl }) => StreamLanguage.define(perl))
      );
    case "r":
      return loadAndCache(language, () =>
        import("@codemirror/legacy-modes/mode/r").then(({ r }) => StreamLanguage.define(r))
      );
    case "lua":
      return loadAndCache(language, () =>
        import("@codemirror/legacy-modes/mode/lua").then(({ lua }) => StreamLanguage.define(lua))
      );
    case "matlab":
      return loadAndCache(language, () =>
        import("@codemirror/legacy-modes/mode/octave").then(({ octave }) => StreamLanguage.define(octave))
      );
    case "lisp":
      return loadAndCache(language, () =>
        import("@codemirror/legacy-modes/mode/commonlisp").then(({ commonLisp }) => StreamLanguage.define(commonLisp))
      );
    case "basic":
      return loadAndCache(language, () =>
        import("@codemirror/legacy-modes/mode/vb").then(({ vb }) => StreamLanguage.define(vb))
      );
    case "bash":
      return loadAndCache(language, () =>
        import("@codemirror/legacy-modes/mode/shell").then(({ shell }) => StreamLanguage.define(shell))
      );
    case "dockerfile":
      return loadAndCache(language, () =>
        import("@codemirror/legacy-modes/mode/dockerfile").then(({ dockerFile }) => StreamLanguage.define(dockerFile))
      );
    case "powershell":
      return loadAndCache(language, () =>
        import("@codemirror/legacy-modes/mode/powershell").then(({ powerShell }) => StreamLanguage.define(powerShell))
      );
    case "vbscript":
      return loadAndCache(language, () =>
        import("@codemirror/legacy-modes/mode/vbscript").then(({ vbScript }) => StreamLanguage.define(vbScript))
      );
    case "csharp":
      return loadAndCache(language, () =>
        import("@codemirror/legacy-modes/mode/clike").then(({ csharp }) => StreamLanguage.define(csharp))
      );
    case "kotlin":
      return loadAndCache(language, () =>
        import("@codemirror/legacy-modes/mode/clike").then(({ kotlin }) => StreamLanguage.define(kotlin))
      );
    case "scala":
      return loadAndCache(language, () =>
        import("@codemirror/legacy-modes/mode/clike").then(({ scala }) => StreamLanguage.define(scala))
      );
    case "dart":
      return loadAndCache(language, () =>
        import("@codemirror/legacy-modes/mode/clike").then(({ dart }) => StreamLanguage.define(dart))
      );
    case "objective-c":
      return loadAndCache(language, () =>
        import("@codemirror/legacy-modes/mode/clike").then(({ objectiveC }) => StreamLanguage.define(objectiveC))
      );
    default:
      return Promise.resolve([]);
  }
}
