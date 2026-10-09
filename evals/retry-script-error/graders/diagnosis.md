---
type: llm
focus: last_message
weight: 3
---

PASS only if both hold:
1. Root cause: the response says that a JavaScript error thrown by `runScript` is not retried at all. `retry` (like `optional`) only catches Maestro command failures such as a failed assertion or a missing element, so the flow fails on the first attempt.
2. Fix: the script records the state without throwing (e.g. `output.exportDone = ...`), and the flow checks it with a Maestro assertion (e.g. `assertTrue`), either inside `retry` or after a bounded `repeat` loop.

FAIL if the response's main diagnosis is that the retry runs but too fast, or that all attempts run and then fail. That diagnosis is wrong. Noting, as a secondary point, that `retry` has no delay between attempts is correct and must not count against the response. Also FAIL if it keeps `throw` as the retry trigger or proposes a sleep/setTimeout in the script.
