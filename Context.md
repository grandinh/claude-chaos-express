# claude-chaos-express - Project Context

**Project Type:** JavaScript/Node.js Workflow Tooling
**Purpose:** Workflow management system combining ContextKit, cc-sessions, and CCPM
**Tech Stack:** Node.js (CommonJS), JavaScript, Shell Scripts

---

## Component Overview

This is a single-component project providing comprehensive workflow management for Claude Code development:

- 🔧 **cc-sessions** - DAIC mode system with task management and protocols
- 🔧 **CCPM** - GitHub-integrated project management (epics, PRDs, issues)
- 🔧 **ContextKit** - Systematic development workflow (plan → implement → iterate)

---

## Project Structure

### Sessions Framework (`sessions/`)
Task and workflow management with DAIC mode control.

**Key Directories:**
- `sessions/api/` - Command API (config, protocol, state, task, uninstall)
- `sessions/hooks/` - Lifecycle hooks (session start, post tool use, DAIC enforcement)
- `sessions/protocols/` - Workflow protocols (task creation, startup, completion, compaction)
- `sessions/knowledge/` - Claude Code documentation references
- `sessions/bin/` - CLI executable

**Main Files:**
- `sessions/statusline.js` - Custom statusline for context/usage tracking
- `sessions/sessions-config.json` - Configuration (trigger phrases, git preferences)
- `sessions/sessions-state.json` - Active session state
- `sessions/CLAUDE.sessions.md` - Framework documentation

### Project Management (`.claude/commands/pm/`, `.claude/scripts/pm/`)
CCPM system with 38 slash commands for GitHub-integrated project management.

**Command Categories:**
- Epic management: `/pm:epic-start`, `/pm:epic-status`, `/pm:epic-close`
- PRD management: `/pm:prd-new`, `/pm:prd-list`, `/pm:prd-status`
- Issue management: `/pm:issue-start`, `/pm:issue-show`, `/pm:issue-sync`
- Workflow: `/pm:standup`, `/pm:status`, `/pm:validate`, `/pm:search`

### ContextKit Integration (`.claude/`, `Context/`)
Systematic development workflow templates and automation.

**Workflow Commands:**
- `.claude/commands/ctxk/plan/` - Feature planning workflow (1-spec, 2-research-tech, 3-steps)
- `.claude/commands/ctxk/impl/` - Implementation workflow (start-working, iterate)
- `.claude/commands/ctxk/bckl/` - Backlog management (add-idea, add-bug, evaluate)

**Quality Agents:**
- `.claude/agents/ctxk/` - Specialized agents (build-project, check-accessibility, test-quality, etc.)

**Automation:**
- `Context/Scripts/AutoFormat.sh` - Automatic code formatting (PostToolUse hook)
- `Context/Scripts/VersionStatus.sh` - Version tracking (SessionStart hook)
- `Context/Scripts/CustomStatusline.sh` - 5h usage tracking statusline

**Backlog:**
- `Context/Backlog/Ideas-Inbox.md` - New ideas evaluation
- `Context/Backlog/Ideas-Backlog.md` - Prioritized ideas
- `Context/Backlog/Bugs-Inbox.md` - Bug reports triage
- `Context/Backlog/Bugs-Backlog.md` - Prioritized bugs

---

## Dependencies

### sessions/package.json
```json
{
  "name": "sessions-api",
  "type": "commonjs"
}
```

**No external dependencies** - pure Node.js implementation.

### System Dependencies
- **Node.js** - Runtime for sessions API and hooks
- **GitHub CLI (`gh`)** - Required for CCPM epic/issue management
- **Git** - Version control and worktree operations

---

## Development Commands

### Session Management
```bash
# Sessions CLI
sessions/bin/sessions help       # View all commands
sessions/bin/sessions list       # List active sessions
sessions/bin/sessions create     # Create new session
sessions/bin/sessions status     # Check current status

# Slash Commands
/sessions help                   # Unified sessions management
```

