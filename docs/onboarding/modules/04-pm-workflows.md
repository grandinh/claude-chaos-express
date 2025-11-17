---
name: pm-workflows
title: "Project Management Workflows (CCPM)"
duration: 10
prerequisites: ["cc-sessions-basics"]
next_module: contextkit-intro
---

# Module 4: Project Management Workflows (CCPM)

**Duration:** 10 minutes
**Prerequisites:** cc-sessions basics completed

---

## Learning Objectives

By the end of this module, you will:

✅ Understand CCPM workflow (PRD → Epic → Tasks)
✅ Know available PM trigger phrases
✅ See how PM workflows integrate with cc-sessions
✅ Understand when to use PM vs. manual task creation

---

## Part 1: CCPM Overview (3 minutes)

### What is CCPM?

**CCPM (Claude Code Project Management)** is a lightweight workflow extension that helps organize larger features into structured work streams.

**Purpose:**
- Break down large features into manageable tasks
- Integrate with GitHub issues
- Automate task manifest generation
- Coordinate parallel work streams

**Note:** CCPM is currently a **lightweight extension** with trigger skills. Full PM system implementation is planned for future development.

---

## Part 2: PM Workflow Concepts (4 minutes)

### The Three-Level Hierarchy

```
PRD (Product Requirements Document)
  └── Epic (Feature bundle)
        └── Tasks (Individual work units)
```

#### Level 1: PRD

**What:** High-level product requirements
**Contains:**
- User stories
- Acceptance criteria
- Technical constraints
- Success metrics

**Example:**
```markdown
# PRD: User Authentication System

## User Stories
- As a user, I want to log in securely
- As a user, I want to reset my password
- As an admin, I want to manage user permissions

## Technical Requirements
- Use JWT tokens
- Support OAuth (Google, GitHub)
- Session management
- Rate limiting
```

#### Level 2: Epic

**What:** Collection of related tasks for a feature
**Generated from:** PRD parsing
**Contains:**
- Task list with dependencies
- Timeline estimates
- Success criteria

**Example:**
```
Epic: auth-system
├── Task: jwt-middleware
├── Task: oauth-integration
├── Task: session-management
└── Task: rate-limiting
```

#### Level 3: Tasks

**What:** Individual cc-sessions task manifests
**Generated from:** Epic breakdown
**Same structure as manual tasks:**
```markdown
---
name: jwt-middleware
branch: feature/jwt-middleware
status: pending
priority: high
---

# JWT Middleware

## Success Criteria
...
```

---

## Part 3: PM Trigger Phrases (2 minutes)

### Available PM Workflows

The **pm-workflow-trigger** skill activates on these phrases:

| Phrase Pattern | Triggered Command | Purpose |
|----------------|-------------------|---------|
| "start epic X" | `/pm:epic-start` | Launch epic workflow |
| "start issue #123" | `/pm:issue-start` | Begin GitHub issue work |
| "parse PRD X" | `/pm:prd-parse` | Convert PRD to epic |
| "create PRD" | `/pm:prd-new` | Generate new PRD template |

### Example Usage

**Scenario 1: Start an Epic**
```
You: "start epic auth-system"

AI:
1. Creates git branch: feature/auth-system-epic
2. Generates task manifests from epic definition
3. Sets up parallel work queues
4. Returns: "Epic started. 4 tasks generated."
```

**Scenario 2: Work on GitHub Issue**
```
You: "start issue #456"

AI:
1. Fetches issue details from GitHub
2. Creates task manifest from issue
3. Creates branch: issue/456-description
4. Returns: "Issue task ready. Use 'yert' to begin."
```

**Scenario 3: Parse PRD**
```
You: "parse PRD user-profiles"

AI:
1. Reads PRD file
2. Extracts user stories and requirements
3. Generates epic with task breakdown
4. Creates all task manifests
5. Returns: "Epic generated: 6 tasks created."
```

---

## Part 4: Integration with cc-sessions (1 minute)

### How PM and cc-sessions Work Together

```
PM Layer (CCPM)
    │
    ├─► Generates task manifests
    │
    ▼
cc-sessions Layer
    │
    ├─► DAIC workflow
    ├─► Write-gating
    ├─► State management
    └─► Hook enforcement
```

**Key Point:** PM workflows **create** cc-sessions tasks. Once created, tasks follow normal DAIC discipline.

**Example Flow:**
```
1. You: "parse PRD auth-system"
2. CCPM: Generates 4 task manifests
3. Multi-agent orchestrator: Picks up tasks
4. Agents: Execute using DAIC workflow
5. You: Monitor progress via /pm:status
```

