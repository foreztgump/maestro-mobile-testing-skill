---
name: inline-dollar
tags: [debugging, javascript]
runs: 3
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

In our Maestro flow the `evalScript` step shows COMPLETED, but the next step fails because `output.label` is undefined. `output.total` is set correctly earlier in the flow. What's wrong and how do we fix it?

```yaml
- evalScript: ${output.label = 'Total $' + output.total}
- assertVisible: ${output.label}
```

Answer in the reply; don't write files.
