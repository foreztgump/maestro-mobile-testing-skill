---
type: llm
focus: last_message
weight: 3
---

Judge the corrected flow. PASS only if all hold:
1. The swipe used as a wait is removed and the wait is an assertion (`extendedWaitUntil` with `timeout`, or `assertVisible` without a timeout property).
2. No `assertVisible` keeps a `timeout:` property.
3. `index: 1` is replaced by a relational selector anchored on "Running Shoes" (e.g. `below`, `childOf`, `containsDescendants`).
4. `optional: true` is removed from the required "Add to cart" and "Checkout" taps.
5. The erase handles 120 characters: `eraseText` with a count of at least 120 (bare `eraseText` stops at 50), or another approach that clears the full field.
FAIL if any one is missing.
