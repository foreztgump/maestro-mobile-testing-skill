---
name: retry-script-error
tags: [debugging]
runs: 3
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

This Maestro step should wait for our backend to finish an export, but the flow fails on the very first attempt with `Error: export not ready` instead of retrying. Why, and what's the fix?

```yaml
- retry:
    maxRetries: 3
    commands:
      - runScript: scripts/check-export.js
```

```javascript
// scripts/check-export.js
var res = http.get("http://localhost:3000/export/status");
if (json(res.body).state !== "done") {
  throw new Error("export not ready");
}
```

Answer in the reply; don't write files.
