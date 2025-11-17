# User Onboarding System Architecture

**Version:** 1.0
**Created:** 2025-01-27
**Status:** Design Complete

---

## 1. System Overview

The onboarding system provides an interactive, progressive tutorial experience for new users learning the cc-sessions framework, with lightweight introductions to CCPM and ContextKit workflow extensions.

### 1.1 Design Principles

- **Progressive Disclosure**: Start simple, build complexity gradually
- **Hands-On Learning**: Practice commands in safe sandbox environment
- **Contextual Help**: Just-in-time documentation and hints
- **Non-Blocking**: Optional, skippable, resumable
- **State Preservation**: Save progress, allow resumption
- **Framework Integration**: Use existing cc-sessions infrastructure

### 1.2 Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                  User Entry Points                       │
│  (Skill detection, slash command, first-time detection) │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Onboarding Orchestrator                     │
│   (State management, module loading, progress tracking) │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼────┐ ┌────▼─────┐ ┌───▼──────┐
│ cc-sessions│ │   CCPM   │ │CtxKit    │
│  Tutorial  │ │ Tutorial │ │Tutorial  │
│  (Core)    │ │ (Light)  │ │(Light)   │
└───────┬────┘ └────┬─────┘ └───┬──────┘
        │           │           │
┌───────▼───────────▼───────────▼─────────────────────────┐
│            Configuration Wizard                          │
│     (Trigger phrases, git prefs, features, env)         │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Core Components

### 2.1 Onboarding State (`sessions/onboarding-state.json`)

```json
{
  "onboarding_version": "1.0",
  "user_started": "2025-01-27T10:00:00Z",
  "current_module": "cc-sessions-basics",
  "modules_completed": ["welcome"],
  "modules_available": [
    "welcome",
    "cc-sessions-basics",
    "cc-sessions-advanced",
    "pm-workflows",
    "contextkit-intro",
    "unified-workflow",
    "configuration"
  ],
  "progress": {
    "welcome": {"status": "completed", "score": 100},
    "cc-sessions-basics": {"status": "in_progress", "score": 60}
  },
  "configuration_completed": false,
  "skip_requested": false,
  "last_updated": "2025-01-27T10:30:00Z"
}
```

### 2.2 Tutorial Modules

Each module is a self-contained `.md` file in `docs/onboarding/modules/`:

#### Module Structure

```markdown
---
name: cc-sessions-basics
title: "cc-sessions: DAIC Workflow Fundamentals"
duration: 15
prerequisites: ["welcome"]
next_module: cc-sessions-advanced
---

# Module: cc-sessions Basics

## Learning Objectives
- Understand DAIC modes (DISCUSS, ALIGN, IMPLEMENT, CHECK)
- Practice transitioning between modes
- Create your first task manifest
- Execute guided implementation

## Interactive Exercises

### Exercise 1: Understanding DISCUSS Mode
... interactive content with checkpoints ...

### Exercise 2: Transitioning to IMPLEMENT
... guided practice ...

## Knowledge Check
... quiz questions ...

## Summary & Next Steps
```

#### Module Catalog

| Module ID | Title | Duration | Type |
|-----------|-------|----------|------|
| `welcome` | Welcome & Framework Overview | 5 min | Intro |
| `cc-sessions-basics` | DAIC Workflow Fundamentals | 15 min | Core |
| `cc-sessions-advanced` | Tasks, Hooks & State Management | 20 min | Core |
| `pm-workflows` | Project Management Workflows (CCPM) | 10 min | Extension |
| `contextkit-intro` | Planning & Memory (ContextKit) | 10 min | Extension |
| `unified-workflow` | End-to-End Feature Development | 20 min | Integration |
| `configuration` | Framework Configuration Wizard | 15 min | Setup |

**Total Time:** ~95 minutes (core path: ~60 minutes)

### 2.3 Onboarding Skill (`.claude/skills/user-onboarding/`)