---

## Part 5: When to Use PM Workflows

### Use PM Workflows When...

✅ **Large features** - Breaking down 3+ day work into tasks
✅ **GitHub issues** - Syncing with external issue tracker
✅ **Team coordination** - Multiple developers or agents working in parallel
✅ **Structured planning** - PRD-first approach for product features

### Use Manual Tasks When...

✅ **Small fixes** - 1-2 hour tasks
✅ **Experiments** - Trying out ideas quickly
✅ **Urgent hotfixes** - No time for PRD/epic setup
✅ **Learning** - Practicing DAIC workflow

---

## Part 6: Future PM Capabilities (Roadmap)

**Note:** The following features are planned but not yet implemented:

🔜 **Epic Templates** - Pre-built epic structures for common patterns
🔜 **Dependency Visualization** - Graphical task dependency graphs
🔜 **Burndown Charts** - Progress tracking dashboards
🔜 **Time Estimation** - Automatic task duration estimates
🔜 **Resource Allocation** - Intelligent agent pool balancing

Check `sessions/tasks/` for PM-related enhancement tasks!

---

## Demonstration: PM Workflow Example (Demo Only)

Let's see what a PM workflow looks like (demonstration - don't execute):

### Step 1: Create PRD

**File:** `docs/prds/user-dashboard.md`
```markdown
# PRD: User Dashboard

## User Stories
- As a user, I want to see my profile summary
- As a user, I want to view recent activity
- As a user, I want to customize dashboard widgets

## Technical Requirements
- React components
- GraphQL data fetching
- Responsive design
- Accessibility (WCAG 2.1 AA)
```

### Step 2: Parse PRD to Epic

```
You: "parse PRD user-dashboard"

AI (CCPM):
Epic created: user-dashboard-epic
Generated tasks:
  1. profile-summary-component (2h)
  2. activity-feed-widget (3h)
  3. customizable-widgets (4h)
  4. responsive-layout (2h)
  5. accessibility-audit (1h)
```

### Step 3: Tasks Execute via cc-sessions

```
Multi-agent orchestrator:
  Agent 1 → profile-summary-component (DAIC)
  Agent 2 → activity-feed-widget (DAIC)
  Agent 3 → customizable-widgets (DAIC)

(Tasks follow normal cc-sessions workflow)
```

### Step 4: Monitor Progress

```
You: "/pm:status"

AI:
Epic: user-dashboard-epic
Progress: 2/5 tasks complete
  ✅ profile-summary-component
  ✅ activity-feed-widget
  🔄 customizable-widgets (60% done)
  ⏳ responsive-layout (queued)
  ⏳ accessibility-audit (queued)
```

---

## Key Takeaways

✅ **CCPM = Task Generator** - Creates cc-sessions task manifests from higher-level plans
✅ **PRD → Epic → Tasks** - Three-level hierarchy for organizing work
✅ **Trigger phrases** - "start epic", "parse PRD", "start issue"
✅ **Integration** - PM layer sits above cc-sessions, generates tasks that follow DAIC
✅ **Optional** - Use for large features; manual tasks work fine for small work

### Why Use PM Workflows?

**Without PM:**
```
You manually create 10 task manifests
Each with todos, criteria, frontmatter
Takes 30-45 minutes of planning
```

**With PM:**
```
You write 1 PRD (10 minutes)
CCPM generates all 10 tasks automatically
You review and approve
Start work immediately
```

---

## Module Summary

You've completed PM workflows! You now understand:

✅ CCPM hierarchy (PRD → Epic → Tasks)
✅ PM trigger phrases
✅ How PM integrates with cc-sessions
✅ When to use PM vs. manual tasks

### What's Next

In **Module 5: ContextKit Intro**, you'll learn:
- LCMP (Lean Context Master Pattern)
- Feature planning commands
- Long-term memory system
- When to update context files

**Time Estimate:** 10 minutes

---

## Navigation

**Current Module:** PM Workflows (4/7)
**Progress:** 42% → 56% (after completion)

**Actions:**
- Type `[Next]` to continue to Module 5: ContextKit
- Type `[Back]` to return to previous module
- Type `[Help]` for all navigation commands
- Type `[Quit]` to save progress and exit

---

**Pro Tip:** For your first PM workflow, start with a small PRD (1-3 user stories). Get comfortable with the flow before tackling larger features.

**Module Complete!** 🎉
You understand PM workflows and when to use them.

→ **Type `[Next]` to continue to ContextKit Intro**
