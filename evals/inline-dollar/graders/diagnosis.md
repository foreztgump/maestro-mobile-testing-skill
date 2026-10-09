---
type: llm
focus: last_message
weight: 3
---

PASS only if the response identifies that Maestro's inline `${...}` expression ends at the first `$` inside it, so the `$` in the string literal `'Total $'` cuts the expression short and the assignment silently never runs. The fix must keep a literal `$` out of the inline expression: move the logic into a `runScript` .js file, or build the character without typing it (e.g. `'\u0024'` or `String.fromCharCode(36)`).

FAIL if it blames YAML quoting alone, `output.total` being undefined, evaluation order, or tells them to escape it as `\$` or `$$` inside the inline expression.
