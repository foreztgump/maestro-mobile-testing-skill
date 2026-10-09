# Platform Setup

Maestro is black-box: it sees only what the **accessibility tree** exposes. The work per platform is making elements *addressable* (stable `id`s and labels). Same YAML runs across platforms.

Supported: Android (Views + Jetpack Compose), iOS (UIKit + SwiftUI), React Native, Flutter (mobile + web), web browsers (Chromium, beta). **Not** supported: Flutter Desktop, Android/iOS desktop targets, physical iOS devices.

- [React Native / Expo](#react-native--expo)
- [iOS — SwiftUI](#ios--swiftui)
- [iOS — UIKit](#ios--uikit)
- [Android — Jetpack Compose](#android--jetpack-compose)
- [Android — Views](#android--views)
- [Flutter (3.19+)](#flutter-319)
- [Web browsers](#web-browsers)
- [Device management (CLI)](#device-management-cli)

## React Native / Expo

Maestro tests the final bundled binary — **no npm packages** (no Detox/Appium drivers) needed.

```tsx
// Visible text works but is brittle (breaks on copy change / translation)
<Button title="Go" onPress={...} />        // - tapOn: "Go"

// Best practice: testID → maps to Maestro `id`
<TextInput testID="username_input" placeholder="Username" />
```

```yaml
- tapOn:
    id: "username_input"
- inputText: "maestro_user"
```

**Expo Go vs standalone:**
- **Expo Go**: the app runs inside the Expo container, so you can't `launchApp` your own `appId`. Launch via the Metro dev URL (port 8081 on current Expo SDKs; older SDKs used 19000):
  ```yaml
  - openLink: "exp://127.0.0.1:8081"
  ```
- **EAS build / standalone / dev build**: use normal `launchApp` with your bundle id / package name. Expo + EAS Workflows are fully CI-compatible.

**iOS nested-touch gotcha:** RN sometimes "swallows" taps on deeply nested views. Disable `accessible` on the outer wrapper and enable it on the inner element so Maestro can target the inner text/control.

## iOS — SwiftUI

```swift
NavigationLink(value: Panel.donutEditor) {
    Label("Donut Editor", systemImage: "slider.horizontal.3")
}
.accessibilityIdentifier("donut_editor")     // → Maestro id
```

```yaml
- tapOn:
    id: "donut_editor"
```

- `id` is the most resilient selector; `index` disambiguates duplicate text; `point` handles tiny system controls (toggles) when needed.
- Quirks: `WheelPickerStyle` may not expose a full hierarchy (prefer text there); a `Toggle` initialized with text often merges label+switch into one a11y element. Inspect with the **Maestro Studio** desktop app (or the MCP `inspect_screen` tool) before writing YAML.
- Migration safety: rewriting a UIKit screen in SwiftUI needs **zero** test changes if visuals + identifiers are preserved.

## iOS — UIKit

- `text` → `accessibilityLabel`
- `id` → `accessibilityIdentifier` (the gold standard; set it on views)

iOS testing runs on **Simulators** only, locally and on Maestro Cloud. Physical iPhones are not supported by Maestro; third-party device clouds are the only route to real hardware.

## Android — Jetpack Compose

Maestro reads Compose **semantics** automatically (visible text, `contentDescription`, resource ids):

```kotlin
// Text — works out of the box
Text("Login")                               // - tapOn: "Login"

// contentDescription — also matched by `text:`
Modifier.semantics { contentDescription = "Login Button" }
```

```yaml
- tapOn: "Login Button"
```

To expose **test tags as `id`** (recommended for stability):

```kotlin
// once, at the tree root
Modifier.semantics { testTagsAsResourceId = true }
// per element
Modifier.testTag("login_button")
```

```yaml
- tapOn:
    id: "login_button"
```

Compose tests survive XML→Compose migrations as long as text/semantics stay stable.

## Android — Views

`id` maps to the resource-id (`android:id`); `text` matches visible text / `contentDescription`.

Android runs on emulators **and** physical devices via ADB:

```bash
adb devices                                  # list devices
adb shell pm list packages | grep myapp      # find the appId/package
adb shell am start -n com.myapp/.MainActivity
adb logcat | grep Maestro
```

## Flutter (3.19+)

Maestro reads the **Semantics Tree** — **not** Flutter `Key`s (Keys aren't exposed to accessibility). No `pubspec.yaml` changes; tests the compiled APK/IPA.

```dart
// Icon with no text → add a semanticLabel
FloatingActionButton(
  onPressed: _increment,
  child: Icon(Icons.add, semanticLabel: 'fabAddIcon'),
);                                            // - tapOn: "fabAddIcon"

// Wrap a non-text area to make it tappable
Semantics(label: 'yellow_box', child: Container(...));   // - tapOn: "yellow_box"

// Best practice: stable identifier (survives translation)
Semantics(
  identifier: 'login_button',
  child: ElevatedButton(onPressed: _login, child: Text('Sign In')),
);
```

```yaml
- tapOn:
    id: "login_button"
```

On Flutter web, Maestro 2.7+ also resolves `id` against the semantics identifier. **Flutter web** is supported but renders to `<canvas>` and does **not** enable the DOM semantics overlay by default. Without it, `tapOn`/`assertVisible` fail silently. Enable in `main()`:

```dart
import 'package:flutter/rendering.dart';
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SemanticsBinding.instance.ensureSemantics();   // required for Maestro on web
  runApp(const MyApp());
}
```

## Web browsers

Use `url:` instead of `appId:` in the header; `launchApp` navigates to it. Maestro drives Chromium (downloaded automatically); web support is in beta. The `css` selector is available (web only, no regex). Run headless in CI with `--headless` and `--screen-size=1920x1080`. For Android WebViews that Maestro can't see, add `androidWebViewHierarchy: devtools` to the flow header.

## Device management (CLI)

```bash
maestro start-device --platform ios --device-os iOS-26-2
maestro start-device --platform android --device-os android-34
maestro list-devices
maestro --device <udid> test flow.yaml        # target a specific device
```
