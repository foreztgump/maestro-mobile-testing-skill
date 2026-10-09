---
type: regex
pattern: "/api/v1/(search|message)"
match: contains
target: last_message
weight: 1
---
Uses Mailpit's real search or message endpoints.
