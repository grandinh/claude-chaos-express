---
name: configuration
title: "Framework Configuration Wizard"
duration: 15
prerequisites: ["cc-sessions-basics"]
next_module: null
---

# Module 7: Configuration Wizard

**Duration:** 15 minutes
**Prerequisites:** cc-sessions basics completed

---

## Learning Objectives

By the end of this module, you will:

✅ Customize trigger phrases for DAIC modes
✅ Configure git preferences
✅ Set environment details
✅ Enable/disable framework features
✅ Understand all configuration options

---

## Part 1: Configuration File Overview (2 minutes)

### The Configuration File

All framework settings live in: `sessions/sessions-config.json`

**Structure:**
```json
{
  "trigger_phrases": { ... },      // Mode transition phrases
  "blocked_actions": { ... },      // Write-gating rules
  "git_preferences": { ... },      // Git automation settings
  "environment": { ... },          // OS, shell, developer info
  "features": { ... }              // Feature toggles
}
```

### Default vs. Custom Configuration

**Default Setup** (what you have now):
- Implementation mode: `"yert"`
- Discussion mode: `"SILENCE"`
- Task startup: `"start^"`
- Git: auto-add all, detailed commits, auto-push

**After Configuration** (personalized):
- Your preferred trigger phrases
- Your git workflow preferences
- Your environment detected
- Features you want enabled

---

## Part 2: Trigger Phrases Configuration (4 minutes)

### Current Trigger Phrases

Let's review your current triggers:

```json
"trigger_phrases": {
  "implementation_mode": ["yert"],
  "discussion_mode": ["SILENCE"],
  "task_creation": ["mek:"],
  "task_startup": ["start^"],
  "task_completion": ["finito"],
  "context_compaction": ["squish"]
}
```

### Configuration Options

**Implementation Mode** (enter IMPLEMENT, enable write tools)
- Current: `"yert"`
- Suggestions: `"implement"`, `"go"`, `"execute"`, `"build"`
- Custom: [Your choice]

**Discussion Mode** (return to DISCUSS, block write tools)
- Current: `"SILENCE"`
- Suggestions: `"discuss"`, `"stop"`, `"pause"`, `"review"`
- Custom: [Your choice]

**Task Startup** (activate a task from manifest)
- Current: `"start^"`
- Suggestions: `"begin:"`, `"task:"`, `"@task"`
- Custom: [Your choice]

**Task Completion** (mark task complete, return to DISCUSS)
- Current: `"finito"`
- Suggestions: `"done"`, `"complete"`, `"finish"`, `"ship"`
- Custom: [Your choice]

**Context Compaction** (promote durable info to LCMP)
- Current: `"squish"`
- Suggestions: `"compact"`, `"preserve"`, `"remember"`
- Custom: [Your choice]

### Interactive Configuration

**Question 1: Implementation Mode Trigger**
```
What phrase should activate IMPLEMENT mode?

[1] Keep default: "yert"
[2] Use common: "implement"
[3] Use short: "go"
[4] Custom: [Type your preference]

Your choice: _______
```

**Question 2: Discussion Mode Trigger**
```
What phrase should return to DISCUSS mode?

[1] Keep default: "SILENCE"
[2] Use common: "discuss"
[3] Use short: "stop"
[4] Custom: [Type your preference]

Your choice: _______
```

**Question 3: Other Triggers**
```
Customize other triggers?

[Yes] → Configure all triggers
[No] → Keep remaining defaults

Your choice: _______
```

---

## Part 3: Git Preferences Configuration (4 minutes)

### Git Staging Behavior

**Question: How should files be staged?**

```
When ready to commit, how should git add work?

[1] Ask each time
    - AI will list changed files
    - You choose which to stage
    - More control, slower

[2] Auto-add all changes (current)
    - All modified files staged automatically
    - Faster workflow
    - Less granular control

Your choice: _______
```

**Configuration:**
```json
"git_preferences": {
  "add_pattern": "ask" | "all"
}
```

---

### Commit Message Style

**Question: What commit message style?**

```
How should commit messages be formatted?

[1] Conventional Commits
    Example: "feat: add OAuth login"
    Format: type(scope): description

[2] Simple
    Example: "Add OAuth login"
    Format: Just description

[3] Detailed (current)
    Example: "Add OAuth social login

    - Implement Google OAuth strategy
    - Implement GitHub OAuth strategy
    - Add account linking logic"
    Format: Summary + bullet list

Your choice: _______
```

**Configuration:**
```json
"git_preferences": {
  "commit_style": "conventional" | "simple" | "detailed"
}
```

---

### Git Automation

**Question: Auto-merge and auto-push?**

```
After task completion, should git operations run automatically?

Auto-merge completed task branch to main?
[Yes] [No - manual merge]
Current: Yes

Auto-push commits to remote?
[Yes] [No - manual push]
Current: Yes

Your choices: _______ / _______
```

**Configuration:**
```json
"git_preferences": {
  "auto_merge": true | false,
  "auto_push": true | false
}
```

---

