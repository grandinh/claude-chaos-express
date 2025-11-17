# Multi-Agent Orchestration Operator Guide

**Version:** 1.0.0
**Last Updated:** 2025-11-16
**Status:** Production Ready (Phase 1 & 2 Complete)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [System Architecture](#system-architecture)
3. [Starting the Orchestrator](#starting-the-orchestrator)
4. [Monitoring](#monitoring)
5. [Troubleshooting](#troubleshooting)
6. [Emergency Procedures](#emergency-procedures)
7. [Configuration](#configuration)
8. [Maintenance](#maintenance)

---

## Quick Start

### Prerequisites

- Node.js >= v25.1.0
- npm >= v11.6.2
- Task watcher running (Task 1: `m-unified-cursor-automation.md`)
- Context enforcement enabled (Task 2: `h-enforce-context-gathering.md`)
- Claude CLI in PATH

### Installation

```bash
cd scripts
npm install
```

### Start Orchestrator

```bash
# Foreground (for testing/debugging)
npm run orchestrator

# Background with pm2 (production)
pm2 start scripts/agent-orchestrator.js --name orchestrator
pm2 save
```

### Check Status

```bash
npm run orchestrator-status
```

---

## System Architecture

### Component Overview

```
┌─────────────────────────────────────┐
│     File Watcher (Task 1)           │
│  Detects new tasks → .new-tasks.log │
└───────────┬─────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│    Task Queue Manager                │
│  Reads log → Routes to queues       │
└───────┬──────────────┬──────────────┘
        ↓              ↓
  ┌──────────┐   ┌───────────────┐
  │ Context  │   │Implementation │
  │  Queue   │   │    Queue      │
  └────┬─────┘   └────────┬──────┘
       ↓                  ↓
┌─────────────────────────────────────┐
│      Agent Orchestrator              │
│  3-agent pool with load balancing   │
└───┬────────┬────────┬───────────────┘
    ↓        ↓        ↓
Agent-1  Agent-2  Agent-3
```

### State Files

| File | Location | Purpose |
|------|----------|---------|
| `.new-tasks.log` | `sessions/tasks/` | Task detection log (written by watcher) |
| `.task-queues.json` | `sessions/tasks/` | Queue state (context + implementation) |
| `.orchestrator-state.json` | `sessions/tasks/` | Agent pool state (status, assignments) |
| `agent-registry.json` | `repo_state/` | Agent metadata (24 agents tracked) |

---

## Starting the Orchestrator

### Foreground Mode (Interactive)

**Use for:** Testing, debugging, initial setup

```bash
cd /path/to/claude-chaos-express/scripts
npm run orchestrator
```

**Output:**
```
🚀 Multi-Agent Orchestrator Starting...
📊 Agent pool initialized (3 agents)
🔍 Checking for tasks...
✅ Orchestrator ready
```

**To stop:** Press `Ctrl+C`

### Background Mode with pm2 (Production)

**Use for:** Production deployments, long-running operations

```bash
# Install pm2 globally (if not already installed)
npm install -g pm2

# Start orchestrator
cd /path/to/claude-chaos-express
pm2 start scripts/agent-orchestrator.js --name orchestrator

# Save process list (auto-restart on reboot)
pm2 save

# Setup startup script (Linux/macOS)
pm2 startup
```

**Common pm2 Commands:**

```bash
# Check status
pm2 status orchestrator

# View logs
pm2 logs orchestrator

# Restart
pm2 restart orchestrator

# Stop
pm2 stop orchestrator

# Remove from pm2
pm2 delete orchestrator
```

### Background Mode with systemd (Linux)

Create `/etc/systemd/system/orchestrator.service`:

```ini
[Unit]
Description=Multi-Agent Orchestrator
After=network.target

[Service]
Type=simple
User=<your-username>
WorkingDirectory=/path/to/claude-chaos-express/scripts
ExecStart=/usr/bin/node agent-orchestrator.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Commands:**

```bash
# Enable and start
sudo systemctl enable orchestrator
sudo systemctl start orchestrator

# Check status
sudo systemctl status orchestrator

# View logs
journalctl -u orchestrator -f
```

---

## Monitoring

### Real-Time Dashboard

```bash
npm run orchestrator-status
```

**Sample Output:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🎛️  ORCHESTRATOR STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Orchestrator: ✅ Running (PID: 12345)
Uptime: 2h 34m

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  👥 AGENT POOL (3 agents)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Agent 1: 🟢 Working | Task: h-example-task.md | Role: implementation | Duration: 5m
Agent 2: ⚪ Idle     | Tasks completed: 12
Agent 3: 🟢 Working | Task: m-another-task.md | Role: context | Duration: 2m

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📋 QUEUE STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Context Queue:        8 tasks (ratio: 0.62)
Implementation Queue: 5 tasks
Total Pending:        13 tasks

Top Priority (Context):
  • h-high-leverage-task.md (score: 21.5)
  • m-medium-task.md (score: 14.2)

Top Priority (Implementation):
  • h-ready-to-implement.md (score: 19.8)
```

### Key Metrics

| Metric | Healthy Range | Warning Threshold |
|--------|---------------|-------------------|
| Context Ratio | 0.3 - 0.7 | > 0.8 (context backlog) |
| Agent Idle Rate | 10-30% | < 5% (overloaded) |
| Queue Depth | < 20 tasks | > 50 tasks |
| Agent Failures | 0-2% | > 5% |

### Continuous Monitoring

```bash
# Watch mode (updates every 30s)
watch -n 30 "cd /path/to/scripts && npm run orchestrator-status"

# Or use a cron job to log status
crontab -e
# Add: */5 * * * * cd /path/to/scripts && npm run orchestrator-status >> /var/log/orchestrator-status.log
```

---

## Troubleshooting

### Orchestrator Not Starting

**Symptoms:** `npm run orchestrator` fails or exits immediately

**Diagnosis:**

```bash
# Check if already running
npm run orchestrator-status

# Check for port conflicts (if applicable)
lsof -i :3000  # Replace 3000 with actual port if using one

# Check Claude CLI availability
which claude

# Check permissions
ls -la sessions/tasks/.orchestrator-state.json
```

**Solutions:**

1. **Already running:**
   ```bash
   pm2 stop orchestrator
   # OR find PID
   ps aux | grep agent-orchestrator
   kill <PID>
   ```

2. **Missing Claude CLI:**
   ```bash
   # Add to PATH or install Claude Code
   export PATH="$PATH:/Users/$(whoami)/.local/bin"
   ```

3. **Permission issues:**
   ```bash
   chmod 644 sessions/tasks/.orchestrator-state.json
   chmod 644 sessions/tasks/.task-queues.json
   ```

### Agents Not Picking Up Tasks

**Symptoms:** Queue has tasks, but agents remain idle

**Diagnosis:**

```bash
# Check queue state
cat sessions/tasks/.task-queues.json | jq '.contextQueue | length'
cat sessions/tasks/.task-queues.json | jq '.implementationQueue | length'

# Check agent state
cat sessions/tasks/.orchestrator-state.json | jq '.agents'

# Check task log
tail -20 sessions/tasks/.new-tasks.log
```

**Solutions:**

1. **Tasks have unsatisfied dependencies:**
   - Check `depends_on` field in task frontmatter
   - Complete blocking tasks first
   - Run: `node scripts/dependency-graph.js` to see dependency tree

2. **Corrupt queue state:**
   ```bash
   # Backup current state
   cp sessions/tasks/.task-queues.json sessions/tasks/.task-queues.json.backup

   # Delete and let orchestrator rebuild
   rm sessions/tasks/.task-queues.json

   # Restart orchestrator
   pm2 restart orchestrator
   ```

3. **Invalid frontmatter:**
   - Check task files for YAML syntax errors
   - Ensure `context_gathered` field exists
   - Validate with: `npm run validate-frontmatter`

4. **TEMPLATE frontmatter parsing errors:**
   - **Symptom:** Agents crash with "bad indentation of a mapping entry" errors
   - **Cause:** Unquoted square brackets `[placeholder]` in YAML values
   - **Fix:** Quote all template values with special characters:
     ```yaml
     # ❌ WRONG
     name: [prefix]-[descriptive-name]
     depends_on: [task-1, task-2]

     # ✅ CORRECT
     name: "[prefix]-[descriptive-name]"
     depends_on: []  # Empty array, use comments for examples
     ```
   - **Validation:** Test with `npm run validate-frontmatter` after changes

### Tasks Stuck in Queue

**Symptoms:** Tasks remain in queue for extended periods

**Diagnosis:**

```bash
# Check for blocked tasks
node scripts/dependency-graph.js

# Check agent status
npm run orchestrator-status

# Check for circular dependencies
node scripts/dependency-graph.js --check-cycles
```

**Solutions:**

1. **Circular dependencies detected:**
   - Identify the cycle in dependency graph output
   - Update `depends_on` fields to break the cycle
   - Document the change in `context/decisions.md`

2. **Circular dependency deadlock (0% completion rate):**
   - **Symptom:** 100+ tasks processed, 0 completed
   - **Quick fix:** Reset task queues (backup first):
     ```bash
     cp sessions/tasks/.task-queues.json sessions/tasks/.task-queues.json.backup-$(date +%Y%m%d-%H%M%S)
     rm sessions/tasks/.task-queues.json
     pm2 restart orchestrator
     ```
   - **Root cause:** Circular `depends_on` chains block all task assignment
   - **Prevention:** Run `node scripts/dependency-graph.js` before starting orchestrator

3. **All agents in failed state:**
   ```bash
   # Reset agent pool
   cat <<EOF > sessions/tasks/.orchestrator-state.json
   {
     "agents": [
       {"id": "agent-1", "status": "idle", "completedTasks": 0},
       {"id": "agent-2", "status": "idle", "completedTasks": 0},
       {"id": "agent-3", "status": "idle", "completedTasks": 0}
     ],
     "lastUpdated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
   }
   EOF

   # Restart orchestrator
   pm2 restart orchestrator
   ```

4. **Agents stuck waiting for user input:**
   - Check Claude Code session states
   - Respond to any pause prompts
   - Agents will auto-resume after user responds

### High Context Queue Ratio (> 0.8)

**Symptoms:** Context queue growing faster than implementation queue

**Diagnosis:**

```bash
# Check queue stats
npm run orchestrator-status | grep "ratio"
```

**Solutions:**

1. **Increase agent pool size:**
   - Edit `scripts/agent-orchestrator.js`
   - Change `AGENT_POOL_SIZE` from 3 to 5 or 6
   - Restart orchestrator

2. **Review context-gathering efficiency:**
   - Check if context agents are taking too long
   - Review context manifests for completeness
   - Consider simplifying context requirements

### Agent Failures

**Symptoms:** Agents marked as "failed" in status

**Diagnosis:**

```bash
# Check agent logs
pm2 logs orchestrator

# Check orchestrator state
cat sessions/tasks/.orchestrator-state.json | jq '.agents[] | select(.status=="failed")'
```

**Solutions:**

1. **Agent timeout:**
   - Increase timeout in `scripts/agent-orchestrator.js`
   - Default: 30min (context), 60min (implementation)

2. **Agent spawn failure:**
   - Check Claude CLI is accessible
   - Verify task files exist
   - Check system resources (CPU, memory)

3. **Reset failed agents:**
   ```bash
   # Manually reset in state file
   # OR restart orchestrator (auto-resets on startup)
   pm2 restart orchestrator
   ```

---

## Emergency Procedures

### Complete System Reset

**Use when:** Orchestrator is unrecoverable, state is corrupt

```bash
# 1. Stop orchestrator
pm2 stop orchestrator

# 2. Backup current state
mkdir -p backups/$(date +%Y%m%d-%H%M%S)
cp sessions/tasks/.orchestrator-state.json backups/$(date +%Y%m%d-%H%M%S)/
cp sessions/tasks/.task-queues.json backups/$(date +%Y%m%d-%H%M%S)/

# 3. Clear state files
rm sessions/tasks/.orchestrator-state.json
rm sessions/tasks/.task-queues.json

# 4. Rebuild dependency graph
cd scripts
node dependency-graph.js --rebuild

# 5. Restart orchestrator
pm2 start agent-orchestrator.js --name orchestrator
pm2 save
```

### Recover from Watcher Failure

**Symptoms:** No new tasks being detected

```bash
# Check watcher status
ps aux | grep watch-cursor-automation

# Restart watcher
pm2 restart watcher
# OR
npm run watch-automation &
```

### Manual Queue Population

**Use when:** Tasks exist but aren't in queues

```bash
# Run queue manager manually
cd scripts
node task-queue-manager.js

# Verify queues populated
cat sessions/tasks/.task-queues.json | jq '.contextQueue | length'
```

---

## Configuration

### Orchestrator Settings

**File:** `scripts/agent-orchestrator.js`

```javascript
const AGENT_POOL_SIZE = 3;  // Number of concurrent agents

const CONFIG = {
    // Agent execution mode
    agentMode: process.env.AGENT_MODE || 'local',  // 'local' or 'cloud'

    // Timeouts (milliseconds)
    contextTaskTimeout: 30 * 60 * 1000,      // 30 minutes
    implementationTaskTimeout: 60 * 60 * 1000,  // 60 minutes

    // Polling intervals
    queuePollingInterval: 5000,   // 5 seconds
    statusReportInterval: 30000,  // 30 seconds
};
```

### Queue Manager Settings

**File:** `scripts/task-queue-manager.js`

```javascript
// Priority levels
const PRIORITY_VALUES = {
    'ultra-high': 4,
    'high': 3,
    'medium': 2,
    'low': 1
};

// Leverage levels
const LEVERAGE_VALUES = {
    'ultra-high': 4,
    'high': 3,
    'medium': 2,
    'low': 1
};

// Scoring algorithm
// score = (priority × leverage) + dependencyBonus + queueTimePenalty + contextBacklogBonus
//
// Where:
// - dependencyBonus: +10 if satisfied, -1000 if blocked
// - queueTimePenalty: -0.1 per minute waiting
// - contextBacklogBonus: +5 if contextRatio > 0.6
```

### Environment Variables

```bash
# Project root (auto-detected by default)
export CLAUDE_PROJECT_DIR=/path/to/claude-chaos-express

# Agent execution mode
export AGENT_MODE=local  # or 'cloud'

# Cloud mode settings (if using cloud agents)
export CURSOR_API_TOKEN=your-token-here
export GITHUB_REPO=username/repo
export GITHUB_REF=main
```

---

## Maintenance

### Daily Checks

```bash
# Quick health check
npm run orchestrator-status

# Check for stuck tasks (queue time > 2 hours)
cat sessions/tasks/.task-queues.json | jq '.contextQueue[] | select(.addedAt < "'$(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%SZ)'")'

# View recent completions
cat sessions/tasks/.orchestrator-state.json | jq '.agents[] | {id, completedTasks}'
```

### Weekly Maintenance

```bash
# 1. Clean up completed tasks
cd sessions/tasks
mkdir -p done
mv *-completed-*.md done/

# 2. Archive old logs
cd .cursor/automation-logs
tar -czf archive-$(date +%Y%m).tar.gz *.log
rm *.log

# 3. Verify dependency graph integrity
cd scripts
node dependency-graph.js --check-cycles

# 4. Review orchestrator performance
npm run orchestrator-status
```

### Monthly Audit

1. **Review agent registry:**
   ```bash
   node scripts/agent-registry.js validate
   ```

2. **Check for deprecated agents:**
   ```bash
   node scripts/agent-registry.js list --status=deprecated
   ```

3. **Analyze task completion rates:**
   - Average time in context queue
   - Average time in implementation queue
   - Agent utilization percentage
   - Failure rate trends

4. **Update documentation:**
   - Document any configuration changes
   - Log troubleshooting patterns in `context/gotchas.md`
   - Update decisions in `context/decisions.md`

### Log Rotation

**Using logrotate (Linux):**

Create `/etc/logrotate.d/orchestrator`:

```
/path/to/claude-chaos-express/.cursor/automation-logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 username username
}
```

**Using pm2:**

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## Appendix

### Useful Commands Cheat Sheet

```bash
# Start/Stop
pm2 start scripts/agent-orchestrator.js --name orchestrator
pm2 stop orchestrator
pm2 restart orchestrator

# Status
npm run orchestrator-status
pm2 status orchestrator
pm2 logs orchestrator

# Queue Management
cat sessions/tasks/.task-queues.json | jq '.contextQueue | length'
node scripts/task-queue-manager.js

# Dependency Analysis
node scripts/dependency-graph.js
node scripts/dependency-graph.js --check-cycles

# Agent Registry
node scripts/agent-registry.js validate
node scripts/agent-registry.js sync

# State Management
cat sessions/tasks/.orchestrator-state.json | jq '.agents'
cat sessions/tasks/.task-queues.json | jq '.processedTasks | length'
```

### State File Schemas

**`.orchestrator-state.json`:**

```json
{
  "agents": [
    {
      "id": "agent-1",
      "status": "idle|working|failed",
      "currentTask": "/path/to/task.md",
      "role": "context|implementation",
      "startedAt": "ISO-8601",
      "completedTasks": 42,
      "pid": 12345
    }
  ],
  "lastUpdated": "ISO-8601"
}
```

**`.task-queues.json`:**

```json
{
  "contextQueue": [...],
  "implementationQueue": [...],
  "processedTasks": [...],
  "dependencyGraph": {...},
  "lastUpdated": "ISO-8601"
}
```

---

**For additional support:**
- Review `docs/ORCHESTRATOR_CONFIG.md` for detailed configuration
- Check `context/gotchas.md` for known issues and workarounds
- Consult `scripts/README.md` for script documentation
