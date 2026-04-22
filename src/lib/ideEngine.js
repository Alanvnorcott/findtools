export const ideLanguageRegistry = {
  javascript: {
    label: "JavaScript",
    editorLanguage: "javascript",
    supportsRun: true,
    extension: "js",
    starter: `function greet(name) {\n  return \`Hello, \${name}\`;\n}\n\nconsole.log(greet("Findtools"));`
  },
  python: {
    label: "Python",
    editorLanguage: "python",
    supportsRun: false,
    extension: "py",
    starter: `def greet(name):\n    return f"Hello, {name}"\n\nprint(greet("Findtools"))`
  },
  php: {
    label: "PHP",
    editorLanguage: "php",
    supportsRun: false,
    extension: "php",
    starter: `<?php\nfunction greet($name) {\n    return "Hello, {$name}";\n}\n\necho greet("Findtools");`
  },
  ruby: {
    label: "Ruby",
    editorLanguage: "ruby",
    supportsRun: false,
    extension: "rb",
    starter: `def greet(name)\n  "Hello, #{name}"\nend\n\nputs greet("Findtools")`
  },
  perl: {
    label: "Perl",
    editorLanguage: "perl",
    supportsRun: false,
    extension: "pl",
    starter: `sub greet {\n  my ($name) = @_;\n  return "Hello, $name";\n}\n\nprint greet("Findtools"), "\\n";`
  },
  r: {
    label: "R",
    editorLanguage: "r",
    supportsRun: false,
    extension: "r",
    starter: `greet <- function(name) {\n  paste("Hello,", name)\n}\n\nprint(greet("Findtools"))`
  },
  lua: {
    label: "Lua",
    editorLanguage: "lua",
    supportsRun: false,
    extension: "lua",
    starter: `local function greet(name)\n  return "Hello, " .. name\nend\n\nprint(greet("Findtools"))`
  },
  matlab: {
    label: "MATLAB",
    editorLanguage: "matlab",
    supportsRun: false,
    extension: "m",
    starter: `function message = greet(name)\nmessage = "Hello, " + name;\nend\n\ndisp(greet("Findtools"))`
  },
  lisp: {
    label: "Lisp",
    editorLanguage: "lisp",
    supportsRun: false,
    extension: "lisp",
    starter: `(defun greet (name)\n  (format t "Hello, ~a~%" name))\n\n(greet "Findtools")`
  },
  basic: {
    label: "BASIC",
    editorLanguage: "basic",
    supportsRun: false,
    extension: "bas",
    starter: `10 PRINT "Hello, Findtools"\n20 END`
  },
  bash: {
    label: "Bash",
    editorLanguage: "bash",
    supportsRun: false,
    extension: "sh",
    starter: `#!/usr/bin/env bash\nname="Findtools"\necho "Hello, $name"`
  },
  powershell: {
    label: "PowerShell",
    editorLanguage: "powershell",
    supportsRun: false,
    extension: "ps1",
    starter: `$name = "Findtools"\nWrite-Output "Hello, $name"`
  },
  vbscript: {
    label: "VBScript",
    editorLanguage: "vbscript",
    supportsRun: false,
    extension: "vbs",
    starter: `Dim name\nname = "Findtools"\nWScript.Echo "Hello, " & name`
  }
};

export function getIdeLanguages() {
  return Object.keys(ideLanguageRegistry);
}

export function getIdeLanguage(key) {
  return ideLanguageRegistry[key] || ideLanguageRegistry.javascript;
}

export function ideDraftKey(language) {
  return `findtools:ide:${language}`;
}

export function downloadIdeSource(language, code) {
  const info = getIdeLanguage(language);
  const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `findtools-ide.${info.extension}`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function runIdeCode(language, code) {
  if (language !== "javascript") {
    return {
      ok: false,
      output: `${getIdeLanguage(language).label} editing is supported here, but browser-side execution is not enabled for this language yet.`
    };
  }

  return new Promise((resolve) => {
    const workerSource = `
      self.onmessage = async (event) => {
        const logs = [];
        const console = {
          log: (...args) => logs.push(args.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join(" ")),
          error: (...args) => logs.push(args.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join(" "))
        };
        try {
          const result = await (new Function("console", event.data.code))(console);
          self.postMessage({ ok: true, output: [...logs, result === undefined ? "" : String(result)].filter(Boolean).join("\\n") || "Code ran with no output." });
        } catch (error) {
          self.postMessage({ ok: false, output: error.message });
        }
      };
    `;
    const worker = new Worker(URL.createObjectURL(new Blob([workerSource], { type: "application/javascript" })));
    const timeoutId = window.setTimeout(() => {
      worker.terminate();
      resolve({ ok: false, output: "Execution timed out after 2 seconds." });
    }, 2000);
    worker.onmessage = (event) => {
      window.clearTimeout(timeoutId);
      worker.terminate();
      resolve(event.data);
    };
    worker.postMessage({ code });
  });
}
