# Agent Orchestrator Configuration Guide

## Quick Start

The orchestrator requires cloud agent configuration to run. Set up the required environment variables before starting.

**Required setup:**
```bash
export CURSOR_API_TOKEN=your_token_here
export GITHUB_REPO=https://github.com/grandinh/claude-chaos-express.git
export GITHUB_REF=main

cd scripts
npm run orchestrator
```

## Environment Variables

### CURSOR_API_TOKEN
**Required:** Yes

**How to get it:**
1. Go to [Cursor Settings](https://cursor.com/settings)
2. Navigate to API section
3. Generate or copy your API token

**Security:** Never commit this to git. Use environment variables or a `.env` file (add to `.gitignore`).

---

### GITHUB_REPO
**Required:** Yes

**Your setup:** `https://github.com/grandinh/claude-chaos-express.git`

**Format:** Full GitHub repository URL or `username/repo` format

**When to change:**
- If you're using a different repository
- If you're working with a fork

---

### GITHUB_REF
**Required:** No (default: `main`)

**Your setup:** Your default branch is `main`, so the default works perfectly.

**When to change:**
- If you want cloud agents to work from a different branch
- If you're testing with a feature branch
- Format: `branch-name`, `tag-name`, or commit SHA

---

## Configuration Methods

### Option 1: Environment Variables
```bash
# Set in your shell
export CURSOR_API_TOKEN=your_token_here
export GITHUB_REPO=https://github.com/grandinh/claude-chaos-express.git
export GITHUB_REF=main

# Or inline when running
CURSOR_API_TOKEN=your_token GITHUB_REPO=https://github.com/grandinh/claude-chaos-express.git npm run orchestrator
```

### Option 2: .env File (Recommended)
```bash
# Create scripts/.env
cat > scripts/.env << EOF
CURSOR_API_TOKEN=your_token_here
GITHUB_REPO=https://github.com/grandinh/claude-chaos-express.git
GITHUB_REF=main
EOF

# Load before running (or use dotenv package)
source scripts/.env
npm run orchestrator
```

### Option 3: Shell Profile (Persistent)
Add to `~/.zshrc` or `~/.bashrc`:
```bash
export CURSOR_API_TOKEN=your_token_here
export GITHUB_REPO=https://github.com/grandinh/claude-chaos-express.git
export GITHUB_REF=main
```

---

## Recommended Configuration

**Production setup:**
```bash
export CURSOR_API_TOKEN=your_token_from_cursor_settings
export GITHUB_REPO=https://github.com/grandinh/claude-chaos-express.git
export GITHUB_REF=main
```

---

## Testing Your Configuration

```bash
# Verify required environment variables are set
echo $CURSOR_API_TOKEN
echo $GITHUB_REPO

# Check orchestrator status
cd scripts
npm run orchestrator-status

# Start orchestrator
npm run orchestrator
```

---

## Troubleshooting

### "CURSOR_API_TOKEN not set"
- Get token from https://cursor.com/settings
- Set `CURSOR_API_TOKEN=your_token` in environment or `.env` file
- Verify token is exported: `echo $CURSOR_API_TOKEN`

### "GITHUB_REPO not set"
- Set `GITHUB_REPO=https://github.com/grandinh/claude-chaos-express.git`
- Can use full URL or `username/repo` format
- Verify it's exported: `echo $GITHUB_REPO`

### "Cannot start orchestrator without cloud agent API key"
- Both `CURSOR_API_TOKEN` and `GITHUB_REPO` must be set
- Orchestrator validates these at startup and exits if missing

### Agents not spawning
- Check `npm run orchestrator-status` to see agent pool state
- Verify tasks are in queue: `npm run queue-status`
- Check logs in `.cursor/automation-logs/orchestrator-errors.log`
- Verify API token is valid and has necessary permissions

### Cloud agent API errors
- Verify API token is correct and not expired
- Check network connectivity to `api.cursor.com`
- Review error logs in `.cursor/automation-logs/orchestrator-errors.log`
- Ensure GitHub repository exists and is accessible
