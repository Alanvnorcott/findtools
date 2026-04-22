import { runJavaScriptSnippet, runLightIdeCode } from "./toolLogic/ideRuntime";

export const ideLanguageRegistry = {
  javascript: {
    label: "JavaScript",
    editorLanguage: "javascript",
    supportsRun: true,
    runtimeMode: "worker",
    extension: "js",
    starter: `const name = "Findtools";\nconsole.log("Hello, " + name);`
  },
  python: {
    label: "Python",
    editorLanguage: "python",
    supportsRun: true,
    runtimeMode: "light",
    extension: "py",
    starter: `name = "Findtools"\nprint("Hello, " + name)`
  },
  php: {
    label: "PHP",
    editorLanguage: "php",
    supportsRun: true,
    runtimeMode: "light",
    extension: "php",
    starter: `<?php\n$name = "Findtools";\necho "Hello, " . $name;`
  },
  ruby: {
    label: "Ruby",
    editorLanguage: "ruby",
    supportsRun: true,
    runtimeMode: "light",
    extension: "rb",
    starter: `name = "Findtools"\nputs "Hello, " + name`
  },
  perl: {
    label: "Perl",
    editorLanguage: "perl",
    supportsRun: true,
    runtimeMode: "light",
    extension: "pl",
    starter: `my $name = "Findtools";\nprint "Hello, " . $name;`
  },
  r: {
    label: "R",
    editorLanguage: "r",
    supportsRun: true,
    runtimeMode: "light",
    extension: "r",
    starter: `name <- "Findtools"\nprint(paste("Hello,", name))`
  },
  lua: {
    label: "Lua",
    editorLanguage: "lua",
    supportsRun: true,
    runtimeMode: "light",
    extension: "lua",
    starter: `local name = "Findtools"\nprint("Hello, " .. name)`
  },
  matlab: {
    label: "MATLAB",
    editorLanguage: "matlab",
    supportsRun: true,
    runtimeMode: "light",
    extension: "m",
    starter: `name = "Findtools";\ndisp("Hello, " + name);`
  },
  lisp: {
    label: "Lisp",
    editorLanguage: "lisp",
    supportsRun: true,
    runtimeMode: "light",
    extension: "lisp",
    starter: `(setq name "Findtools")\n(print (concatenate 'string "Hello, " name))`
  },
  basic: {
    label: "BASIC",
    editorLanguage: "basic",
    supportsRun: true,
    runtimeMode: "light",
    extension: "bas",
    starter: `10 LET NAME$ = "Findtools"\n20 PRINT "Hello, " + NAME$`
  },
  bash: {
    label: "Bash",
    editorLanguage: "bash",
    supportsRun: true,
    runtimeMode: "light",
    extension: "sh",
    starter: `#!/usr/bin/env bash\nname="Findtools"\necho "Hello, $name"`
  },
  powershell: {
    label: "PowerShell",
    editorLanguage: "powershell",
    supportsRun: true,
    runtimeMode: "light",
    extension: "ps1",
    starter: `$name = "Findtools"\nWrite-Output ("Hello, " + $name)`
  },
  vbscript: {
    label: "VBScript",
    editorLanguage: "vbscript",
    supportsRun: true,
    runtimeMode: "light",
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
  const info = getIdeLanguage(language);

  if (info.runtimeMode === "light") {
    return runLightIdeCode(language, code);
  }

  return new Promise((resolve) => {
    const workerSource = `
      self.onmessage = async (event) => {
        try {
          const runJavaScriptSnippet = ${runJavaScriptSnippet.toString()};
          self.postMessage(runJavaScriptSnippet(event.data.code));
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
