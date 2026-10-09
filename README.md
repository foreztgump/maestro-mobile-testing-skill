# maestro-mobile-testing-skill

An agent skill for writing, running, and debugging **[Maestro](https://maestro.dev/)** UI tests across React Native/Expo, Flutter, native iOS (SwiftUI/UIKit), native Android (Compose/Views), and web.

It encodes current Maestro practice, verified against Maestro CLI 2.11.0 (October 2026). SKILL.md is a short entry point. The agent loads a reference file only when the task needs it.

## Install

**Claude Code (plugin):**

```text
/plugin install maestro-mobile-testing --marketplace foreztgump/maestro-mobile-testing-skill
```

**Any agent ([GitHub CLI](https://cli.github.com/) 2.90+):** Copilot, Claude Code, Cursor, Codex, Gemini CLI, and others.

```bash
gh skill install foreztgump/maestro-mobile-testing-skill maestro-mobile-testing --agent codex --scope user
```

**Any agent (`npx`):**

```bash
npx skills add foreztgump/maestro-mobile-testing-skill
```

**Manual:** copy `skills/maestro-mobile-testing/` into your agent's skills directory, for example `~/.claude/skills/maestro-mobile-testing/`.

The agent discovers the skill through the `description` in `SKILL.md`.

## What's inside

```text
skills/maestro-mobile-testing/
  SKILL.md                # Entry point: golden rules, cheat sheet, reference map
  reference/
    commands.md           # Every command, its parameters, visual and AI checks
    selectors.md          # id/text/index/point, relational, state; decision table
    flow-control.md       # Conditions, loops, retry, hooks, subflows, config.yaml, tags
    javascript.md         # GraalJS runtime limits, http/json/output/faker, script errors
    platforms.md          # Making elements addressable per framework
    auth-and-data.md      # OTP capture with Mailpit, mock APIs, seed data, secrets
    ci-cd.md              # Lint step, GitHub Actions, Maestro Cloud, sharding, Docker, macOS
    mcp.md                # Maestro MCP server tools and the agent write-run-fix loop
    patterns.md           # Reliability patterns, platform gotchas, error lookup, checklist
  templates/
    smoke.yaml            # Guest-navigation smoke flow
    auth-otp.yaml         # OTP sign-in flow
    config.yaml           # Workspace config
    github-actions.yml    # CI workflow (Maestro Cloud)
    scripts/              # GraalJS helpers: fetch-otp.js, clear-inbox.js
```

## Pairs with the Maestro MCP server

This skill teaches **how to author** correct flows. The [Maestro MCP server](https://docs.maestro.dev/getting-started/maestro-mcp), bundled in the Maestro CLI, lets the agent **run** them on a live device and iterate. Add it with:

```bash
claude mcp add maestro -- maestro mcp
```

See `reference/mcp.md`.

## Development

CI (`.github/workflows/validate.yml`) runs these checks on every pull request. You can run them locally too.

```bash
scripts/lint-flows.py                    # maestro check-syntax on every template and doc snippet
claude plugin validate --strict .        # plugin and marketplace manifests
```

`scripts/lint-flows.py` treats a ```` ```yaml ```` block as a flow when it has a `---` separator or starts with a command list item. Config and CI snippets are skipped. Set `MAESTRO_BIN` to test against a specific CLI build.

Behavioral evals live in `evals/`. They compare agent output with and without the skill, and each run costs model usage:

```bash
claude plugin eval . --runs 3 --judge-model sonnet --no-publish
```

When Maestro ships a release, run the lint against the new CLI, fix what fails, and update `verified_against` in `SKILL.md`.

## License

[MIT](LICENSE)
