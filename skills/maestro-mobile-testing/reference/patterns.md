# Reliability Patterns, Gotchas & Errors

How to write flows that don't flake, plus platform traps and an error lookup table.

- [Reliability patterns](#reliability-patterns)
- [Platform gotchas](#platform-gotchas)
- [Error lookup](#error-lookup)
- [New-test checklist](#new-test-checklist)

## Reliability patterns

### 1. Assert instead of sleep
Maestro assertions poll until satisfied. A fixed `swipe`/delay either wastes time or races the UI.

```yaml
# ❌ guessing
- tapOn: "Submit"
- swipe: { direction: DOWN, duration: 1000 }   # "wait" — fragile
- tapOn: "Confirm"

# ✅ deterministic
- tapOn: "Submit"
- assertVisible: "Confirmation"
- tapOn: "Confirm"
```

### 2. Stable selectors over index/coordinates
Prefer `id` → relational → `text`. Use `index`/`point` only when nothing else exists.

```yaml
# ❌ breaks when list order changes
- tapOn: { text: "Add to Basket", index: 1 }
# ✅ anchored to context
- tapOn:
    text: "Add to Basket"
    below: "Awesome Shoes"
```

### 3. Optimistic-update verification
Use **short** timeouts to prove the UI updates before the server responds.

```yaml
- tapOn: { id: "like-button" }
- extendedWaitUntil:
    visible: { id: "liked-indicator" }
    timeout: 3000          # optimistic: must flip fast, not wait on network
```

| Action | Expected change | Timeout |
|--------|-----------------|---------|
| Mutation trigger | Button state flips | < 3s |
| List update | Item appears/disappears | < 5s |
| Re-do action | Proves persistence | < 3s |

### 4. Adaptive auth state
Don't assume logged-in/out. Branch on what's visible (see `reference/auth-and-data.md`).

### 5. Dismiss native alerts after mutations
`Alert.alert()` and OS dialogs block the UI. Assert the real state change first, then dismiss optionally.

```yaml
- tapOn: { id: "delete-button" }
- assertVisible: { id: "empty-state" }     # confirm the effect
- tapOn: { text: "OK", optional: true }    # close the alert if still up
```

### 6. Atomic, tagged, reusable flows
One job per subflow; tag for filtering; extract setup into `onFlowStart`. See `reference/flow-control.md`.

### 7. Verify completion — don't trust a green checkmark
A flow full of `optional: true` can "pass" while doing nothing. Add a meaningful `assertVisible` and inspect screenshots / `--debug-output` when a result looks too easy.

### 8. Lint before you run
`maestro check-syntax <file>` rejects unknown commands and properties (e.g. `timeout:` on `assertVisible`) without a device. Run it on every flow you write or edit.

### 9. Budget for absent elements
An `optional:` step or `when: visible` check whose element is absent waits about 7 s before moving on. Ten defensive popup checks cost over a minute. Check for a popup once, where it can actually appear.

## Platform gotchas

### iOS: `clearState` ≠ logged out
`clearState` clears the sandbox but **not the Keychain**. Tokens in `expo-secure-store`/Keychain survive `clearState` and reinstalls.
→ Add `clearKeychain: true`, or use adaptive flows. Never assert guest-only UI right after `clearState` on iOS. (Android `clearState` fully resets.)

### iOS: cold-boot XCTest error (`kAXErrorInvalidUIElement`)
Maestro can hit this if it reads the accessibility tree before the first render completes. Maestro 2.7+ retries it internally; upgrade first. If it persists, wait for a real marker after launch instead of interacting immediately:
```yaml
- launchApp
- extendedWaitUntil:
    visible: { id: "home-screen" }
    timeout: 15000
```

### iOS: `hideKeyboard` is flaky
iOS has no native "hide keyboard" API; Maestro scrolls to dismiss, which isn't always reliable. Newer versions verify the keyboard is gone and **fail** the step if it isn't (on Cloud first).
→ Submit with the keyboard's own key, or tap a non-interactive element:
```yaml
- pressKey: Enter
- tapOn: { id: "screen_title" }   # a header label; avoid raw points
```

### iOS: lists that fetch on scroll (`UITableView`/`UICollectionView`)
XCTest triggers `willDisplayCell` on UI-test API calls, causing unintended pagination/hangs. Fix in app code: in `willDisplay`, only load when the `indexPath` is actually in `indexPathsForVisibleRows`/`indexPathsForVisibleItems`.

### Android: Unicode `inputText` needs Maestro 2.7+
Older CLIs drop non-ASCII characters on Android. Upgrade, or seed Unicode data via API.

### Android: `clearState` fails on some devices
Common on Oppo and Realme physical devices. → Developer Settings → disable **Verify apps over USB**; if needed enable **Disable permission monitoring**.

### Android: permission dialogs
System dialogs block the flow. Set them at launch or dismiss optionally:
```yaml
- launchApp:
    permissions: { all: deny }
# or mid-flow:
- tapOn: { text: "Allow", optional: true }
- tapOn: { text: "While using the app", optional: true }
```

### Android: WebView invisible to Maestro
WebView content may not surface via native a11y APIs. → Add `androidWebViewHierarchy: devtools` to the flow header.

### Auth-aware tab bars
Guest vs authenticated layouts differ. Assert only tabs present in both states, or branch with `when:`.

### Expo Go can't `launchApp`
The app runs inside the Expo container. → `openLink: "exp://127.0.0.1:19000"`. Standalone/EAS builds use normal `launchApp`.

### Deep links fail silently
Unregistered routes do nothing. Use the app's URL scheme (not the bundle id) and ensure the route is registered.

### API-dependent screens spin forever
No backend on `localhost` → silent query failures → infinite spinners. Start a mock server before tests (see `reference/auth-and-data.md`).

## Error lookup

| Error / symptom | Cause | Fix |
|-----------------|-------|-----|
| `Unable to locate Java Runtime` | Java not on PATH | Install Java 17/21, set `JAVA_HOME` |
| Maestro behaves oddly | Unsupported Java version | Use Java 17 or 21 (manage via jenv/sdkman) |
| `Element not found` right after a tap | Native alert blocking | `tapOn: { text: "OK", optional: true }` |
| App won't launch / "not installed" | Wrong `appId` | `adb shell pm list packages` (Android) / `xcrun simctl listapps booted` (iOS) |
| OTP digits don't enter | Auto-focus steals cursor | Tap each `otp-input-N` before typing |
| Test "passes" but nothing happened | `optional: true` misused | Remove it; add a real assertion |
| `Assertion is false` on visibility | Element not rendered yet | Increase timeout / verify the `id` exists via `inspect_screen` |
| Script output empty | Wrong JS API | Use `http.get()` + `json()`, not `fetch()` |
| Inconsistent auth after `clearState` | iOS Keychain not cleared | Add `clearKeychain: true` / adaptive flow |
| `kAXErrorInvalidUIElement` crash | Cold-boot race (iOS) | Upgrade to 2.7+; wait for a ready marker after launch |
| `Unknown Property: timeout` | `timeout:` on `assertVisible` | `extendedWaitUntil` with `visible:` + `timeout:` |
| `Unknown Property: …` / `… is not a valid command` | Typo or outdated syntax | `maestro check-syntax <file>`; check https://docs.maestro.dev/llms.txt |
| Flow fails on a script error despite `optional`/`retry` | JS errors bypass both | Don't `throw` for "not ready"; poll with `repeat` and assert at the end (`reference/javascript.md`) |
| Inline `${...}` step "completes" but sets nothing | A `$` inside the expression | Move the logic to a `.js` file |
| Spinners / empty screens | No API server | Start a mock backend first |
| Permission dialog blocks (Android) | Dialog not handled | `launchApp.permissions` or optional taps |
| `Unable to clear state` (physical Android) | Oppo/Realme quirk | Disable "Verify apps over USB" |
| `inputText` drops characters (Android) | Unicode on a pre-2.7 CLI | Upgrade / seed via API |
| WebView elements not found (Android) | Native a11y gap | `androidWebViewHierarchy: devtools` |
| `hideKeyboard` doesn't dismiss / fails (iOS) | No native API | `pressKey: Enter` or tap a non-interactive element |

## New-test checklist

```
[ ] Dedicated test identity (maestro-{feature}@example.com)
[ ] Selector strategy chosen deliberately (id for i18n, text for single-language)
[ ] State selectors used where relevant (enabled/checked/...)
[ ] Duplicates disambiguated by relational selectors, not index
[ ] Waits are assertions, not sleeps; timeouts realistic
[ ] Auth state handled (pre-flight marker or adaptive when:)
[ ] iOS: clearKeychain if guest state required
[ ] Native alerts/permissions dismissed
[ ] Reusable steps extracted to subflows / hooks
[ ] Screenshots at key checkpoints
[ ] Header has appId/url, name, tags (ci/smoke/wip)
[ ] Mock/seed backend running if API-dependent
[ ] Passes `maestro check-syntax`
[ ] Verified with --debug-output (not just a green check)
```
