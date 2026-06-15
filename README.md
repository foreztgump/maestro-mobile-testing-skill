# maestro-mobile-testing-skill

An AI-agent skill for writing, running, and debugging **[Maestro](https://maestro.dev/)** UI tests — across React Native/Expo, Flutter, native iOS (SwiftUI/UIKit), native Android (Compose/Views), and web.

It encodes current Maestro best practices (verified against [docs.maestro.dev](https://docs.maestro.dev/), 2026-06) as a progressive-disclosure skill: a lean entry point that loads detailed references only when needed.

## What's inside

```
SKILL.md                  # Entry point: overview, golden rules, cheat sheet, reference map
reference/
  selectors.md            # id/text/index/point, relational, state; selector decision table
  commands.md             # Every command + parameters + idiomatic usage
  flow-control.md         # Conditions, loops, retry, waits, hooks, nested flows, config.yaml, tags
  javascript.md           # GraalJS runtime, http/json/output/faker, runScript/evalScript, debugging
  platforms.md            # Making elements addressable per framework (RN/Expo, Flutter, SwiftUI, Compose, web)
  auth-and-data.md        # OTP/magic-link capture, mock APIs, seed data, secrets
  ci-cd.md                # GitHub Actions, Maestro Cloud, sharding, reports, Docker
  mcp.md                  # Maestro MCP server: tools, setup, agent write-run-fix loop
  patterns.md             # Reliability patterns, platform gotchas, error lookup, checklist
templates/
  smoke.yaml              # Guest-navigation smoke flow
  auth-otp.yaml           # OTP sign-in flow
  config.yaml             # Workspace config
  github-actions.yml      # CI workflow (Maestro Cloud)
  scripts/                # GraalJS helpers (fetch-otp.js, split-otp.js)
```

## Install

**Claude Code** (personal):
```bash
git clone <this-repo> ~/.claude/skills/maestro-mobile-testing
```
**Project-scoped** (any agent that reads `.claude/skills` or equivalent):
```bash
git clone <this-repo> .claude/skills/maestro-mobile-testing
```

The agent discovers the skill via the `description` in `SKILL.md` and loads `reference/*` on demand.

## Pairs with the Maestro MCP server

This skill teaches **how to author** correct flows; the [Maestro MCP server](https://docs.maestro.dev/get-started/maestro-mcp) (bundled in the Maestro CLI) lets the agent **run** them on a live device and iterate. Add it with:
```bash
claude mcp add maestro -- maestro mcp
```
See `reference/mcp.md`.

## License

MIT
