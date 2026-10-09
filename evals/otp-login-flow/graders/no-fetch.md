---
type: regex
pattern: "\\bfetch\\(\\s*['\"`]|\\bawait\\s+[A-Za-z_]|async\\s+function"
match: not_contains
target: last_message
weight: 1
---
No fetch() call or async/await in scripts; GraalJS in Maestro needs http.get + json(). Mentions such as "never fetch()" in comments don't match.
