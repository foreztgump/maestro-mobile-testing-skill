---
name: flaky-flow-fix
tags: [reliability]
runs: 3
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

This Maestro flow is flaky in CI and `maestro check-syntax` rejects it. Fix it. Reply with the corrected flow and a short note per change; don't write files.

```yaml
appId: com.acme.shop
---
- launchApp
- swipe: { direction: DOWN, duration: 3000 }   # give the feed time to load
- assertVisible:
    id: "feed"
    timeout: 20000
- tapOn:
    text: "Add to cart"
    index: 1
    optional: true
- tapOn:
    text: "Checkout"
    optional: true
- eraseText
- inputText: "SAVE10"
- tapOn: "Apply"
```

Context: the second product card is titled "Running Shoes". The coupon field (`coupon-input`) is prefilled with a 120-character placeholder code. Checkout must happen for the test to mean anything.