### Project Management (CCPM)
```bash
# Initialize (one-time)
/pm:init                         # Set up GitHub labels and directories

# Daily workflow
/pm:standup                      # Generate standup summary
/pm:status                       # Check project status
/pm:next                         # Show next task
/pm:in-progress                  # List active work

# Epic workflow
/pm:epic-start <name>            # Start new epic
/pm:epic-status <epic-id>        # Check epic status
/pm:epic-show <epic-id>          # View epic details

# PRD workflow
/pm:prd-new <feature>            # Create PRD
/pm:prd-list                     # List all PRDs
/pm:prd-status <prd-id>          # Check PRD status

# Issue workflow
/pm:issue-start <issue-number>   # Start working on issue
/pm:issue-sync                   # Sync with GitHub
/pm:issue-close <issue-number>   # Close completed issue
```

### ContextKit Workflow
```bash
# Feature planning
/ctxk:plan:1-spec                # Define feature specification
/ctxk:plan:2-research-tech       # Research technologies
/ctxk:plan:3-steps               # Break down implementation steps

# Implementation
/ctxk:impl:start-working         # Begin implementation (on feature branch)

# Backlog
/ctxk:bckl:add-idea              # Add new idea
/ctxk:bckl:add-bug               # Report bug
/ctxk:bckl:evaluate              # Evaluate backlog items
```

---

## Code Style

**JavaScript:**
- CommonJS modules (`type: "commonjs"`)
- Node.js built-in modules only
- Shell script integration for system operations

**Shell Scripts:**
- Bash for CLI tools and automation
- Executable permissions: `chmod +x *.sh`

**Configuration:**
- JSON for settings and state
- Markdown for documentation and protocols

---

## DAIC Mode System

**Two modes control tool access:**

### Discussion Mode (default)
- Edit/Write tools blocked
- Focus on planning and alignment
- Trigger: `SILENCE` or auto-return after task completion

### Implementation Mode
- Full tool access
- Execute approved todos only
- Trigger: `yert`

**Other Triggers:**
- `mek:` - Create new task
- `start^` - Start task workflow
- `finito` - Complete task
- `squish` - Context compaction

---

## Workflow Integration

### cc-sessions Hooks
- **UserPromptSubmit**: Process user messages
- **PreToolUse**: Subagent coordination, DAIC enforcement
- **PostToolUse**: Post-execution state updates
- **SessionStart**: Initialize session state

### ContextKit Hooks
- **PostToolUse** (Edit/Write/MultiEdit): Auto-format code
- **SessionStart**: Display version status

### Statusline
- **Provider**: `sessions/statusline.js`
- **Features**: Context usage tracking, session indicators

---

## Git Workflow

**Branch Strategy:**
- `main` - Production-ready code
- Feature branches for epics (`epic/feature-name`)
- Git worktrees for parallel sessions

**Commit Style:**
- Configured in `sessions/sessions-config.json`
- Options: conventional, detailed, simple
- Auto-merge and auto-push available

---

## Configuration Files

- `.claude/settings.json` - Tool permissions, hooks, statusline
- `.claude/ccpm.config` - CCPM configuration
- `sessions/sessions-config.json` - Trigger phrases, git preferences
- `sessions/sessions-state.json` - Active session tracking

---

## Next Steps

1. **Set up first epic**: `/pm:epic-start <feature-name>`
2. **Create PRD**: `/pm:prd-new <feature-name>`
3. **Plan feature**: `/ctxk:plan:1-spec`
4. **Start implementation**: `/ctxk:impl:start-working` (on feature branch)

**Documentation:**
- cc-sessions: `@sessions/CLAUDE.sessions.md`
- ContextKit workflows: Commands in `.claude/commands/ctxk/`
- CCPM commands: `/pm:help`

---

**Last Updated:** 2025-11-15
**ContextKit Version:** 0.2.0
**Template Version:** Custom (claude-chaos-express)
