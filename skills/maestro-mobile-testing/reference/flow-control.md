# Flow Control & Workspace

- [Conditions (`when:`)](#conditions-when)
- [Loops](#loops)
- [Retry](#retry)
- [Waits](#waits)
- [Hooks](#hooks)
- [Nested (sub)flows](#nested-subflows)
- [`config.yaml` (workspace)](#configyaml-workspace)
- [Tags & test architecture](#tags--test-architecture)

## Conditions (`when:`)

Attach `when:` to `runFlow` or `runScript` so it runs only if the condition holds. Other commands (`tapOn`, `assertVisible`, …) do **not** take `when:` — wrap them in `runFlow`.

| Condition | Runs when |
|-----------|-----------|
| `visible` | Selector is visible |
| `notVisible` | Selector is not visible |
| `platform` | Matches `Android`, `iOS`, or `Web` |
| `true` | JS expression evaluates truthy |

```yaml
# Platform branch
- runFlow:
    when:
      platform: iOS
    file: subflows/ios-permissions.yaml

# Dynamic popup, inline commands
- runFlow:
    when:
      visible: "Welcome to our App"
    commands:
      - tapOn: "Next"
      - tapOn: "Get Started"

# Negative / else
- runFlow:
    when:
      notVisible: "Biometric Login"
    commands:
      - tapOn: "Standard Login"

# Multiple conditions = AND
- runFlow:
    when:
      platform: Android
      visible: "Allow Notifications"
    commands:
      - tapOn: "Allow"

# Feature flag via JS
- runFlow:
    when:
      true: ${IS_FEATURE_ENABLED == true}
    file: subflows/new-feature.yaml
```

The single-command alternative is `optional: true` (the step may fail without failing the flow). Add a `label:` for clarity:

```yaml
- tapOn:
    text: "Dismiss"
    optional: true
    label: "Dismiss rating popup if present"
```

> A `visible:` condition that is false, or an `optional:` step whose element is absent, waits about 7 s before moving on. A popup check on every screen adds up; check once where the popup can appear.

> Prefer separate flows over deeply nested conditionals — overusing `when:` makes flows hard to read. Only condition on **stable, unique** selectors or you reintroduce flakiness.

## Loops

```yaml
# Fixed count
- repeat:
    times: 3
    commands:
      - tapOn: "Add"

# While a condition holds
- repeat:
    while:
      visible: "Load more"
    commands:
      - tapOn: "Load more"

# Iterate data with JS — there is no built-in loop index, so keep your own counter
- evalScript: ${output.i = 0}
- repeat:
    times: ${output.items.length}
    commands:
      - tapOn: ${output.items[output.i]}
      - evalScript: ${output.i = output.i + 1}
```

## Retry

Wrap a fragile sequence so the whole block re-runs on failure. `maxRetries` is capped at 3 and attempts run back to back with no delay. Only Maestro failures (element not found, false assertion) trigger a retry; a JS error in a script fails immediately. To wait on a backend or inbox, use the polling loop in `reference/javascript.md`, not `retry`.

```yaml
- retry:
    maxRetries: 2
    commands:
      - tapOn: "Pay"
      - assertVisible: "Receipt"
```

Use sparingly — retries mask real bugs. Fix the root cause (selector/wait) first.

## Waits

Covered in `reference/commands.md`. Order of preference: `assertVisible`/`assertNotVisible` → `extendedWaitUntil` (long ops) → `waitForAnimationToEnd` (post-transition). Avoid `swipe`/sleeps as waits.

## Hooks

Defined in the config section; run for **every** flow in scope.

```yaml
appId: com.example.app
onFlowStart:
  - runFlow:
      file: subflows/login.yaml
      env:
        ROLE: admin
onFlowComplete:
  - runFlow: subflows/reset.yaml      # runs on pass AND fail
---
- launchApp
```

- If `onFlowStart` fails: the flow is marked failed, the body is skipped, but `onFlowComplete` still runs. It does **not** run when the run is cancelled or times out.
- If `onFlowComplete` fails: the flow is marked failed even if the body passed.
- A slow hook multiplies across the suite. Don't call a flow whose own hook re-triggers the same hook (infinite loop).
- Use `runFlow` with `when: { platform: iOS }` inside a hook to do iOS-only cleanup (e.g. `clearKeychain`).

## Nested (sub)flows

Extract repeated sequences; keep each subflow **atomic** (one job: `login`, `logout`, `onboarding`). Aim for top-level flows of roughly 12–20 commands, one user intent each, ordered setup → actions → assertions.

```yaml
# main flow
- launchApp
- runFlow: ../common/login.yaml
- assertVisible: "Explore"

# with arguments
- runFlow:
    file: ../common/login.yaml
    env:
      USERNAME: myUser
      PASSWORD: ${MAESTRO_PASSWORD}   # injected via -e at runtime
```

Inside the subflow, read args with `${USERNAME}`. Without a `flows:` key, `maestro test <dir>` runs only the top-level files in that folder. Any glob you add that reaches the subflows folder (`flows/**`) also runs each subflow as a standalone test, so exclude it (see `config.yaml` below). Suggested layout:

```
.maestro/
├── config.yaml
├── flows/
│   ├── e2e/            # user journeys
│   └── subflows/       # login.yaml, payment_setup.yaml, ...
└── scripts/            # *.js helpers
```

## `config.yaml` (workspace)

Place at project root or inside `.maestro/`.

```yaml
# Discovery (glob). `*` = root only; `**` = recursive; `!` excludes (Maestro 2.9+).
flows:
  - "flows/**"
  - "!flows/subflows/**"

# Filtering
includeTags:
  - smoke
excludeTags:
  - wip

# Deterministic ordering (optional)
executionOrder:
  continueOnFailure: false      # default true
  flowsOrder:
    - login
    - checkout

# Artifacts
testOutputDir: ./maestro-output

# Cloud-only
baselineBranch: main
notifications:
  email:
    enabled: true
    recipients: [qa@example.com]
  slack:
    endpoint: https://hooks.slack.com/services/XXX

# Platform tuning (disableAnimations is Cloud-only)
platform:
  ios:
    snapshotKeyHonorModalViews: false
    disableAnimations: true
  android:
    disableAnimations: true
```

## Tags & test architecture

- Tag flows in their header (`tags: [smoke, ci]`); filter with `--include-tags` / `--exclude-tags` or the `config.yaml` keys.
- **User-journey** layout (e-commerce/fintech): organize by funnel and user segment (`new_users/`, `existing_users/`).
- **Feature-test** layout (social/content): mirror app modules (`auth/`, `basket/`, `checkout/`).
- Co-locate `.maestro/` with app source (monorepo) so tests version with the code they validate.
