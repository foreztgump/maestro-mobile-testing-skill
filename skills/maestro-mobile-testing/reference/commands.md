# Commands Reference

- [App lifecycle](#app-lifecycle)
- [Interaction](#interaction)
- [Movement & scrolling](#movement--scrolling)
- [Assertions & waiting](#assertions--waiting)
- [Navigation & device](#navigation--device)
- [Logic & flow control](#logic--flow-control)
- [Capture, media & visual checks](#capture-media--visual-checks)
- [AI-powered commands](#ai-powered-commands)
- [Flow file header](#flow-file-header-config-section)

Every command is a single list item under the `---` marker. Selectors (see `reference/selectors.md`) can be a string shorthand or a map with parameters. Every command also accepts `optional: true` and `label:`.

For a command not listed here, read the official index at https://docs.maestro.dev/llms.txt.

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
      all: deny                          # per permission: allow | deny | unset (default: all allowed)
      notifications: allow
    arguments:                           # launch args (string/bool/double/int)
      isFooEnabled: false
      foo: "bar"
```

- `clearState` clears the app sandbox but **NOT the iOS Keychain** — auth tokens in `expo-secure-store`/Keychain survive. Use `clearKeychain: true` or the standalone `clearKeychain` command.
- On Android, `clearState` fully resets app data (including credentials).

### Other lifecycle

```yaml
- stopApp                # stop without clearing data
- killApp                # force-kill the process (Android: like the OS killing it); data is kept
- clearState             # clear app data for the app under test
- clearState: com.example.other
- clearKeychain          # iOS Keychain only
- setPermissions:        # change permissions mid-flow, without relaunching
    permissions:
      camera: deny
```

## Interaction

```yaml
- tapOn: "Submit"
- tapOn:
    id: "plus_button"
    repeat: 5
    delay: 200                # ms between repeats (default 100)
    retryTapIfNoChange: true  # retry if UI tree didn't change (fixes "ghost taps"; default false)
    waitToSettleTimeoutMs: 500
- tapOn:
    id: "avatar"
    point: "90%, 10%"         # with a selector, the point is relative to the element
- doubleTapOn: "Map"
- longPressOn:
    id: "list_item"           # same selectors/params as tapOn
- inputText: "maestro_user"   # types into the focused field
- inputRandomEmail            # also: inputRandomPersonName, inputRandomNumber, inputRandomText,
                              #       inputRandomCityName, inputRandomCountryName, inputRandomColorName
- eraseText                   # deletes up to 50 characters (the default)
- eraseText: 100              # longer fields need an explicit count
- setClipboard: "pasted value"
- pasteText                   # pastes Maestro's clipboard (setClipboard / copyTextFrom)
- pressKey: Enter             # Enter, Backspace, Home, Lock, VolumeUp, …
- back                        # system back (Android); on iOS, navigate via UI
```

> Tap the target field before `inputText` if it isn't already focused. Android Unicode input arrived in Maestro 2.7; on older CLIs `inputText` is ASCII-only there.

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
    direction: DOWN            # default DOWN
    timeout: 20000             # default 20000 ms
    speed: 40                  # 0-100; out-of-range values fail the flow
    visibilityPercentage: 100  # how much of the element must show
    centerElement: true        # default false
- hideKeyboard                 # flaky on iOS — see reference/patterns.md
```

## Assertions & waiting

Assertions **poll** until satisfied or timed out — they are the primary wait mechanism. A required element lookup waits up to about 17 s. An `optional: true` lookup or a `when: visible` check waits up to about 7 s before giving up. `assertVisible` has **no `timeout:` parameter**; use `extendedWaitUntil` for a custom one.

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
| Wait for something to appear | `assertVisible` (default lookup timeout) |
| Wait for something to disappear | `assertNotVisible` |
| Wait with a custom timeout | `extendedWaitUntil` (`visible` or `notVisible` + `timeout`) |
| Stabilize after a transition | `waitForAnimationToEnd` |

> Don't set every timeout to 60s. Letting fast screens use the default assertion timeout helps catch performance regressions.

## Navigation & device

```yaml
- openLink: "myapp://profile/settings"   # deep link (use the app's URL scheme)
- openLink: "https://example.com"        # external/universal link
- setLocation:
    latitude: 37.33
    longitude: -122.03
- setOrientation: LANDSCAPE_LEFT         # PORTRAIT, LANDSCAPE_LEFT, LANDSCAPE_RIGHT, UPSIDE_DOWN
- travel:                                 # move between GPS points
    points:
      - "37.33,-122.03"
      - "37.34,-122.04"
    speed: 7                              # m/s, optional (default 4)
- setAirplaneMode: enabled                # enabled | disabled; Android only
- toggleAirplaneMode                      # Android only
- setDarkMode: enabled                    # enabled | disabled; iOS + Android
- toggleDarkMode
- assertDarkMode                          # or assertLightMode
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
    maxRetries: 2            # capped at 3
    commands:
      - tapOn: "Flaky Button"
      - assertVisible: "Result"
```

Details: `reference/flow-control.md` and `reference/javascript.md`.

## Capture, media & visual checks

```yaml
- takeScreenshot: 01-home          # saved to the test output dir
- takeScreenshot:
    path: 02-card
    cropOn:
      id: "product_card"           # crop to one element
- startRecording: checkout-demo
- stopRecording
- copyTextFrom:
    id: "userName"                 # → maestro.copiedText
- inputText: "${'Hello ' + maestro.copiedText}"
```

### Visual regression with `assertScreenshot`

Compares the screen (or one element) to a committed reference image. Capture the reference once with `takeScreenshot` on a known-good build, commit it next to the flow, then assert against it.

```yaml
- assertScreenshot: baselines/home         # path relative to the flow; extension optional
- assertScreenshot:
    path: baselines/product_card
    cropOn:
      id: "product_card"                   # compare one element, not the whole screen
    thresholdPercentage: 97                # match required (default 95)
```

- Crop to the element under test. Full-screen baselines break on clocks, battery icons, and carousel state.
- Keep one baseline per device model and OS. Pixel output differs across them.

## AI-powered commands

Useful when no stable selector exists or for holistic checks. They need a Maestro Cloud login (`maestro login` or `MAESTRO_CLOUD_API_KEY`; a free account works). They default to `optional: true`, so a failed AI check only **warns**. Set `optional: false` when it must gate the flow.

```yaml
- assertWithAI:
    assertion: "The cart shows exactly 3 items with prices"
    optional: false                      # fail the flow, don't just warn
- assertNoDefectsWithAI                  # flags visual glitches/overlaps
- extractTextWithAI:
    query: "the order confirmation number"
    outputVariable: orderId              # default: aiOutput
- assertVisible: ${orderId}
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
