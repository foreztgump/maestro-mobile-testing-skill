# CI/CD & Maestro Cloud

Run flows in CI either on **Maestro Cloud** (hosted Android emulators and iOS simulators) or self-hosted (Android on Linux; iOS needs a macOS runner).

- [Lint flows first](#lint-flows-first)
- [Tags drive CI selection](#tags-drive-ci-selection)
- [Maestro Cloud — CLI](#maestro-cloud--cli)
- [GitHub Actions](#github-actions)
- [Reports & artifacts](#reports--artifacts-local--ci)
- [Sharding](#sharding-local-parallelism)
- [Self-hosted Docker (Android only)](#self-hosted-docker-android-only)
- [Self-hosted iOS (macOS runners)](#self-hosted-ios-macos-runners)

## Lint flows first

`maestro check-syntax` parses a flow without a device, so it catches unknown commands and properties in seconds, before any build or upload:

```bash
find .maestro -name '*.yaml' ! -name config.yaml -print0 | xargs -0 -n1 maestro check-syntax
```

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

Requires auth: `maestro login` (interactive), `--api-key`, or the `MAESTRO_CLOUD_API_KEY` env var (the name the CLI reads). Pass `--project-id` in CI; without it the CLI prompts. Cloud applies a ~15-min soft limit per execution — split long suites.

```bash
maestro cloud \
  --api-key "$MAESTRO_CLOUD_API_KEY" \
  --project-id "$MAESTRO_PROJECT_ID" \
  --app-file ./app-release.apk \
  --include-tags smoke \
  --device-os android-34 \
  .maestro/
```

Prefer **named** parameters (`--app-file`, `--flows`) over positional — order-independent and CI-safe. Reuse an uploaded binary with `--app-binary-id` to skip re-upload.

## GitHub Actions

Use the official action `mobile-dev-inc/action-maestro-cloud@v3`. It installs the Maestro CLI itself. Store the API key and project id as repository secrets (the names are yours; the action takes them as inputs).

```yaml
name: Mobile E2E
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  maestro-cloud:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      # JDK for the Gradle build
      - uses: actions/setup-java@v6
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
        uses: mobile-dev-inc/action-maestro-cloud@v3
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
| `name`, `timeout`, `mapping-file` | Friendly name / minutes (default 30) / dSYM-ProGuard |
| `device-locale`, `branch`, `maestro-cli-version` | Locale, branch label, pinned CLI version |

> `android-api-level` and `ios-version` are **deprecated** — use `device-os` (`android-34`, `iOS-26-2`).

### Outputs

`MAESTRO_CLOUD_CONSOLE_URL`, `MAESTRO_CLOUD_UPLOAD_STATUS`, `MAESTRO_CLOUD_FLOW_RESULTS`, `MAESTRO_CLOUD_APP_BINARY_ID` — surface them in later steps or PR comments, and pass the binary id to a later job's `app-binary-id` to skip re-uploading.

Other providers (Bitrise, Bitbucket, CircleCI, GitLab, Jenkins, Azure) use the same `maestro cloud` CLI; see the generic-CI docs. Native PR integration can run async and block merges on failure.

## Reports & artifacts (local + CI)

```bash
maestro test --format junit  --output report.xml   .maestro/
maestro test --format html   --output report.html  .maestro/
maestro test --format html-detailed --output report.html .maestro/   # adds per-step detail
maestro test --debug-output ./out .maestro/         # screenshots, hierarchy, maestro.log
```

Default artifacts land in `~/.maestro/tests/<timestamp>/` (per flow: screenshots, device logs, crash/ANR reports, `maestro.log`) (override with `testOutputDir` / `--test-output-dir`). Upload `report.xml` / `./out` as CI artifacts for triage.

## Sharding (local parallelism)

```bash
maestro test --shard-split=4 .maestro/    # split tests across 4 connected devices
maestro test --shard-all=3 .maestro/      # run ALL tests on each of 3 devices
```

Each shard sees `MAESTRO_SHARD_INDEX` (and `MAESTRO_DEVICE_UDID`); use them to keep test accounts and screenshot names unique per shard.

## Self-hosted Docker (Android only)

```dockerfile
FROM eclipse-temurin:17-jdk
RUN apt-get update && apt-get install -y --no-install-recommends curl unzip && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL "https://get.maestro.mobile.dev" | bash
ENV PATH="/root/.maestro/bin:${PATH}"
COPY .maestro/ /app/.maestro/
WORKDIR /app
CMD ["maestro", "test", ".maestro/"]
```

The container needs an emulator or device it can reach over ADB; Maestro itself doesn't start one.

## Self-hosted iOS (macOS runners)

iOS requires macOS + Xcode and cannot run in Linux Docker. On a macOS runner, build for the simulator (`xcodebuild -destination 'generic/platform=iOS Simulator'`), boot it with `maestro start-device --platform ios --device-os iOS-26-2`, install the `.app` with `xcrun simctl install booted`, then `maestro test`. Maestro 2.6+ can shard across several simulators in parallel.