### Git Submodules

**Question: Does repo use git submodules?**

```
Does this repository contain git submodules?

[Yes] → AI will run: git submodule update --init --recursive
[No] → Skip submodule commands

Current: No

Your choice: _______
```

**Configuration:**
```json
"git_preferences": {
  "has_submodules": true | false
}
```

---

## Part 4: Environment Configuration (2 minutes)

### Operating System

**Auto-detected:**
```
Detected OS: macOS

Is this correct?
[Yes] [No - Select manually]

If No, select:
[1] Linux
[2] macOS
[3] Windows
```

### Shell

**Auto-detected:**
```
Detected shell: zsh

Is this correct?
[Yes] [No - Select manually]

If No, select:
[1] bash
[2] zsh
[3] fish
[4] PowerShell (Windows)
[5] cmd (Windows)
```

### Developer Name

**Question: What's your name/alias?**

```
Enter your developer name (for git signatures, logs):

Current: "g"

New name: _______
```

**Configuration:**
```json
"environment": {
  "os": "macos" | "linux" | "windows",
  "shell": "bash" | "zsh" | "fish" | "powershell" | "cmd",
  "developer_name": "[Your Name]"
}
```

---

## Part 5: Feature Toggles (3 minutes)

### Branch Enforcement

**Question: Enforce branch creation for tasks?**

```
Should every task require its own git branch?

[Yes] → AI creates feature branch on task start
        Prevents work on main directly

[No] → Work on current branch
       More flexible, less git overhead

Current: Yes
Recommended: Yes (for multi-task projects)

Your choice: _______
```

---

### Task Detection

**Question: Auto-detect task file creation?**

```
Should the framework watch for new task files and notify?

[Yes] → File watcher monitors sessions/tasks/
        Desktop notifications on new tasks
        Multi-agent orchestrator picks up work

[No] → Manual task startup only

Current: Yes
Recommended: Yes (if using multi-agent orchestration)

Your choice: _______
```

---

### Auto-UltraThink

**Question: Enable automatic deep thinking?**

```
Should AI automatically enter "deep thinking" mode for complex tasks?

[Yes] → AI uses extended reasoning for:
        - Ambiguous requirements
        - Complex technical decisions
        - Error diagnosis

[No] → Standard reasoning only

Current: Yes
Recommended: Yes (higher quality, slightly slower)

Your choice: _______
```

---

### Context Warnings

**Question: When should context window warnings appear?**

```
At what context window usage should you be warned?

Warn at 85% usage? [Yes] [No]
Warn at 90% usage? [Yes] [No]

Current: Both enabled
Recommended: Both enabled (prevents context overflow)

Your choices: _______ / _______
```

---

### Icon Style

**Question: What icon style for UI elements?**

```
How should status icons be displayed?

[1] Emoji → 🚀 ✅ ⚠️ ❌
[2] Nerd Fonts → ✓ ✗ ⚡
[3] ASCII → [OK] [X] [!] [*]

Current: Emoji
Depends on: Terminal font support

Your choice: _______
```

---

## Part 6: Advanced - Tool Blocking (Optional, 1 minute)

### Extra-Safe Mode

**Question: Enable extra-safe mode?**

```
Extra-safe mode adds additional write-tool restrictions:

[Yes] → Even stricter write-gating
        Useful for: Learning, high-risk repos

[No] → Standard write-gating (current)
        Recommended for normal use

Your choice: _______
```

### Custom Bash Blocking

**Question: Block specific bash patterns?**

```
Block certain bash commands even in IMPLEMENT mode?

Example: Block "rm -rf", "dd", etc.

[Yes - Configure patterns]
[No - Allow all bash in IMPLEMENT]

Current: No restrictions
Recommended: No (trust DAIC discipline)

Your choice: _______
```

**Configuration (if Yes):**
```json
"blocked_actions": {
  "extrasafe": true | false,
  "bash_write_patterns": ["rm -rf", "dd", "..."],
  "bash_read_patterns": []
}
```

---

## Part 7: Review & Save (1 minute)

### Configuration Summary

After completing the wizard, review your choices:

```
┌─────────────────────────────────────────────────┐
│         Configuration Summary                    │
├─────────────────────────────────────────────────┤
│                                                 │
│ Trigger Phrases:                                │
│   Implementation: "implement"                   │
│   Discussion: "stop"                            │
│   Task Startup: "start^"                        │
│   Task Complete: "done"                         │
│   Compaction: "squish"                          │
│                                                 │
│ Git Preferences:                                │
│   Staging: Auto-add all                         │
│   Commit Style: Conventional                    │
│   Auto-merge: Yes                               │
│   Auto-push: Yes                                │
│                                                 │
│ Environment:                                    │
│   OS: macOS                                     │
│   Shell: zsh                                    │
│   Developer: Harrison                           │
│                                                 │
│ Features:                                       │
│   Branch Enforcement: ✅ Enabled                │
│   Task Detection: ✅ Enabled                    │
│   Auto-UltraThink: ✅ Enabled                   │
│   Context Warnings: ✅ 85% and 90%              │
│   Icon Style: Emoji                             │
│                                                 │
└─────────────────────────────────────────────────┘

Save this configuration? [Yes] [No - Revise]
```

