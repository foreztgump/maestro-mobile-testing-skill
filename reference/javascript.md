# JavaScript & Scripting

Maestro embeds a JavaScript engine (GraalJS) for dynamic values, conditions, data generation, and HTTP calls. It is **synchronous** — there is no event loop.

## Hard runtime constraints

| Feature | Status | Use instead |
|---------|--------|-------------|
| `async` / `await`, Promises | ❌ not supported | synchronous `http.*` calls |
| `fetch()` | ❌ not available | `http.get/post/put/delete/request` |
| `setTimeout` / timers | ❌ | n/a (engine is synchronous) |
| `require` / `import` / npm modules | ❌ | built-in globals only (`http`, `json`, `faker`, `output`, `maestro`) |
| `const` / `let`, template literals | ✅ supported (in `.js` files) | — |
| `JSON.stringify` / `JSON.parse` | ✅ | — |

> Note: `const`, `let`, and backtick template literals **work** in external `.js` files (`runScript`). The one place template literals break is inline `evalScript`, because the command is already wrapped in `${...}` — use string concatenation there.

## Three ways to run JS

### 1. Inline `${ }` expressions
For dynamic values inside any command:

```yaml
- inputText: ${'User_' + faker.name().firstName()}
- tapOn: "${maestro.platform === 'ios' ? 'Allow' : 'While using the app'}"   # quote when the expression contains ':'
```

### 2. `evalScript`
Logic-only steps (no UI element):

```yaml
- evalScript: ${output.timestamp = Date.now()}
- evalScript: '${console.log("started: " + output.timestamp)}'   # concatenation, NOT template literals
```

### 3. `runScript`
External `.js` files for real logic; pass variables via `env`:

```yaml
- runScript:
    file: scripts/setup-user.js
    env:
      userRole: admin
```

```javascript
// scripts/setup-user.js — env vars are available as bare globals
const role = userRole;
console.log(`Setting up user with role: ${role}`);  // template literal OK in files
```

## The `output` object

A single global object that persists for the whole flow. Anything you assign is readable by later steps (`${output.x}`) and scripts.

```javascript
// fetch-data.js
const res = http.get('https://api.example.com/user/1');
const user = json(res.body);
output.username = user.profile.name;
```

```yaml
- runScript: fetch-data.js
- assertVisible: ${output.username}
```

**Namespace to avoid collisions** between scripts:

```javascript
output.auth = { token: "abc-123", expiry: 3600 };
output.profile = { username: "MaestroUser" };
```

```yaml
- inputText: ${output.auth.token}
```

**Shared functions** — define once in `onFlowStart`, reuse everywhere:

```javascript
// apiUtils.js
function generateToken(prefix) { return prefix + "_" + Math.random().toString(36); }
output.utils = { generateToken: generateToken };
```

```yaml
onFlowStart:
  - runScript: apiUtils.js
---
- evalScript: ${output.sessionToken = output.utils.generateToken('session')}
```

## The `maestro` object

| Property | Description |
|----------|-------------|
| `maestro.platform` | `'ios'`, `'android'`, or `'web'` — for cross-platform branching |
| `maestro.copiedText` | Text from the most recent `copyTextFrom` |

```yaml
- copyTextFrom:
    id: "orderNumber"
- inputText: "${'Ref: ' + maestro.copiedText}"   # quote: literal contains ':'
```

## HTTP client

Wrapper around okhttp3. Shorthands: `http.get/post/put/delete(url, config)`; generic `http.request(url, { method, ... })`.

```javascript
// GET + parse
const res = http.get('https://api.example.com/user/1');
if (!res.ok) { throw new Error("Request failed: " + res.status); }
const user = json(res.body);
output.username = user.profile.name;

// POST with headers + JSON body (stringify it yourself)
const login = http.post('https://api.example.com/login', {
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + output.token },
  body: JSON.stringify({ username: "test_user", password: "pw" })
});

// Multipart upload
http.post('https://api.example.com/upload', {
  multipartForm: { uploadType: "import", data: { filePath: filePath, mediaType: "text/csv" } }
});
```

**`response` object:** `ok` (Boolean, 200–299), `status` (Number), `body` (String), `headers` (Object, multi-values comma-joined). Parse JSON bodies with the global `json(res.body)`.

**Common use:** seed data via API before driving the UI — faster and more deterministic than clicking through setup.

## Synthetic data with `faker`

Global `faker` (DataFaker wrapper) for unique/realistic values:

```yaml
- inputText: ${faker.name().firstName()}
- inputText: ${faker.internet().emailAddress()}
- evalScript: '${output.bio = faker.expression("#{name.fullName} lives in #{address.city}")}'
```

Common providers: `faker.name().fullName()`, `faker.internet().emailAddress()`, `faker.number().digits(5)`, `faker.expression("#{number.numberBetween '1' '10'}")`, `faker.finance().creditCard()`.

## Debugging scripts

- `console.log` output goes to `maestro.log` (prefixed `JsConsole`); surface it with `--debug-output <dir>`.
- **Single argument only** — `console.log('x is', x)` prints just `x is`. Use concatenation or (in files) template literals.
- Inline logging: `- evalScript: '${console.log("Value: " + myVar)}'` (no template literals inline).

## Conditions in JS

Use the `true:` condition for feature flags / computed logic. For multi-line logic, compute in a `.js` file and store the result on `output`:

```javascript
// checkFeature.js
output.shouldRun = (MAESTRO_PLATFORM === 'Android' && someCalc() > 10);
```

```yaml
- runScript: checkFeature.js
- runFlow:
    when:
      true: ${output.shouldRun}
    file: subflows/advanced.yaml
```
