# CI/CD & Maestro Cloud

Run flows in CI either on **Maestro Cloud** (real/hosted devices, incl. iOS — no local simulators) or self-hosted (**Android only**; iOS needs macOS).

## Tags drive CI selection

Tag flows in their header and filter at run time:

```yaml
appId: com.example.app
tags: [ci, smoke]
---
- launchApp
```

```bash
maestro test --include-tags ci .maestro/
maestro test --exclude-tags wip .maestro/
```

## Maestro Cloud — CLI

Requires auth: `maestro login` (interactive) or `MAESTRO_CLOUD_API_KEY` (CI). Cloud applies a ~15-min soft limit per execution — split long suites.

```bash
maestro cloud \
  --api-key "$MAESTRO_API_KEY" \
  --project-id "$MAESTRO_PROJECT_ID" \
  --app-file ./app-release.apk \
  --include-tags smoke \
  --device-os android-34 \
  .maestro/
```

Prefer **named** parameters (`--app-file`, `--flows`) over positional — order-independent and CI-safe. Reuse an uploaded binary with `--app-binary-id` to skip re-upload.

## GitHub Actions

Use the official action `mobile-dev-inc/action-maestro-cloud`. Store `MAESTRO_API_KEY` (and `MAESTRO_PROJECT_ID`) as repository secrets.

```yaml
name: Mobile E2E
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  maestro-cloud:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      # Build an Android binary (RN/Expo example)
      - name: Build APK
        run: |
          npx expo prebuild --platform android --no-install
          cd android && ./gradlew assembleRelease

      - name: Run Maestro Cloud
        id: maestro
        uses: mobile-dev-inc/action-maestro-cloud@v2
        with:
          api-key: ${{ secrets.MAESTRO_API_KEY }}
          project-id: ${{ secrets.MAESTRO_PROJECT_ID }}
          app-file: android/app/build/outputs/apk/release/app-release.apk
          workspace: .maestro
          include-tags: ci
          # device-model / device-os optional; run `maestro list-cloud-devices` for valid pairs
```

### Action inputs (essentials)

| Input | Notes |
|-------|-------|
| `api-key` *(req)* | Maestro Cloud API key |
| `project-id` *(req)* | From the Maestro dashboard |
| `app-file` *(req unless `app-binary-id`)* | APK/AAB, or ZIP of a Simulator `.app` |
| `workspace` | Flows dir (default `.maestro`) |
| `include-tags` / `exclude-tags` | Comma-separated tag filters |
| `env` | Vars passed to flows (secrets) |
| `device-model` / `device-os` | e.g. `iPhone-17-Pro` / `iOS-26-2`, `pixel_6` / `android-34`. Run `maestro list-cloud-devices`. |
| `async` | Start upload and exit immediately |
| `name`, `timeout`, `mapping-file` | Friendly name / minutes / dSYM-ProGuard |

> `android-api-level` and `ios-version` are **deprecated** — use `device-os` (`android-34`, `iOS-26-2`).

### Outputs

`MAESTRO_CLOUD_CONSOLE_URL`, `MAESTRO_CLOUD_UPLOAD_STATUS`, `MAESTRO_CLOUD_FLOW_RESULTS` — surface them in later steps or PR comments.

Other providers (Bitrise, Bitbucket, CircleCI, GitLab, Jenkins, Azure) use the same `maestro cloud` CLI; see the generic-CI docs. Native PR integration can run async and block merges on failure.

## Reports & artifacts (local + CI)

```bash
maestro test --format junit  --output report.xml   .maestro/
maestro test --format html   --output report.html  .maestro/
maestro test --debug-output ./out .maestro/         # screenshots, hierarchy, maestro.log
```

Default artifacts land in `~/.maestro/tests/<timestamp>/` (override with `testOutputDir` / `--test-output-dir`). Upload `report.xml` / `./out` as CI artifacts for triage.

## Sharding (local parallelism)

```bash
maestro test --shard-split=4 .maestro/    # split tests across 4 connected devices
maestro test --shard-all=3 .maestro/      # run ALL tests on each of 3 devices
```

## Self-hosted Docker (Android only)

```dockerfile
FROM openjdk:17-slim
RUN curl -fsSL "https://get.maestro.mobile.dev" | bash
ENV PATH="/root/.maestro/bin:${PATH}"
COPY .maestro/ /app/.maestro/
WORKDIR /app
CMD ["maestro", "test", ".maestro/"]
```

iOS requires macOS + Xcode and cannot run in Linux Docker — use Maestro Cloud (or a macOS runner) for iOS in CI.
