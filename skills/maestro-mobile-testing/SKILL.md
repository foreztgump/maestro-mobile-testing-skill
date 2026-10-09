---
name: maestro-mobile-testing
description: Use when writing, running, or debugging Maestro UI tests (.maestro YAML flows) for mobile or web apps — React Native/Expo, Flutter, native iOS (SwiftUI/UIKit), native Android (Compose/Views), or web — including selector choice, flaky-test fixes, auth/OTP flows, JavaScript/HTTP scripting, screenshots, Maestro Cloud, CI/CD, and the Maestro MCP server.
license: MIT
metadata:
  version: 2.0.0
  maestro_docs: https://docs.maestro.dev/
  verified_against: docs.maestro.dev (2026-06)
---

# Maestro Mobile & Web UI Testing

## Overview

Maestro is a declarative, YAML-based UI automation framework for mobile and web. It drives the app the way a user does, through the OS **accessibility layer** — so it is black-box (no in-app test code), framework-agnostic, and resilient to refactors.

**Core principle:** Maestro commands have **built-in tolerance and implicit waiting**. Assertions poll the UI until the element appears or the timeout expires. Most flakiness comes from fighting this model (manual sleeps, brittle selectors) rather than working with it.

**Why teams pick Maestro over Appium/Detox:** zero app instrumentation, one suite for iOS + Android + web, fast feedback, and an MCP server that lets an AI agent run and iterate on tests live.

## When to Use

- Writing or maintaining `.maestro/*.yaml` E2E or smoke flows
- A flow is **flaky**, hangs, or fails intermittently → see `reference/patterns.md`
- Choosing selectors (`id` vs `text` vs relational/state) → see `reference/selectors.md`
- Auth, OTP, magic-link, or seeded-data tests → see `reference/auth-and-data.md`
- Scripting (HTTP calls, dynamic data, conditions) → see `reference/javascript.md`
- Wiring CI (GitHub Actions, Maestro Cloud, sharding, tags) → see `reference/ci-cd.md`
- Letting an agent execute tests on a live device → see `reference/mcp.md`
- Platform setup so elements are addressable → see `reference/platforms.md`

**Not for:** unit/integration logic tests, Flutter/Android *desktop* targets (unsupported), or pixel-only visual QA without flows (use `assertScreenshot`/`assertNoDefectsWithAI` within flows instead).

## Quick Start

```bash
# Install (macOS/Linux). Requires Java 17 or 21 on PATH (set JAVA_HOME).
curl -fsSL "https://get.maestro.mobile.dev" | bash
maestro --version

# Start a device, then run
maestro start-device --platform ios          # or: --platform android
maestro test .maestro/smoke.yaml
maestro test --debug-output ./out .maestro/   # run a whole folder, keep artifacts
```

Minimal flow (`.maestro/smoke.yaml`):

```yaml
appId: com.example.app        # Android package / iOS bundle id; `url:` for web
---
- launchApp
- tapOn:
    id: "login_button"        # prefer a stable id; falls back to visible text
- assertVisible: "Welcome"    # polls until visible or times out
```

> First time on a screen? Run `maestro studio` (visual inspector) or use the MCP `inspect_screen` tool to read the live accessibility tree before guessing selectors.

## The Golden Rules (read before writing flows)

1. **Assert, don't sleep.** `assertVisible` / `assertNotVisible` already wait. Reach for `extendedWaitUntil` only for genuinely long operations; never hardcode `swipe`/delay as a wait.
2. **Pick stable selectors.** `id` (accessibility identifier) survives translation and copy changes; `text` is readable but brittle. Decide deliberately — see the decision table in `reference/selectors.md`.
3. **Keep flows atomic and reusable.** Extract login/setup into subflows (`runFlow`) or `onFlowStart`/`onFlowComplete` hooks.
4. **Handle dynamic UI with `when:`/`optional:`, not luck.** Popups, permissions, and A/B states need conditions, not assumptions.
5. **Tag everything** (`smoke`, `ci`, `wip`) so local and CI runs can filter.
6. **Verify, don't assume.** A flow that "passes" instantly may be passing because of misused `optional: true`. Confirm with screenshots/`--debug-output`.

## Command Cheat Sheet

| Need | Command |
|------|---------|
| Start/stop app | `launchApp`, `stopApp`, `killApp`, `clearState`, `clearKeychain` |
| Interact | `tapOn`, `doubleTapOn`, `longPressOn`, `inputText`, `eraseText`, `pressKey`, `back` |
| Move | `swipe`, `scroll`, `scrollUntilVisible`, `hideKeyboard` |
| Assert / wait | `assertVisible`, `assertNotVisible`, `assertTrue`, `extendedWaitUntil`, `waitForAnimationToEnd` |
| Navigate | `openLink` (deep links), `travel`, `setLocation` |
| Logic | `runFlow`, `runScript`, `evalScript`, `repeat`, `retry` |
| Capture | `takeScreenshot`, `startRecording`, `stopRecording`, `copyTextFrom` |
| AI-powered | `assertWithAI`, `assertNoDefectsWithAI`, `extractTextWithAI` |

Full parameters and examples: `reference/commands.md`.

## Reference Map (load on demand)

| File | Covers |
|------|--------|
| `reference/commands.md` | Every command, parameters, and idiomatic usage |
| `reference/selectors.md` | `id`/`text`/`index`/`point`, relational, state, traits; selector decision table |
| `reference/flow-control.md` | Conditions, loops, retry, waits, hooks, nested flows, `config.yaml`, tags |
| `reference/javascript.md` | GraalJS runtime, `runScript`/`evalScript`, `http`, `json`, `output`, `faker`, debugging |
| `reference/platforms.md` | RN/Expo, Flutter, SwiftUI/UIKit, Jetpack Compose, web — making elements addressable |
| `reference/auth-and-data.md` | OTP/magic-link capture, mock APIs, seed data, secrets |
| `reference/ci-cd.md` | GitHub Actions, Maestro Cloud, sharding, reports, Docker |
| `reference/mcp.md` | Maestro MCP server: tools, setup, write-run-fix loop for agents |
| `reference/patterns.md` | Reliability patterns, platform gotchas, flakiness fixes, common errors |
| `templates/` | Copy-paste starter flows (`smoke`, `auth-otp`, `config.yaml`, GitHub Action) |

## Common Mistakes (top of the list)

| Mistake | Fix |
|---------|-----|
| Hardcoding `swipe`/sleeps to "wait" | Use `assertVisible`/`extendedWaitUntil` (they poll) |
| `index:` to disambiguate duplicate elements | Use relational selectors (`below`, `childOf`, `containsDescendants`) |
| `fetch()` / `async`/`await` in scripts | Use `http.get/post(...)` + `json()`; the runtime is synchronous GraalJS |
| Expecting `clearState` to log out on iOS | `clearState` skips the Keychain — add `clearKeychain: true` |
| `tapOn: text` on a localized app | Use `id:` so translation doesn't break the test |
| `optional: true` everywhere | Only for genuinely optional steps; it hides real failures |

> Detailed rationale, platform-specific gotchas, and the full error table live in `reference/patterns.md`.
