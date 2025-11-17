---
name: welcome
title: "Welcome to cc-sessions Framework"
duration: 5
prerequisites: []
next_module: cc-sessions-basics
---

# Welcome to cc-sessions! 👋

Welcome to the **cc-sessions framework** - a disciplined, AI-assisted development workflow that helps you build software with safety, clarity, and confidence.

## What You'll Learn

This onboarding tutorial will teach you how to:

✅ **Master DAIC workflow** - A four-phase discipline that separates discussion from implementation
✅ **Use cc-sessions tasks** - Structured work units with manifests, todos, and state management
✅ **Leverage hooks & automation** - Framework guardrails that prevent mistakes
✅ **Coordinate with AI agents** - Multi-agent orchestration for parallel work
✅ **Extend with CCPM & ContextKit** - Project management and planning tools

---

## The cc-sessions Philosophy (2 minutes)

### The Problem We're Solving

Traditional AI pair programming has three major risks:

1. **Premature Implementation** - AI jumps straight to code before understanding requirements
2. **Scope Creep** - Work expands beyond agreed boundaries without checkpoints
3. **Lost Context** - Important decisions and insights disappear in chat history

### The cc-sessions Solution

**DAIC Workflow** - Four distinct modes with automatic enforcement:

```
DISCUSS → ALIGN → IMPLEMENT → CHECK
```

- **DISCUSS** - Clarify what needs to be done (write tools **blocked**)
- **ALIGN** - Design how to do it, create a task manifest (write tools **blocked**)
- **IMPLEMENT** - Execute the approved plan (write tools **allowed**)
- **CHECK** - Verify results, update documentation (minimal writes only)

**Key Innovation:** The framework **automatically blocks write tools** outside IMPLEMENT mode using a hook system. This prevents accidental file modifications and enforces deliberate transitions between phases.

---

## Framework Components Overview

### Core System: cc-sessions

**Purpose:** DAIC workflow enforcement, state management, task lifecycle

**Key Files:**
- `sessions/sessions-state.json` - Current mode, task, and progress checkpoint
- `sessions/sessions-config.json` - Your preferences (trigger phrases, git settings, features)
- `sessions/tasks/*.md` - Task manifests with todos and acceptance criteria
- `sessions/hooks/*.js` - Enforcement hooks that run on every action

### Extensions: CCPM & ContextKit

**CCPM (Claude Code Project Management):**
- PRD → Epic → Tasks workflow
- GitHub issue integration
- Automated task generation

**ContextKit:**
- Feature planning commands
- LCMP (Lean Context Master Pattern) - Long-term memory system
- Backlog management

*Note: These extensions are lightweight wrappers around cc-sessions core.*

---

## What to Expect from This Tutorial

### Time Commitment

- **Core Path:** ~60 minutes (modules 1-3: welcome, basics, advanced)
- **Full Path:** ~95 minutes (includes PM, ContextKit, unified workflow, configuration)
- **Flexible:** Save progress anytime, resume later

### Learning Style

This tutorial is **hands-on and interactive**:

- 📖 **Read** concepts and explanations
- 💻 **Practice** commands in a safe sandbox environment
- ✅ **Verify** understanding with checkpoints
- 🎯 **Apply** skills in guided exercises

### Navigation Commands

Throughout this tutorial, you'll use these commands:

- `[Next]` - Continue to next section/module
- `[Back]` - Return to previous section
- `[Skip]` - Skip current module (can revisit later)
- `[Quit]` - Save progress and exit (resume anytime)
- `[Help]` - Show available commands

---

## Prerequisites & Setup

### Required

✅ Claude Code installed and running
✅ This repository cloned locally
✅ Terminal access

### Recommended

📚 Basic git knowledge (branches, commits, staging)
📚 Command line comfort (cd, ls, cat)
📚 Text editor familiarity (for viewing files)

### Optional

🔧 Configure your terminal for best experience:
- Use a terminal with good Unicode support
- Enable color output
- Use a monospace font with ligatures

---

## Learning Objectives

By the end of this onboarding, you will be able to:

1. ✅ **Navigate DAIC modes** - Transition between discussion, alignment, implementation, and checking phases
2. ✅ **Create task manifests** - Structure work with clear todos and success criteria
3. ✅ **Use write-gating** - Understand when write tools are allowed/blocked
4. ✅ **Manage state** - Save progress, resume work, handle interruptions
5. ✅ **Coordinate workflows** - Integrate cc-sessions with PM and planning tools
6. ✅ **Configure preferences** - Customize trigger phrases, git behavior, and features

---

## Your First Checkpoint

Before moving forward, let's verify your environment is ready.

### Exercise: Check Framework Files

Run these commands in your terminal:

```bash
# Navigate to project root (if not already there)
cd /path/to/claude-chaos-express

# Verify key directories exist
ls -la sessions/
ls -la .claude/skills/

# Check current sessions state
cat sessions/sessions-state.json

# Check your configuration
cat sessions/sessions-config.json
```

**What to look for:**
- `sessions/` directory contains `sessions-state.json` and `sessions-config.json`
- `.claude/skills/` directory contains skill folders
- Configuration shows trigger phrases (e.g., "yert" for implementation mode)

### Knowledge Check

Answer these questions (no wrong answers, just checking understanding):

**Q1:** What does DAIC stand for?
**A:** _____________

**Q2:** Which mode allows write tools (Write, Edit, MultiEdit)?
**A:** _____________

**Q3:** What file tracks your current mode and task progress?
**A:** _____________

<details>
<summary>Show Answers</summary>

**A1:** DISCUSS, ALIGN, IMPLEMENT, CHECK
**A2:** IMPLEMENT mode only
**A3:** `sessions/sessions-state.json`

</details>

---

## Ready to Begin?

Great! You're all set to dive into cc-sessions fundamentals.

### What's Next

In the next module (**cc-sessions Basics**), you'll:
- Learn the four DAIC modes in depth
- Practice mode transitions using trigger phrases
- Create your first task manifest
- Execute a simple implementation with write-gating

### Time Estimate

15 minutes for hands-on exercises

---

## Navigation

**Current Module:** Welcome (1/7)
**Progress:** 0% → 14% (after completion)

**Actions:**
- Type `[Next]` to begin Module 2: cc-sessions Basics
- Type `[Help]` for navigation commands
- Type `[Quit]` to save progress and exit

---

**Pro Tip:** Take notes as you go! Create a `scratch/onboarding-notes.md` file to jot down insights, customizations you want to make, and questions to explore later.

**Module Complete!** 🎉
You now understand the framework philosophy and what you'll learn. Ready to get hands-on?

→ **Type `[Next]` to continue to cc-sessions Basics**
