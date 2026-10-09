# Selectors Reference

- [Selector decision table](#selector-decision-table)
- [Core selectors](#core-selectors)
- [Relational selectors](#relational-selectors)
- [State selectors](#state-selectors)
- [Element traits & dimensions](#element-traits--dimensions)
- [Platform notes for `id`](#platform-notes-for-id)

Maestro finds elements through the OS **accessibility tree**. A selector describes *which* element a command acts on. Pick the most stable selector that uniquely identifies the element.

## Selector decision table

| Situation | Use | Why |
|-----------|-----|-----|
| App is localized / multi-language | `id` | Visible text changes per locale; ids don't |
| Icon or control with no visible text | `id` (or `point` as last resort) | Nothing else is stable |
| Multiple elements share the same text | relational (`below`, `childOf`, …) | More robust than `index` |
| Single-language app, stable copy | `text` | Readable, self-documenting, tests user-visible behavior |
| Verifying interactive state | state (`enabled`, `checked`, …) | Confirms logic, not just presence |
| Native system dialog (permissions) | `text` | No id is exposed on OS alerts |
| Web element with no a11y metadata | `css` | DOM-native targeting |

> **There is no single "right" selector.** For agent-maintained tests on a single-language app, `text` is often fine. For shipping apps with i18n, prefer `id`. When in doubt, ask the developer which their team standardizes on.

## Core selectors

`text` and `id` are **regular expressions by default** — escape literal `$`, `[`, `.`, etc. with `\`.

```yaml
# text — matches visible text, hint text, accessibility label (Android contentDescription,
#        iOS accessibilityLabel), and an input's error text. There is no separate `description:` key.
- tapOn: "Login"               # shorthand, exact-ish match
- tapOn:
    text: ".*Continue.*"       # partial via regex
- assertVisible: "Submit"

# id — accessibility identifier (Android resource-id, iOS accessibilityIdentifier)
- tapOn:
    id: "login_button"
- assertVisible:
    id: "header_icon"

# index — 0-based, pick among identical matches; -1 = last (prefer relational selectors instead)
- tapOn:
    id: "buy_button"
    index: 2

# point — coordinates; relative % preferred over absolute px. Brittle — last resort.
- tapOn:
    point: "50%,50%"
- tapOn:
    point: "100,200"

# css — web only, no regex
- tapOn:
    css: ".secondaryButton"
```

## Relational selectors

Target an element by its relationship to a stable anchor. **Idiomatic replacement for `index`.**

```yaml
# Positional (by screen bounds — combine with id/text for precision)
- tapOn:
    text: "Buy Now"
    below: "Product Title"
- tapOn:
    rightOf:
      id: "input_text"

# Assert vertical order by stacking
- assertVisible:
    text: "Top Thing"
    above:
      text: "Middle Thing"

# Hierarchy (tree, not coordinates)
- tapOn:
    text: "Delete"
    childOf:
      id: "basket_container"
- tapOn:
    containsChild:
      text: "Order 12345"
- assertVisible:
    id: "list_item"
    containsDescendants:
      - text: "Wireless Headphones"
      - text: "$99.99"
```

| Selector | Meaning |
|----------|---------|
| `above` / `below` | Anchored vertically (screen bounds) |
| `leftOf` / `rightOf` | Anchored horizontally (screen bounds) |
| `childOf` | Direct child of the referenced parent |
| `containsChild` | Element has a direct child matching the reference |
| `containsDescendants` | Element contains all listed descendants at any depth |

> Positional selectors use raw coordinates — `leftOf` means "anywhere to the left," not "next to." Always pair them with another attribute when several elements could match.

## State selectors

Boolean filters on functional state. Combine with a core selector.

```yaml
# Tap only once the button is interactive
- tapOn:
    id: "login_button"
    enabled: true

# Assert a submit button starts disabled
- assertVisible:
    id: "login_button"
    enabled: false

- assertVisible:
    id: "remember_me_checkbox"
    checked: true

- assertVisible:
    id: "search_input"
    focused: true

- tapOn:
    text: "Profile"
    selected: true        # e.g. the already-selected tab
```

| Property | Use case |
|----------|----------|
| `enabled` | Buttons disabled until a form is valid / during submit |
| `checked` | Checkboxes, radios, switches |
| `focused` | Auto-focused inputs; verify cursor placement |
| `selected` | Tabs, segmented controls, highlighted list items |

## Element traits & dimensions

- **Traits** filter by shape: `text`, `square`, `long-text` (space-separated, e.g. `traits: square`). Niche; use when text/id are unavailable.
- **Dimension matchers** match by `width`/`height` with optional tolerance. Useful for finding e.g. a specific-sized image. Avoid as a primary selector — sizes vary by device.

## Platform notes for `id`

| Platform | What `id` maps to | How to set it |
|----------|-------------------|---------------|
| React Native | `id` | `testID="login_button"` prop |
| iOS (SwiftUI) | `accessibilityIdentifier` | `.accessibilityIdentifier("login_button")` |
| iOS (UIKit) | `accessibilityIdentifier` | set on the view |
| Android Views | resource-id | `android:id` |
| Android Compose | resource-id | `Modifier.semantics { testTagsAsResourceId = true }` then `Modifier.testTag("…")`; `contentDescription` is matched by `text:` |
| Flutter (3.19+) | semantics `identifier` | `Semantics(identifier: 'login_button', …)` — **not** Flutter `Key`s |

See `reference/platforms.md` for full per-framework setup.
