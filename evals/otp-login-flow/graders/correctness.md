---
type: llm
focus: last_message
weight: 3
---

Judge the Maestro flow and scripts in the response. PASS only if all hold:
1. Mail is looked up by recipient (e.g. Mailpit search `to:<email>`), not just "the latest message", so parallel shards can't read each other's codes.
2. Nothing uses `timeout:` as a property of `assertVisible` (invalid in Maestro); waits longer than the default use `extendedWaitUntil` with `timeout`.
3. Waiting for the mail does not rely on a script `throw` being retried by `retry:` or swallowed by `optional: true` (Maestro does not catch script errors in either). Polling via an assertion such as `assertTrue` inside `retry`, or not polling at all, is fine.
4. Scripts use Maestro's synchronous `http.get(...)` and `json(...)`, not fetch/async.
FAIL if any one of these is violated.
