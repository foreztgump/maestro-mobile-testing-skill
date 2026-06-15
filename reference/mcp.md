# Maestro MCP Server

The Maestro MCP server ships **inside the Maestro CLI** and exposes Maestro's authoring, device, and Cloud capabilities to AI agents over stdio (Model Context Protocol). It turns this skill from "write good YAML" into a **write → run → see → fix** loop on a live device.

| | This skill | Maestro MCP |
|---|-----------|-------------|
| Role | Teaches correct patterns | Executes on a real device/emulator |
| Layer | Authoring (write YAML) | Runtime (run, inspect, screenshot, Cloud) |
| Output | Better test files | Live results to iterate on |

Use both: the skill keeps the YAML idiomatic; the MCP runs it and feeds back failures.

## Setup

Prereqs: Maestro CLI installed and a coding agent that supports MCP. The MCP is bundled — no extra install.

```bash
# Claude Code
claude mcp add maestro -- maestro mcp           # add --scope user|project as needed

# Codex CLI
codex mcp add maestro -- maestro mcp

# Gemini CLI
gemini mcp add maestro maestro mcp
```

Generic stdio config (Cursor, Windsurf, VS Code, JetBrains, Claude Desktop, etc.):

```json
{
  "mcpServers": {
    "maestro": {
      "command": "maestro",
      "args": ["mcp"]
    }
  }
}
```

If `maestro` isn't on `PATH` (common for GUI apps like Claude Desktop), use the absolute path (`which maestro`) and pass `JAVA_HOME` explicitly:

```json
{
  "mcpServers": {
    "maestro": {
      "command": "/opt/homebrew/bin/maestro",
      "args": ["mcp"],
      "env": { "JAVA_HOME": "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" }
    }
  }
}
```

After upgrading the CLI, reload the MCP connection in your agent (e.g. Claude Code: `/mcp` → maestro → Reconnect).

## Tools

| Tool | Use |
|------|-----|
| `list_devices` | List local Android emulators / iOS simulators / Chromium for web |
| `inspect_screen` | Current screen's view hierarchy as compact JSON. **Call before targeting elements; re-call after any UI change.** |
| `take_screenshot` | Screenshot to disambiguate visually |
| `run` | Execute flows. Exactly one of `{ yaml }` (inline, best for exploration), `{ files }`, or `{ dir, include_tags, exclude_tags }`. Validates syntax. |
| `cheat_sheet` | Returns Maestro command/syntax cheat sheet — call before authoring unfamiliar commands |
| `list_cloud_devices` | Valid `{ device_model, device_os }` pairs for Cloud (pass OS verbatim, e.g. `iOS-17-5`) |
| `run_on_cloud` | Submit a flow/folder to Maestro Cloud; returns `upload_id`, `project_id`, dashboard URL |
| `get_cloud_run_status` | Poll a Cloud run every ~60s until terminal (`SUCCESS`/`ERROR`/`CANCELED`/`WARNING`) |
| `open_maestro_viewer` | Returns the Viewer URL (embeds the device in the agent/browser) |

Cloud tools (`list_cloud_devices`, `run_on_cloud`, `get_cloud_run_status`) need auth: `maestro login` or `MAESTRO_CLOUD_API_KEY`.

## Agent write-run-fix loop

1. `list_devices` → confirm a target is up (else `maestro start-device`).
2. `inspect_screen` → read the **live** accessibility tree; choose real selectors (never guess).
3. `run` with inline `{ yaml }` → try a step or short sequence.
4. On failure: `take_screenshot` / re-`inspect_screen` → see actual state.
5. Fix selector/wait per `reference/patterns.md` → re-run.
6. Once green, save the YAML into `.maestro/` and tag it for CI.

**Key habit:** call `inspect_screen` *after every UI transition*. Stale hierarchy assumptions are the #1 cause of agent-written flow failures.

## Maestro Viewer

`open_maestro_viewer` embeds a simulator/emulator/device in your agent or browser and shows the exact commands the MCP runs in real time — useful for interactive iteration. Ask the agent: "open the maestro viewer."
