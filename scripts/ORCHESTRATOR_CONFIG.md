# Agent Orchestrator Configuration Guide

## Quick Start (Local Mode - Recommended)

For local development, you don't need to set any environment variables. The orchestrator will:
- Use `local` mode by default
- Find Claude CLI in your PATH (`/Users/grandinharrison/.local/bin/claude`)
- Work with your local repository

**Just run:**
```bash
cd scripts
npm run orchestrator
```

## Environment Variables

### AGENT_MODE
**Recommended:** `local` (default)

- **`local`**: Spawns Claude CLI processes locally. Best for:
  - Development and testing
  - Faster iteration
  - No API costs
  - Full control over agent execution

- **`cloud`**: Uses Cursor Cloud Agent API. Best for:
  - Production automation
  - Parallel execution across multiple machines
  - When you want PRs automatically created
  - When you need agents to work on remote branches

**Your setup:** Start with `local` (no config needed). Switch to `cloud` when you're ready for production automation.

---

### CURSOR_API_TOKEN
**Required for:** Cloud mode only

**How to get it:**
1. Go to [Cursor Settings](https://cursor.com/settings)
2. Navigate to API section
3. Generate or copy your API token

**Your setup:** Not needed for local mode. Set this when you want to use cloud agents.

**Security:** Never commit this to git. Use environment variables or a `.env` file (add to `.gitignore`).

---

### GITHUB_REPO
**Recommended:** `https://github.com/grandinh/claude-chaos-express.git`

**Required for:** Cloud mode only

**Your setup:** Your repo is `https://github.com/grandinh/claude-chaos-express.git`

**Note:** For local mode, this is not used. The orchestrator works directly with your local filesystem.

---

### GITHUB_REF
**Recommended:** `main` (default)

**Your setup:** Your default branch is `main`, so the default works perfectly.

**When to change:**
- If you want cloud agents to work from a different branch
- If you're testing with a feature branch
- Format: `branch-name`, `tag-name`, or commit SHA

---

### CLAUDE_CMD
**Recommended:** `claude` (default)

**Your setup:** Claude is at `/Users/grandinharrison/.local/bin/claude` and is in your PATH, so the default works.

**When to change:**
- If Claude is not in your PATH
- If you have multiple Claude installations
- If you want to use a specific version

**Example:** `CLAUDE_CMD=/Users/grandinharrison/.local/bin/claude`

---

## Configuration Methods

### Option 1: Environment Variables (Recommended for Local)
```bash
# Set in your shell
export AGENT_MODE=local
export CLAUDE_CMD=claude

# Or inline when running
AGENT_MODE=local npm run orchestrator
```

### Option 2: .env File (Recommended for Cloud)
```bash
# Create scripts/.env from .env.example
cp scripts/.env.example scripts/.env

# Edit scripts/.env with your values
# Then load before running:
source scripts/.env  # or use dotenv package
npm run orchestrator
```

### Option 3: Shell Profile (Persistent)
Add to `~/.zshrc` or `~/.bashrc`:
```bash
export AGENT_MODE=local
export CLAUDE_CMD=claude
# For cloud mode, add:
# export CURSOR_API_TOKEN=your_token_here
# export GITHUB_REPO=https://github.com/grandinh/claude-chaos-express.git
```

---

## Recommended Configuration for Your Setup

### For Local Development (Current)
**No configuration needed!** The defaults work perfectly:
- `AGENT_MODE=local` (default)
- `CLAUDE_CMD=claude` (in PATH)
- No API token needed
- No GitHub repo needed

### For Cloud Mode (Future)
When ready to use cloud agents, create `scripts/.env`:
```bash
AGENT_MODE=cloud
CURSOR_API_TOKEN=your_token_from_cursor_settings
GITHUB_REPO=https://github.com/grandinh/claude-chaos-express.git
GITHUB_REF=main
```

---

## Testing Your Configuration

```bash
# Check if Claude is accessible
which claude
# Should output: /Users/grandinharrison/.local/bin/claude

# Test orchestrator with current config
cd scripts
npm run orchestrator-status

# Start orchestrator
npm run orchestrator
```

---

## Troubleshooting

### "Claude command not found"
- Set `CLAUDE_CMD=/Users/grandinharrison/.local/bin/claude`
- Or add Claude to your PATH: `export PATH="$HOME/.local/bin:$PATH"`

### "CURSOR_API_TOKEN not set" (Cloud Mode)
- Get token from https://cursor.com/settings
- Set `CURSOR_API_TOKEN=your_token` in environment or `.env`

### "GITHUB_REPO not set" (Cloud Mode)
- Set `GITHUB_REPO=https://github.com/grandinh/claude-chaos-express.git`

### Agents not spawning
- Check `npm run orchestrator-status` to see agent pool state
- Verify tasks are in queue: `npm run queue-manager`
- Check logs in `sessions/tasks/.orchestrator-state.json`

