# Commands Reference

Every command is a single list item under the `---` marker. Selectors (see `reference/selectors.md`) can be a string shorthand or a map with parameters.

## App lifecycle

### `launchApp`
Launches the app; stops it first by default.

```yaml
- launchApp                              # app under test (appId from header)
- launchApp: com.example.other           # a different app by id
- launchApp:
    clearState: true                     # wipe app data first (see Keychain note below)
    clearKeychain: true                  # iOS only — wipe Keychain too
    stopApp: false                       # bring backgrounded app to foreground, don't restart
    permissions:
      all: deny                          # or grant specific: notifications: unset
    arguments:                           # launch args (string/bool/double/int)
      isFooEnabled: false
      foo: "bar"
```

- `clearState` clears the app sandbox but **NOT the iOS Keychain** — auth tokens in `expo-secure-store`/Keychain survive. Use `clearKeychain: true` or the standalone `clearKeychain` command.
- On Android, `clearState` fully resets app data (including credentials).

### Other lifecycle

```yaml
- stopApp                # stop without clearing data
- killApp                # force-stop (optionally clears data/cache)
- clearState             # clear app data for the app under test
- clearKeychain          # iOS Keychain only
```

## Interaction

```yaml
- tapOn: "Submit"
- tapOn:
    id: "plus_button"
    repeat: 5
    delay: 200                # ms between repeats (default 100)
    retryTapIfNoChange: true  # retry if UI tree didn't change (fixes "ghost taps")
    waitToSettleTimeoutMs: 500
- doubleTapOn: "Map"
- longPressOn:
    id: "list_item"           # same selectors/params as tapOn
- inputText: "maestro_user"   # types into the focused field
- eraseText: 5                # delete N chars (or all if omitted)
- pressKey: Enter             # Enter, Backspace, Home, Lock, VolumeUp, …
- back                        # system back (Android); on iOS, navigate via UI
```

> `inputText` on Android supports **ASCII only** (Unicode is a known limitation). Tap the target field first if it isn't already focused.

## Movement & scrolling

```yaml
- swipe:
    direction: UP             # UP/DOWN/LEFT/RIGHT, or start/end points
    duration: 400
- swipe:
    start: "50%, 80%"
    end: "50%, 20%"
- scroll                       # simple vertical scroll down
- scrollUntilVisible:
    element:
      id: "footer_cta"
    direction: DOWN
    timeout: 20000
    centerElement: true
- hideKeyboard                 # flaky on iOS — see reference/patterns.md
```

## Assertions & waiting

Assertions **poll** until satisfied or timed out — they are the primary wait mechanism.

```yaml
- assertVisible: "Success!"
- assertVisible:
    id: "cta"
    enabled: true
- assertNotVisible: "Loading"           # waits for a spinner to disappear
- assertTrue: ${output.count > 0}       # JS expression
- extendedWaitUntil:
    visible: "Payment Confirmed"
    timeout: 30000                       # only for genuinely long operations
- waitForAnimationToEnd:
    timeout: 5000                        # continue once motion stops
```

| Use | Command |
|-----|---------|
| Wait for something to appear | `assertVisible` (default timeout) |
| Wait for something to disappear | `assertNotVisible` |
| Wait for a long backend op | `extendedWaitUntil` (custom timeout) |
| Stabilize after a transition | `waitForAnimationToEnd` |

> Don't set every timeout to 60s. Letting fast screens use the default assertion timeout helps catch performance regressions.

## Navigation & device

```yaml
- openLink: "myapp://profile/settings"   # deep link (use the app's URL scheme)
- openLink: "https://example.com"        # external/universal link
- setLocation:
    latitude: 37.33
    longitude: -122.03
- setOrientation: LANDSCAPE_LEFT
- travel:                                 # simulate movement / time
    points:
      - "37.33,-122.03"
- setAirplaneMode: enabled
- addMedia:                               # seed gallery for picker tests
    - "./fixtures/photo.png"
```

Deep links must be registered in the app's handler; unregistered routes fail silently. For Expo Go use the `exp://…` dev URL (see `reference/platforms.md`).

## Logic & flow control

```yaml
- runFlow: subflows/login.yaml
- runFlow:
    file: subflows/login.yaml
    env:
      ROLE: admin
- runFlow:
    when:
      visible: "Dismiss"
    commands:
      - tapOn: "Dismiss"
- runScript: scripts/fetch-otp.js
- evalScript: ${output.ts = Date.now()}
- repeat:
    times: 3
    commands:
      - tapOn: "Next"
- retry:
    maxRetries: 2
    commands:
      - tapOn: "Flaky Button"
      - assertVisible: "Result"
```

Details: `reference/flow-control.md` and `reference/javascript.md`.

## Capture & media

```yaml
- takeScreenshot: 01-home          # saved to test output dir
- startRecording: checkout-demo
- stopRecording
- copyTextFrom:
    id: "userName"                 # → maestro.copiedText
- inputText: "${'Hello ' + maestro.copiedText}"
```

## AI-powered commands

Useful when no stable selector exists or for holistic checks. Require model access (configured via Maestro Cloud / API key).

```yaml
- assertWithAI:
    assertion: "The cart shows exactly 3 items with prices"
- assertNoDefectsWithAI                  # flags visual glitches/overlaps
- extractTextWithAI: "the order confirmation number"
```

> Treat AI assertions as a supplement, not a replacement, for deterministic selectors. They are slower and non-deterministic.

## Flow file header (config section)

Everything above `---` configures the flow:

```yaml
appId: com.example.app        # or `url:` for web
name: Checkout - happy path
tags:
  - smoke
  - ci
env:
  TEST_EMAIL: maestro@example.com
onFlowStart:
  - runFlow: subflows/login.yaml
onFlowComplete:
  - runFlow: subflows/logout.yaml
---
- launchApp
```
