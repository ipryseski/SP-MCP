# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Two components, shipped together, that bridge Claude Desktop and Super Productivity (SP) via MCP:

- **`mcp_server.py`** — a Python MCP server (stdio transport, `mcp` SDK) that Claude Desktop talks to directly. It exposes tools like `create_task`, `update_task`, `add_time_spent`, `complete_and_archive_task`, `get_projects`, `create_tag`, etc.
- **`plugin.js` + `manifest.json` + `index.html`** — a Super Productivity plugin, installed inside SP itself (Settings → Plugins), that receives commands and calls SP's `PluginAPI` on the server's behalf. `index.html` is the plugin's dashboard iframe (stats, connection status, activity log, polling-frequency setting), shown via `PluginAPI.showIndexHtmlAsView()`.

These two halves are packaged and installed separately (see Commands below) and never talk to each other directly — see Architecture.

## Commands

### Plugin (JS) — root `package.json`

```sh
npm install          # ESLint + Prettier (needs Node >= 18.18)
npm run lint          # ESLint over *.js
npm run lint:fix
npm run format        # Prettier over js/html/json/md/yaml
npm run format:check
npm run package        # build SP-MCP.zip via scripts/package.sh
```

`npm run package` bundles only `manifest.json`, `plugin.js`, `index.html`, and `icon.svg` (flat, at the archive root — SP's plugin loader requires this layout and silently fails on nested paths). `mcp_server.py` is not part of this ZIP.

There are no JS tests in this repo.

### MCP server (Python)

```sh
pip install -r requirements.txt     # just `mcp>=1.0.0`
python3 mcp_server.py               # run directly (normally launched by Claude Desktop via its config)
python3 -m py_compile mcp_server.py merge_config.py   # syntax check (what CI runs)
```

There are no Python tests in this repo either; CI only does a `py_compile` syntax check.

### Installing/reinstalling during development

- `setup.sh` (Mac/Linux) / `setup.bat` (Windows) copy `mcp_server.py` + `merge_config.py` into the per-OS data directory (see Architecture), write a `start_mcp_server` script, and merge (or create) the `super-productivity` entry in Claude Desktop's MCP config, backing up the existing config first.
- The plugin ZIP (`npm run package`) still has to be installed manually inside SP (Settings → Plugins → Install Plugin), and the plugin toggled off/on after every reinstall — there's no hot reload.
- CI's PR job attaches a test-build ZIP to the pull request for exactly this manual-install workflow.

### CI/Release

- `.github/workflows/ci.yml`: lint, format check, `manifest.json` schema check, Python syntax check, a version-bump check (PRs only — requires `manifest.json`'s `version` to increase whenever any shipped plugin file changes), and a ZIP test-build (PRs only, posted as a sticky PR comment).
- `.github/workflows/release.yml`: triggered by pushing a `vX.Y.Z` tag; refuses to run if the tag doesn't match `manifest.json`'s `version`, then lints/formats/packages and publishes `SP-MCP.zip` as a GitHub release.

## Architecture

### Communication: file-based IPC, not a network protocol

`mcp_server.py` and `plugin.js` never call each other directly — SP plugins can't open network servers, and the MCP server isn't running inside SP's process. Instead they poll a shared directory:

- Windows: `%APPDATA%\super-productivity-mcp\`
- Linux: `~/.local/share/super-productivity-mcp/`
- macOS: `~/Library/Application Support/super-productivity-mcp/`

with `plugin_commands/` and `plugin_responses/` subdirectories.

Flow for a tool call (e.g. `add_time_spent`):
1. An `SuperProductivityMCPServer` method builds a command dict and calls `send_command()` (`mcp_server.py:293`), which writes `plugin_commands/{action}_{timestamp}_{uuid}.json` and then polls for a matching `plugin_responses/{id}_response.json` for up to 30s.
2. `plugin.js`'s `startCommandProcessing()` polls `plugin_commands/` on an interval (`commandCheckIntervalMs`, default 2000ms, user-adjustable from the dashboard, persisted via `PluginAPI.persistDataSynced`) and hands new files to `executeCommand()`.
3. `executeCommand()` is one large `switch (command.action)` dispatching to the SP `PluginAPI` (`getTasks`, `updateTask`, `addTask`, `addProject`, `addTag`, `executeNodeScript`, ...). Add a new command there when adding a new bridge action, not directly in `mcp_server.py`.
4. The result is written back via `writeCommandResponse()`, and the original command file is deleted via `deleteCommandFile()`.

Adding a new MCP tool therefore always touches three places: the `types.Tool` schema + dispatch in `mcp_server.py`'s `setup_tools()`, a handler method that calls `send_command()`, and a matching `case` in `plugin.js`'s `executeCommand()` (the action name is the contract between the two — e.g. `add_time_spent` → `send_command("addTimeSpent", ...)` → `case 'addTimeSpent'`).

### `plugin.js` runs with no direct Node access

Despite the `nodeExecution` permission in `manifest.json`, `plugin.js` itself executes in a browser/iframe-like renderer context (`window`, no top-level `require`). Real filesystem work (reading/writing command and response files, resolving the per-OS data dir) is done by constructing a JS source string and handing it to `PluginAPI.executeNodeScript({ script, args, timeout })`, which runs it in an actual sandboxed Node context and returns `{ success, result }`. Every `require('fs'|'path'|'os')` in this file lives inside one of these template-literal `script` strings, not in `plugin.js`'s own scope — don't add a bare top-level `require()` expecting it to work.

### Two independent "success" layers

`executeCommand()`'s outer response is `{ success: true, result, executionTime, timestamp }` unless an exception is thrown (in which case it's `{ success: false, error }`). A handler that wants a failure to be visible as `success: false` must `throw`, not return an object with an `error`/`success: false` field buried inside `result` — several handlers historically did the latter and looked successful from the MCP server's side. `findTaskById()` (used by `addTimeSpent`, `addTagToTask`, `removeTagFromTask`) throws for exactly this reason; follow that pattern for new single-task lookups.

### Task title syntax parsing

`mcp_server.py`'s tool descriptions instruct Claude to convert natural-language dates into SP's own title syntax (`#tag`, `+project`, `@fri 3pm` / `@Ndays`) before calling `create_task`/`update_task` — the conversion happens in Claude's reasoning, not in this code. `parse_task_syntax()` (`mcp_server.py:314`) exists to parse that syntax back out but is not currently called from any tool handler.

### Event hooks are write-only today

`plugin.js` registers SP lifecycle hooks (`taskUpdate`, `taskComplete`, `taskDelete`, `currentTaskChange`, declared in `manifest.json`) and forwards them via `sendEventToMCP()`, which writes `plugin_responses/{timestamp}_{eventType}_event.json`. Nothing in `mcp_server.py` currently reads these event files — there's no push notification path back into Claude Desktop yet, only the request/response polling described above.
