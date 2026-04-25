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
    starter: `def greet(name):\n    return "Hello, " + name\n\nfor i in range(3):\n    print(greet("Findtools " + str(i)))`
  },
  php: {
    label: "PHP",
    editorLanguage: "php",
    supportsRun: true,
    runtimeMode: "light",
    extension: "php",
    starter: `<?php\nfunction greet($name) {\n  return "Hello, " . $name;\n}\n\nfor ($i = 0; $i < 3; $i++) {\n  echo greet("Findtools " . $i);\n}`
  },
  ruby: {
    label: "Ruby",
    editorLanguage: "ruby",
    supportsRun: true,
    runtimeMode: "light",
    extension: "rb",
    starter: `def greet(name)\n  return "Hello, " + name\nend\n\n3.times do |i|\n  puts greet("Findtools " + i)\nend`
  },
  perl: {
    label: "Perl",
    editorLanguage: "perl",
    supportsRun: true,
    runtimeMode: "light",
    extension: "pl",
    starter: `sub greet {\n  my ($name) = @_;\n  return "Hello, " . $name;\n}\n\nfor my $i (0..2) {\n  print greet("Findtools " . $i);\n}`
  },
  r: {
    label: "R",
    editorLanguage: "r",
    supportsRun: true,
    runtimeMode: "light",
    extension: "r",
    starter: `greet <- function(name) {\n  return(paste("Hello", name))\n}\n\nfor (i in 1:3) {\n  print(greet(i))\n}`
  },
  lua: {
    label: "Lua",
    editorLanguage: "lua",
    supportsRun: true,
    runtimeMode: "light",
    extension: "lua",
    starter: `function greet(name)\n  return "Hello, " .. name\nend\n\nfor i = 1, 3 do\n  print(greet(i))\nend`
  },
  matlab: {
    label: "MATLAB",
    editorLanguage: "matlab",
    supportsRun: true,
    runtimeMode: "light",
    extension: "m",
    starter: `function value = greet(name)\nvalue = "Hello, " + name;\nend\n\nfor i = 1:3\ndisp(greet(i));\nend`
  },
  lisp: {
    label: "Lisp",
    editorLanguage: "lisp",
    supportsRun: true,
    runtimeMode: "light",
    extension: "lisp",
    starter: `(defun greet (name) (concatenate string "Hello, " name))\n(dotimes (i 3) (print (greet i)))`
  },
  basic: {
    label: "BASIC",
    editorLanguage: "basic",
    supportsRun: true,
    runtimeMode: "light",
    extension: "bas",
    starter: `10 FUNCTION GREET(NAME)\n20 RETURN "Hello, " + NAME\n30 END FUNCTION\n40 FOR I = 1 TO 3\n50 PRINT GREET(I)\n60 NEXT`
  },
  bash: {
    label: "Bash",
    editorLanguage: "bash",
    supportsRun: true,
    runtimeMode: "light",
    extension: "sh",
    starter: `#!/usr/bin/env bash\ngreet() {\n  echo "Hello, $1"\n}\n\nfor i in 1 2 3; do\n  greet "$i"\ndone`
  },
  powershell: {
    label: "PowerShell",
    editorLanguage: "powershell",
    supportsRun: true,
    runtimeMode: "light",
    extension: "ps1",
    starter: `function Greet($name) {\n  return "Hello, " + $name\n}\n\nfor ($i = 0; $i -lt 3; $i++) {\n  Write-Output (Greet($i))\n}`
  },
  vbscript: {
    label: "VBScript",
    editorLanguage: "vbscript",
    supportsRun: true,
    runtimeMode: "light",
    extension: "vbs",
    starter: `Function Greet(name)\n  Greet = "Hello, " & name\nEnd Function\n\nFor i = 1 To 3\n  WScript.Echo Greet(i)\nNext`
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
