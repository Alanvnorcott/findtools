import { describe, expect, it } from "vitest";
import { ideLanguageRegistry } from "../ideEngine";
import { runJavaScriptSnippet, runLightIdeCode, transpileLightIdeCode } from "./ideRuntime";

describe("ideRuntime", () => {
  it("runs the JavaScript starter snippet", () => {
    const result = runJavaScriptSnippet(ideLanguageRegistry.javascript.starter);
    expect(result).toMatchObject({ ok: true });
    expect(result.output).toContain("Hello, Findtools");
  });

  it("runs every lightweight IDE starter snippet", () => {
    const lightLanguages = Object.entries(ideLanguageRegistry).filter(([, info]) => info.runtimeMode === "light");

    for (const [language, info] of lightLanguages) {
      const result = runLightIdeCode(language, info.starter);
      expect(result.ok, `${language} should run`).toBe(true);
      expect(result.output, `${language} output should include runtime output`).toContain("Hello");
    }
  });

  it("supports loops and functions across the lightweight IDE languages", () => {
    const cases = {
      python: `def twice(value):\n    return value + value\n\nfor i in range(1, 3):\n    print(twice(i))`,
      php: `<?php\nfunction label($value) {\n  return "Item " . $value;\n}\nfor ($i = 1; $i < 3; $i++) {\n  echo label($i);\n}`,
      ruby: `def twice(value)\n  return value + value\nend\n\n2.times do |i|\n  puts twice(i + 1)\nend`,
      perl: `sub label {\n  my ($value) = @_;\n  return "Item " . $value;\n}\nfor my $i (1..2) {\n  print label($i);\n}`,
      r: `double_value <- function(value) {\n  return(value + value)\n}\nfor (i in 1:2) {\n  print(double_value(i))\n}`,
      lua: `function twice(value)\n  return value + value\nend\nfor i = 1, 2 do\n  print(twice(i))\nend`,
      matlab: `function value = twice(input)\nvalue = input + input;\nend\nfor i = 1:2\ndisp(twice(i));\nend`,
      lisp: `(defun twice (value) (+ value value))\n(dotimes (i 2) (print (twice (+ i 1))))`,
      basic: `10 FUNCTION DOUBLEIT(VALUE)\n20 RETURN VALUE + VALUE\n30 END FUNCTION\n40 FOR I = 1 TO 2\n50 PRINT DOUBLEIT(I)\n60 NEXT`,
      bash: `double_it() {\n  echo "$1$1"\n}\nfor i in 1 2; do\n  double_it "$i"\ndone`,
      powershell: `function DoubleValue($value) {\n  return $value + $value\n}\nfor ($i = 1; $i -lt 3; $i++) {\n  Write-Output (DoubleValue($i))\n}`,
      vbscript: `Function DoubleValue(value)\n  DoubleValue = value + value\nEnd Function\nFor i = 1 To 2\n  WScript.Echo DoubleValue(i)\nNext`
    };

    for (const [language, snippet] of Object.entries(cases)) {
      const result = runLightIdeCode(language, snippet);
      expect(result.ok, `${language} should support loops and functions`).toBe(true);
      expect(result.output, `${language} should emit output`).toContain("2");
    }
  });

  it("transpiles Python loops into real block code", () => {
    const js = transpileLightIdeCode("python", `for i in range(2):\n    print(i)`);
    expect(js).toContain("for (var i = 0;");
    expect(js).toContain("console.log(i);");
  });

  it("returns a readable error for invalid code", () => {
    const result = runLightIdeCode("python", "for i in range(");
    expect(result.ok).toBe(false);
    expect(result.output).toContain("Unsupported python feature");
  });

  it("stops infinite loops before they can run forever", () => {
    const result = runLightIdeCode("python", "while True:\n    print(1)");
    expect(result.ok).toBe(false);
    expect(result.output).toContain("safe iteration limit");
  });

  it("stops runaway recursion with a readable base-case message", () => {
    const result = runLightIdeCode("python", "def loop_forever(value):\n    return loop_forever(value)\n\nprint(loop_forever(1))");
    expect(result.ok).toBe(false);
    expect(result.output).toContain("safe recursion depth");
  });
});
