---
name: otp-login-flow
tags: [authoring, auth]
runs: 3
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

Write a Maestro flow for our Expo app (`com.acme.app`) that signs a user in with a 6-digit code sent by email. Locally, Mailpit at http://localhost:8025 captures all outgoing mail. Several CI shards run this flow at the same time, each with its own address.

The app's testIDs: `email-input`, `send-code-button`, `otp-input-0` through `otp-input-5` (one box per digit), and `home-screen` once signed in.

Reply with the full contents of every file needed (the flow YAML and any scripts). Don't write files.
