# Authentication & Test Data

Patterns for OTP/magic-link auth, mock backends, seed data, and secrets. Auth is the most common source of E2E flakiness — handle state explicitly.

- [OTP / magic-link capture](#otp--magic-link-capture)
- [Auth-state pre-flight](#auth-state-pre-flight-avoid-race-conditions)
- [iOS Keychain & logout](#ios-keychain--logout)
- [Mock API server](#mock-api-server)
- [Seed data via the HTTP client](#seed-data-via-the-http-client)
- [Secrets](#secrets)

## OTP / magic-link capture

E2E auth that emails a code requires reading that email programmatically. Architecture:

```
Maestro flow ──> app triggers auth ──> auth provider sends email
      │                                          │
      └──< runScript reads code via HTTP <── email capture service (REST API)
```

Use **Mailpit** (MailHog is unmaintained since 2020; Mailpit replaces it on the same ports, 1025 SMTP / 8025 HTTP). Point your backend's SMTP at it and read mail over its REST API. The working scripts live in `templates/scripts/`; this is the shape.

Three rules make it reliable:
- **Filter by recipient** (`/api/v1/search?query=to:<email>`), never "latest message": parallel runs share the inbox.
- **Clear that recipient's mail before requesting a code**, or you can read a code from an earlier run.
- **Don't `throw` when the mail hasn't arrived yet.** Script errors fail the flow even inside `retry:`. Return an empty value, poll, and assert at the end.

### Fetch the code (GraalJS, synchronous)

```javascript
// scripts/fetch-otp.js — NO fetch()/async; use http.get + json()
const base = typeof EMAIL_SERVICE_URL !== "undefined" ? EMAIL_SERVICE_URL : "http://localhost:8025";
output.OTP_CODE = "";
const found = json(http.get(base + "/api/v1/search?query=" + encodeURIComponent("to:" + EMAIL)).body);
if (found.messages.length > 0) {
  const text = json(http.get(base + "/api/v1/message/" + found.messages[0].ID).body).Text;
  // the number after a "code" label first, so an order number earlier in the mail can't win
  const match = text.match(/(?:code|otp|passcode)\D{0,20}(\d{6})\b/i) || text.match(/\b(\d{6})\b/);
  if (!match) { throw new Error("No 6-digit code in the latest mail to " + EMAIL); }
  output.OTP_CODE = match[1];
}
```

### Request, poll, enter

```yaml
- runScript: scripts/clear-inbox.js          # DELETE /api/v1/search?query=to:<EMAIL>
- tapOn: { id: "send-code-button" }
- runScript: scripts/fetch-otp.js
- repeat:                                    # ~10 checks, ~3 s apart
    while:
      true: ${output.OTP_CODE == ''}
    times: 10
    commands:
      - extendedWaitUntil:                   # the delay: optional wait for an absent element
          visible: "__never_present__"
          timeout: 1000
          optional: true
      - runScript: scripts/fetch-otp.js
- assertTrue: ${output.OTP_CODE != ''}
```

Single input field:

```yaml
- tapOn:
    id: "otp_input"
- inputText: ${output.OTP_CODE}
```

Segmented inputs (one box per digit): index the string directly. Auto-focus often steals the cursor, so tap each box:

```yaml
- tapOn: { id: "otp-input-0" }
- inputText: ${output.OTP_CODE[0]}
- tapOn: { id: "otp-input-1" }
- inputText: ${output.OTP_CODE[1]}
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
- Use a dedicated, disposable test account per feature (`maestro-{feature}@example.com`). When sharding, add `${MAESTRO_SHARD_INDEX}` to the address so shards don't share an inbox or account.
