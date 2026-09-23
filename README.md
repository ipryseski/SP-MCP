# SP-MCP

> This is [Diane Pryseski](https://github.com/ipryseski)'s personal fork of
> [organicmoron/SP-MCP](https://github.com/organicmoron/SP-MCP).

Bridge between the amazing [Super Productivity](https://github.com/johannesjo/super-productivity/) app and MCP (Model Context Protocol) servers for Claude Desktop integration.

This MCP and plugin allows Claude Desktop to directly interact with Super Productivity through the MCP protocol. Create update,tasks, manage projects and tags, and get information from Super Productivity.

Make sure to backup your Super Productivity before using in case of data loss. See [Development](#development) below for how to build the installable plugin ZIP.

(Can't delete tasks right now (but it can mark them as done))

## Demo

https://github.com/user-attachments/assets/cc118173-023f-48cb-8213-427027e475af

## Requirements

- Super Productivity 14.0.0 or higher
- Claude Desktop
- Python 3.8 or higher

## Installation

### Automatic Setup

**Windows:**

1. Clone this repo
2. Run `setup.bat`
3. Follow the prompts

**Linux/Mac UNTESTED:**

1. Clone this repo
2. Run `chmod +x setup.sh && ./setup.sh`
3. Follow the prompts

The setup scripts will preserve any existing MCP servers in your Claude Desktop configuration.

You'll still have to install the plugin.zip manually in Super Productivity in settings->plugins.

Once that's done, restart claude (and Super Prod for good measure) and you should be able to access your files

### Manual Setup

1. **Install Python dependencies:**

   ```bash
   pip install mcp
   ```

2. **Set up MCP server:**
   Copy `mcp_server.py` to your data directory:
   - Windows: `%APPDATA%\super-productivity-mcp\`
   - Linux: `~/.local/share/super-productivity-mcp/`
   - macOS: `~/Library/Application Support/super-productivity-mcp/`

3. **Configure Claude Desktop:**
   Edit Claude's config file and add to `mcpServers`:

   ```json
   "super-productivity": {
     "command": "python3",
     "args": ["/path/to/mcp_server.py"]
   }
   ```

4. **Install the plugin:**
   - Open Super Productivity → Settings → Plugins
   - Click "Upload Plugin"
   - Select `plugin.js`

5. **Restart Claude Desktop**

## Usage

### Creating Tasks

```
"Create a task to review the quarterly budget #finance +work"
```

### Task Management

```
"Show me all my tasks"
"Mark the budget review task as complete"
"Update the task 'Meeting prep' with notes about the agenda"
```

### Project and Tag Management

```
"Create a new project called 'Website Redesign'"
"Show me all projects"
"Get all tags"
```

## Dashboard

Access the SP-MCP dashboard from the menu. The dashboard shows:

- Real-time statistics
- Connection status
- Activity logs
- Settings (polling frequency: default 2 seconds)

## Communication

The plugin uses file-based communication through:

- Windows: `%APPDATA%\super-productivity-mcp\`
- Linux: `~/.local/share/super-productivity-mcp/`
- macOS: `~/Library/Application Support/super-productivity-mcp/`

Commands are exchanged through `plugin_commands/` and `plugin_responses/` directories.

## Development

```sh
npm install          # ESLint + Prettier (needs Node >= 18.18)
npm run lint         # ESLint over *.js
npm run lint:fix
npm run format       # Prettier over js/html/json/md/yaml
npm run format:check
npm run package      # build SP-MCP.zip (manifest.json/plugin.js/index.html/icon.svg)
```

`npm run package` only bundles the plugin half of this repo. `mcp_server.py`
is a separate component, installed via `setup.sh`/`setup.bat` as described
above, and isn't part of the plugin ZIP.

CI runs lint, format, a `manifest.json` schema check, and a Python syntax
check on every push/PR, plus a version-bump check and a test-build ZIP
(attached to the PR) on pull requests. Tagging `vX.Y.Z` (matching
`manifest.json`'s `version`) publishes `SP-MCP.zip` as a GitHub release.

## Troubleshooting

### Plugin Not Loading

- Check Super Productivity version (14.0.0+ required)
- Verify plugin permissions include `nodeExecution`

### Commands Not Working

- Verify both plugin and MCP server are running
- Check file permissions on communication directories
- Check `mcp_server.log` in the data directory