### Saving Configuration

**What happens on save:**
1. Backs up existing `sessions/sessions-config.json`
2. Writes new configuration
3. Validates JSON structure
4. Confirms save successful
5. Suggests restarting Claude Code (for trigger phrase changes)

---

## Part 8: Testing Your Configuration (Optional)

### Quick Configuration Test

After saving, test your new settings:

**Test 1: Trigger Phrases**
```
You: "[Your implementation trigger]"
AI: "Entering IMPLEMENT mode. Write tools now active."
✅ Trigger phrase works!

You: "[Your discussion trigger]"
AI: "Entering DISCUSS mode. Write tools blocked."
✅ Return trigger works!
```

**Test 2: Git Behavior**
```
Make a small change to a test file
Create a test task
Enter IMPLEMENT mode
Complete todos
AI should: Stage files per your preference
AI should: Format commit per your style
✅ Git preferences work!
```

**Test 3: Features**
```
Create a new task file in sessions/tasks/
If task detection enabled:
  ✅ Desktop notification appears

Try to write in DISCUSS mode:
  ✅ Write blocked (if branch enforcement on)
```

---

## Key Takeaways

✅ **Trigger phrases** - Customize mode transitions to your preference
✅ **Git preferences** - Automate or manual-control git workflow
✅ **Environment** - Detect OS, shell, developer name
✅ **Features** - Enable/disable branch enforcement, task detection, etc.
✅ **Validation** - Test configuration before committing to workflow

### Why Configure?

**Default configuration works**, but personalization:
- Speeds up workflow (fewer keystrokes)
- Matches your git habits
- Adapts to your environment
- Enables features you want

---

## Module Summary

You've completed configuration! You now can:

✅ Customize all trigger phrases
✅ Set git automation preferences
✅ Configure environment detection
✅ Enable/disable framework features
✅ Test and validate configuration

---

## 🎉 Onboarding Complete!

Congratulations! You've completed the cc-sessions framework onboarding.

### What You've Learned

✅ **Module 1: Welcome** - Framework philosophy and DAIC overview
✅ **Module 2: cc-sessions Basics** - Four modes, write-gating, task manifests
✅ **Module 3: cc-sessions Advanced** *(optional)* - State, hooks, lifecycle
✅ **Module 4: PM Workflows** - CCPM epic and task generation
✅ **Module 5: ContextKit** - LCMP memory system, planning commands
✅ **Module 6: Unified Workflow** - Complete feature development flow
✅ **Module 7: Configuration** - Personalize your setup (just completed!)

### Next Steps

**1. Start Your First Real Task**
```
Create a task for something you need to build
Practice DAIC workflow
Use trigger phrases
Build muscle memory
```

**2. Explore Advanced Features**
```
Multi-agent orchestration
Agent registry system
Hook customization
Skill development
```

**3. Share Knowledge**
```
Update LCMP files with your learnings
Share configuration with team
Contribute workflow improvements
```

**4. Get Help**
```
Review CLAUDE.md for framework rules
Check claude-reference.md for examples
Search context/ for decisions and gotchas
Ask in project discussions
```

---

## Quick Reference Card (Save This!)

### DAIC Modes
- **DISCUSS** 💬 - Read, ask, clarify (writes blocked)
- **ALIGN** 📋 - Plan, create manifest (writes blocked except tasks)
- **IMPLEMENT** ⚡ - Execute approved plan (writes allowed)
- **CHECK** ✅ - Verify, test, document (minimal writes)

### Your Trigger Phrases
- Implementation: `_______` (your configured phrase)
- Discussion: `_______` (your configured phrase)
- Task Startup: `_______` (your configured phrase)
- Task Complete: `_______` (your configured phrase)
- Compaction: `_______` (your configured phrase)

### Key Files
- `sessions/sessions-state.json` - Current mode & task
- `sessions/sessions-config.json` - Your preferences
- `sessions/tasks/*.md` - Task manifests
- `context/decisions.md` - Architectural decisions
- `context/insights.md` - Patterns & learnings
- `context/gotchas.md` - Pitfalls & bugs

### Common Commands
- Start task: `[task-startup-trigger] task-name`
- Enter IMPLEMENT: `[implementation-trigger]`
- Return to DISCUSS: `[discussion-trigger]`
- Complete task: `[completion-trigger]`
- Compact context: `[compaction-trigger]`

---

## Navigation

**Current Module:** Configuration Wizard (7/7)
**Progress:** 84% → 100% (COMPLETE!)

**Actions:**
- Type `[Finish]` to exit onboarding
- Type `[Back]` to review any module
- Type `[Help]` for post-onboarding resources

---

**🎓 You're now a cc-sessions framework user!**

Thank you for completing this onboarding. Go build amazing things! 🚀

→ **Type `[Finish]` to exit onboarding and start your first task**
