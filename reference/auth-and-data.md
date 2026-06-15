# Authentication & Test Data

Patterns for OTP/magic-link auth, mock backends, seed data, and secrets. Auth is the most common source of E2E flakiness — handle state explicitly.

## OTP / magic-link capture

E2E auth that emails a code requires reading that email programmatically. Architecture:

```
Maestro flow ──> app triggers auth ──> auth provider sends email
      │                                          │
      └──< runScript reads code via HTTP <── email capture service (REST API)
```

Common capture services with REST APIs: **Mailpit**, **MailHog**, **Ethereal**. Run one locally (or point at a staging inbox) and fetch the latest message.

### Fetch the OTP (GraalJS, synchronous)

```javascript
// scripts/fetch-otp.js  — NO fetch()/async; use http.get + json()
const base = typeof EMAIL_SERVICE_URL !== "undefined" ? EMAIL_SERVICE_URL : "http://localhost:8025";
const res = http.get(base + "/api/v1/messages");
if (!res.ok) { throw new Error("Email API failed: " + res.status); }

const data = json(res.body);
const body = data.messages[0].Content.Body;     // shape depends on the service
const match = body.match(/(\d{6})/);             // first 6-digit code
if (!match) { throw new Error("No OTP found in latest email"); }
output.OTP_CODE = match[1];
```

### Enter the code

Single input field:

```yaml
- runScript: scripts/fetch-otp.js
- tapOn:
    id: "otp_input"
- inputText: ${output.OTP_CODE}
```

Segmented inputs (one box per digit) — split, then enter each. Auto-focus often steals the cursor, so tap each box:

```javascript
// scripts/split-otp.js
const code = OTP_CODE.split("");
output.OTP_0 = code[0]; output.OTP_1 = code[1]; output.OTP_2 = code[2];
output.OTP_3 = code[3]; output.OTP_4 = code[4]; output.OTP_5 = code[5];
```

```yaml
- runScript:
    file: scripts/split-otp.js
    env:
      OTP_CODE: ${output.OTP_CODE}
- tapOn: { id: "otp-input-0" }
- inputText: ${output.OTP_0}
- tapOn: { id: "otp-input-1" }
- inputText: ${output.OTP_1}
# … repeat for remaining digits
```

> For provider-specific auth (Supabase + Mailpit, Firebase, Auth0, Cognito), create a small **project-level** skill or subflow that extends these patterns with the exact API shapes.

## Auth-state pre-flight (avoid race conditions)

Cold-boot tests can interact before auth resolves. Render a zero-size marker once auth loading completes, then wait for it:

```tsx
// app root / tab bar
{!isLoading && <View testID="auth-loaded" />}
```

```yaml
- launchApp
- extendedWaitUntil:
    visible:
      id: "auth-loaded"
    timeout: 15000
# safe to interact now
- tapOn: { id: "tab-home" }
```

## iOS Keychain & logout

`clearState` does **not** clear the iOS Keychain — tokens in `expo-secure-store`/Keychain survive `clearState` and even reinstalls.

```yaml
# Guarantee a logged-out start on iOS
- launchApp:
    clearState: true
    clearKeychain: true
```

For tests that should handle either state, prefer an **adaptive** flow over forcing guest state:

```yaml
- launchApp
- extendedWaitUntil:
    visible: { id: "auth-loaded" }
    timeout: 15000
- runFlow:
    when: { visible: "Sign In" }
    file: subflows/auth-flow.yaml
- runFlow:
    when: { visible: { id: "tab-home" } }
    file: subflows/authenticated-action.yaml
```

## Mock API server

Apps that call a backend on `localhost` show spinners/empty states if nothing answers — queries fail silently. Run a lightweight mock returning canned JSON before tests:

```bash
npx tsx scripts/mock-api-server.ts &     # serves your API endpoints
maestro test .maestro/
```

A mock is faster and more deterministic than the full backend for E2E. Only stand up the real backend when validating integration specifically.

## Seed data via the HTTP client

Instead of clicking through setup, create the data through the API and assert it appears:

```javascript
// scripts/create-appointment.js
const res = http.post('https://my-api.test/v1/appointments', {
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: "Maestro Health Check", date: "2026-02-10" })
});
output.appointmentTitle = json(res.body).title;
```

```yaml
- runScript: scripts/create-appointment.js
- launchApp
- tapOn: "My Appointments"
- assertVisible: ${output.appointmentTitle}
```

## Secrets

- Never hardcode credentials in flows. Inject at runtime: `maestro test -e PASSWORD=$PW .maestro/` and read `${PASSWORD}`.
- In CI use repository/CI secrets; on Maestro Cloud pass with `-e` (see `reference/ci-cd.md`).
- Use a dedicated, disposable test account per feature (`maestro-{feature}@example.com`).