**Type:** ANALYSIS-ONLY (guides user, doesn't modify files directly)

**Triggers:**
- First-time user detection (no onboarding state exists)
- Manual invocation: "start onboarding", "tutorial", "learn cc-sessions"
- Slash command: `/onboard`

**Responsibilities:**
- Detect first-time users
- Load/save onboarding state
- Present modules in sequence
- Track progress and completion
- Provide contextual hints

### 2.4 Configuration Wizard

Interactive configuration builder that updates `sessions/sessions-config.json`:

**Sections:**
1. **Trigger Phrases** - Customize DAIC mode transitions
2. **Git Preferences** - Staging, commit style, auto-merge/push
3. **Environment** - OS, shell, developer name
4. **Features** - Branch enforcement, task detection, auto-ultrathink
5. **Tool Blocking** - Extra-safe mode, blocked bash patterns

**Implementation:** Modular prompts with validation and defaults

---

## 3. User Flow

### 3.1 Entry Points

```
First Session
    │
    ├─► No onboarding state exists?
    │       └─► Show welcome banner + start prompt
    │
    ├─► User types "start onboarding" / "tutorial"
    │       └─► Activate onboarding skill
    │
    └─► User types `/onboard`
            └─► Launch slash command
```

### 3.2 Tutorial Navigation

```
Module Start
    │
    ├─► Display learning objectives
    │
    ├─► Present interactive exercises
    │       ├─► Checkpoint 1: Explanation
    │       ├─► Checkpoint 2: Practice (safe sandbox)
    │       └─► Checkpoint 3: Validation
    │
    ├─► Knowledge check (optional quiz)
    │
    ├─► Summary & mark complete
    │
    └─► Navigation options:
            ├─► [Next] → Load next module
            ├─► [Back] → Return to previous
            ├─► [Skip] → Mark current as skipped
            └─► [Quit] → Save state, exit
```

### 3.3 Progress Tracking

- **Auto-save** after each checkpoint completion
- **Resume capability** - Return to last incomplete module
- **Skip tracking** - Record skipped modules, allow revisit
- **Completion metrics** - Track time spent, exercises completed

---

## 4. Module Details

### 4.1 Welcome Module (5 min)

**Content:**
- Framework overview (cc-sessions + extensions)
- DAIC philosophy in 2 minutes
- Navigation instructions
- Set expectations (time commitment, hands-on nature)

**Outcome:** User understands what they'll learn and how to navigate

### 4.2 cc-sessions Basics (15 min)

**Topics:**
1. **DAIC Modes**
   - DISCUSS: Clarify requirements, no writes
   - ALIGN: Design plan, create manifest
   - IMPLEMENT: Execute with write tools
   - CHECK: Verify, test, document

2. **Mode Transitions**
   - Trigger phrases (configurable)
   - Hook system enforcement
   - Write-gating rules

3. **First Task Creation**
   - Task manifest structure
   - YAML frontmatter
   - Todo lists
   - Success criteria

**Hands-On Exercise:**
- Create `onboarding-practice-task.md`
- Transition through DAIC cycle
- Complete simple implementation (edit a test file)
- Verify in CHECK mode

### 4.3 cc-sessions Advanced (20 min)

**Topics:**
1. **State Management**
   - `sessions-state.json` checkpoint system
   - State persistence on mode transitions
   - Resume capabilities

2. **Hook System**
   - Hook types (session_start, user_messages, post_tool_use)
   - Trigger detection
   - Custom hook development (overview)

3. **Task Lifecycle**
   - Task startup protocols
   - Branch management
   - Task completion rituals
   - LCMP updates

4. **Multi-Agent Orchestration** (overview)
   - Task queue system
   - Agent pool management
   - Context gathering vs implementation

**Hands-On Exercise:**
- Review `sessions-state.json` structure
- Examine hook execution logs
- Practice task startup with branch creation

### 4.4 PM Workflows (10 min)

**Topics:**
1. **CCPM Overview**
   - PRD → Epic → Tasks workflow
   - GitHub issue integration
   - Branch management

2. **Key Commands**
   - `/pm:epic-start` - Launch epic work
   - `/pm:issue-start` - Begin issue task
   - `/pm:status` - Check progress

3. **Integration with cc-sessions**
   - PM workflows as task triggers
   - Automatic manifest creation

**Hands-On Exercise:**
- View sample PRD structure
- Understand epic breakdown
- See task auto-generation (demo)

### 4.5 ContextKit Intro (10 min)

**Topics:**
1. **LCMP (Lean Context Master Pattern)**
   - `context/decisions.md` - Architectural decisions
   - `context/insights.md` - Patterns & learnings
   - `context/gotchas.md` - Pitfalls & edge cases

2. **Planning Commands**
   - `/ctxk:plan:quick` - Fast feature planning
   - `/ctxk:plan:1-spec` - Detailed specification
   - `/ctxk:plan:3-steps` - Implementation breakdown

3. **Memory Integration**
   - How LCMP informs future work
   - When to update LCMP files
   - Compaction triggers

**Hands-On Exercise:**
- Read sample LCMP entries
- Understand context preservation

### 4.6 Unified Workflow (20 min)

**End-to-End Feature Development Example:**

```
1. Idea → ContextKit Planning
   └─► /ctxk:plan:quick "Add user authentication"

2. Plan → CCPM Epic
   └─► /pm:prd-new → Create PRD
   └─► /pm:epic-start auth-system

3. Epic → cc-sessions Tasks
   └─► Auto-generated task manifests
   └─► Multi-agent orchestration picks up work

4. Implementation → DAIC Cycle
   └─► DISCUSS requirements
   └─► ALIGN design (update manifest)
   └─► IMPLEMENT with write-gating
   └─► CHECK verification

5. Completion → LCMP Update
   └─► Document decisions
   └─► Capture insights
   └─► Log gotchas
```

**Hands-On Exercise:**
- Walk through simplified feature addition
- See how all three systems coordinate
- Practice handoffs between systems

### 4.7 Configuration Wizard (15 min)

**Interactive Setup:**

1. **Trigger Phrases**
   ```
   What phrase should activate IMPLEMENT mode?
   Current: "yert"
   Options: [Keep default] [Customize]
   ```

2. **Git Preferences**
   ```
   How should git staging work?
   [Ask each time] [Auto-add all changes]

   Commit style?
   [Conventional] [Simple] [Detailed]
   ```

3. **Environment Detection**
   ```
   Detected: macOS + zsh
   Developer name: [Enter your name]
   ```

4. **Feature Toggles**
   ```
   Enable branch enforcement? [Yes] [No]
   Enable task detection? [Yes] [No]
   Enable auto-ultrathink? [Yes] [No]
   ```

**Outcome:** Personalized `sessions-config.json`

---

## 5. Implementation Plan

### 5.1 File Structure

```
docs/onboarding/
├── ARCHITECTURE.md (this file)
├── modules/
│   ├── 01-welcome.md
│   ├── 02-cc-sessions-basics.md
│   ├── 03-cc-sessions-advanced.md
│   ├── 04-pm-workflows.md
│   ├── 05-contextkit-intro.md
│   ├── 06-unified-workflow.md
│   └── 07-configuration.md
├── exercises/
│   ├── sample-task-manifest.md
│   ├── sample-prd.md
│   └── sample-lcmp-entries.md
└── assets/
    └── diagrams/ (optional)

.claude/skills/user-onboarding/
└── SKILL.md (orchestrator skill)

sessions/
└── onboarding-state.json (created on first run)
```

### 5.2 Development Phases

**Phase 1: Core Infrastructure** (Day 1)
- [ ] Create `sessions/onboarding-state.json` schema
- [ ] Implement state load/save functions
- [ ] Build module navigation system
- [ ] Create progress tracking

**Phase 2: Tutorial Modules** (Days 2-3)
- [ ] Write all 7 module markdown files
- [ ] Create exercise files
- [ ] Add interactive checkpoints
- [ ] Implement knowledge checks

**Phase 3: Onboarding Skill** (Day 3)
- [ ] Create `.claude/skills/user-onboarding/SKILL.md`
- [ ] Implement first-time detection
- [ ] Add module loading logic
- [ ] Build navigation commands

**Phase 4: Configuration Wizard** (Day 4)
- [ ] Design interactive prompts
- [ ] Implement validation logic
- [ ] Build config file updates
- [ ] Add preview/confirm flow

**Phase 5: Integration & Testing** (Day 5)
- [ ] Test all module flows
- [ ] Verify state persistence
- [ ] Test skip/resume functionality
- [ ] Validate configuration changes
- [ ] User acceptance testing

### 5.3 Testing Strategy

**Unit Tests:**
- State load/save with various inputs
- Module prerequisite validation
- Progress calculation
- Configuration validation

**Integration Tests:**
- Complete tutorial flow (all modules)
- Skip and resume scenarios
- Configuration wizard end-to-end
- First-time user detection

**User Acceptance:**
- Time 3 users through core path (target: <60 min)
- Gather feedback on clarity
- Validate hands-on exercises work
- Confirm configuration saves correctly

---

## 6. Future Enhancements

### 6.1 Phase 2 Features (Post-MVP)

- **Achievement System** - Badges for completion milestones
- **Quick Reference Card** - Generated after completion
- **Video Walkthroughs** - Optional supplementary content
- **Practice Challenges** - Additional hands-on exercises
- **Team Onboarding** - Multi-user coordination flows

### 6.2 Metrics & Analytics

Track (privacy-respecting):
- Module completion rates
- Time spent per module
- Skip rates (identify problem areas)
- Configuration choices (aggregate trends)
- Help requests during tutorials

### 6.3 Content Updates

- Quarterly review of module content
- Update based on framework changes
- Add new modules for new features
- Improve exercises based on user feedback

---

## 7. Success Metrics

**Completion Metrics:**
- 80%+ users complete core path (modules 1-3)
- 60%+ users complete configuration wizard
- Average completion time <65 minutes

**Engagement Metrics:**
- <20% skip rate for core modules
- >70% accuracy on knowledge checks
- >4/5 satisfaction rating

**Retention Metrics:**
- Users who complete onboarding use framework 3x more
- Lower support questions from onboarded users
- Higher DAIC mode discipline compliance

---

## 8. Open Questions

1. Should configuration be mandatory or optional?
   - **Recommendation:** Optional with smart defaults

2. How to handle framework updates that change tutorial content?
   - **Recommendation:** Version onboarding modules, migrate state

3. Should we support multiple onboarding paths (beginner/advanced)?
   - **Recommendation:** MVP = single path, Phase 2 = role-based paths

4. Integrate with external LMS or keep self-contained?
   - **Recommendation:** Self-contained for simplicity

---

**Next Steps:**
- Review architecture with stakeholders
- Approve module catalog
- Begin Phase 1 implementation
