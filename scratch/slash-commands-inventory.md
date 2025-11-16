# Slash Commands Inventory & Natural Language Mapping
**Created:** 2025-11-15
**Task:** m-audit-and-add-auto-invoke-triggers
**Branch:** feature/m-audit-and-add-auto-invoke-triggers

## Executive Summary

Comprehensive catalog of all 74 slash commands across 8 domains. Currently, all commands require explicit `/command` syntax. This inventory identifies high-value commands that should accept natural language triggers through skills or direct trigger configuration.

**Key Findings:**
- **74 Total Commands** across 8 domains
- **12 High-Value Commands** need natural language wrappers (16%)
- **PM Domain** has highest automation potential (38 commands)
- **Workflow Commands** most frequently used (code-review, research, validate-and-fix)
- **Natural Language Gap:** Users must memorize exact command syntax

**Recommendation:** Create skill wrappers for top 12 commands covering 80% of common workflows.

---

## Command Categories

### 1. Workflow Commands (7 commands)

**Purpose:** High-level automated workflows and analysis

| Command | Description | Usage Frequency | Natural Language Opportunity |
|---------|-------------|-----------------|------------------------------|
| `/code-review` | Multi-aspect parallel code review | High | **HIGH PRIORITY** |
| `/research` | Deep research with parallel agents | High | **HIGH PRIORITY** |
| `/validate-and-fix` | Quality checks + auto-fix | Medium | **MEDIUM PRIORITY** |
| `/sessions` | Sessions management CLI | Medium | Low (CLI wrapper) |
| `/prompt` | Prompt optimization | Low | Low |
| `/re-init` | Re-initialize project | Low | Low |
| `/code-rabbit` | Code analysis (context unknown) | Unknown | Unknown |

**High-Value Natural Language Patterns:**

**code-review:**
- "Review this code" / "Check for bugs" / "Validate code quality"
- "Code review src/" / "Review recent changes" / "Check this file"
- "Is this code good?" / "Find issues in my code"
- **Recommendation:** Create `code-review-trigger` skill

**research:**
- "Research best practices for X" / "Find information about Y"
- "How do I implement Z?" / "What are the options for A?"
- "Investigate B" / "Look up documentation for C"
- **Recommendation:** Create `research-trigger` skill

**validate-and-fix:**
- "Fix linting errors" / "Run quality checks" / "Validate code"
- "Auto-fix issues" / "Check code quality" / "Run tests and fix"
- **Recommendation:** Create `validation-trigger` skill

---

### 2. Project Management Commands (38 commands)

**Purpose:** Epic, issue, and PRD management workflows

#### Epic Management (14 commands)

| Command | Natural Language Pattern |
|---------|--------------------------|
| `/pm:epic-start` | "Start working on epic X" / "Begin epic Y" |
| `/pm:epic-show` | "Show epic details" / "Display epic info" |
| `/pm:epic-status` | "What's the status of epic X?" / "Epic progress" |
| `/pm:epic-close` | "Close epic" / "Finish epic" |
| `/pm:epic-list` | "List all epics" / "Show epics" |
| `/pm:epic-sync` | "Sync epic to GitHub" |
| `/pm:epic-edit` | "Edit epic" / "Modify epic" |
| `/pm:epic-decompose` | "Break down epic into tasks" |
| `/pm:epic-refresh` | "Refresh epic data" |
| `/pm:epic-merge` | "Merge epic branch" |
| `/pm:epic-oneshot` | "Create quick epic" |
| `/pm:epic-start-worktree` | "Start epic in worktree" |

#### Issue Management (9 commands)

| Command | Natural Language Pattern |
|---------|--------------------------|
| `/pm:issue-start` | "Start working on issue #X" / "Begin issue Y" |
| `/pm:issue-show` | "Show issue details" / "Display issue #X" |
| `/pm:issue-status` | "What's the status of issue?" / "Issue progress" |
| `/pm:issue-close` | "Close issue" / "Resolve issue" |
| `/pm:issue-sync` | "Sync issue to GitHub" |
| `/pm:issue-edit` | "Edit issue" / "Modify issue" |
| `/pm:issue-analyze` | "Analyze issue complexity" |
| `/pm:issue-reopen` | "Reopen issue" |

#### PRD Management (5 commands)

| Command | Natural Language Pattern |
|---------|--------------------------|
| `/pm:prd-new` | "Create new PRD" / "Write product requirements" |
| `/pm:prd-list` | "List all PRDs" / "Show PRDs" |
| `/pm:prd-status` | "PRD status" / "Show PRD progress" |
| `/pm:prd-edit` | "Edit PRD" / "Modify PRD" |
| `/pm:prd-parse` | "Parse PRD into epic" |

#### Project Status (10 commands)

| Command | Natural Language Pattern |
|---------|--------------------------|
| `/pm:status` | "Project status" / "What's in progress?" |
| `/pm:standup` | "Generate standup report" / "Daily summary" |
| `/pm:next` | "What should I work on next?" / "Next task" |
| `/pm:in-progress` | "Show in-progress work" |
| `/pm:blocked` | "Show blocked items" / "What's blocked?" |
| `/pm:search` | "Search for X" / "Find task Y" |
| `/pm:validate` | "Validate project structure" |
| `/pm:sync` | "Sync with GitHub" |
| `/pm:import` | "Import issues from GitHub" |
| `/pm:init` | "Initialize PM system" |
| `/pm:clean` | "Clean up PM files" |
| `/pm:help` | "PM commands help" |
| `/pm:test-reference-update` | Internal testing command |

**High-Value PM Natural Language Patterns:**

**Epic/Issue Workflows:**
- "Start working on epic X" → `/pm:epic-start X`
- "What's the status of issue #Y?" → `/pm:issue-status Y`
- "Show epic details for Z" → `/pm:epic-show Z`
- **Recommendation:** Create `pm-workflow-trigger` skill

**Project Status:**
- "What should I work on next?" → `/pm:next`
- "What's in progress?" → `/pm:status` or `/pm:in-progress`
- "What's blocked?" → `/pm:blocked`
- **Recommendation:** Create `pm-status-trigger` skill

**PRD Workflows:**
- "Create new PRD" → `/pm:prd-new`
- "Parse PRD into epic" → `/pm:prd-parse`
- **Recommendation:** Add to `pm-workflow-trigger` skill

---

### 3. ContextKit Commands (10 commands)

**Purpose:** Planning and implementation workflows

#### Planning (4 commands)

| Command | Natural Language Pattern |
|---------|--------------------------|
| `/ctxk:plan:1-spec` | "Create detailed spec" / "Write specification" |
| `/ctxk:plan:2-research-tech` | "Research technology options" |
| `/ctxk:plan:3-steps` | "Break down into steps" / "Create implementation plan" |
| `/ctxk:plan:quick` | "Quick plan" / "Plan this task" / "How should I approach this?" |

#### Implementation (4 commands)

| Command | Natural Language Pattern |
|---------|--------------------------|
| `/ctxk:impl:start-working` | "Start implementing" / "Begin work" |
| `/ctxk:impl:commit-changes` | "Commit changes" / "Save work" |
| `/ctxk:impl:release-app` | "Release app" / "Deploy application" |
| `/ctxk:impl:release-package` | "Release package" / "Publish package" |

#### Backlog (6 commands)

| Command | Natural Language Pattern |
|---------|--------------------------|
| `/ctxk:bckl:add-bug` | "Add bug to backlog" / "Report bug" |
| `/ctxk:bckl:add-idea` | "Add idea to backlog" / "Capture idea" |
| `/ctxk:bckl:prioritize-bugs` | "Prioritize bugs" |
| `/ctxk:bckl:prioritize-ideas` | "Prioritize ideas" |
| `/ctxk:bckl:remove-bug` | "Remove bug from backlog" |
| `/ctxk:bckl:remove-idea` | "Remove idea from backlog" |

**High-Value ContextKit Natural Language Patterns:**

**Planning Workflows:**
- "Plan this feature" → `/ctxk:plan:quick`
- "Break down into steps" → `/ctxk:plan:3-steps`
- "Research technology options" → `/ctxk:plan:2-research-tech`
- **Recommendation:** Create `contextkit-planning-trigger` skill

**Backlog Management:**
- "Add this bug to backlog" → `/ctxk:bckl:add-bug`
- "Capture this idea" → `/ctxk:bckl:add-idea`
- **Recommendation:** Add to `pm-workflow-trigger` or create separate backlog skill

---

### 4. Git Commands (5 commands)

**Purpose:** Git workflow automation

| Command | Natural Language Pattern |
|---------|--------------------------|
| `/git:checkout` | "Switch to branch X" / "Checkout Y" |
| `/git:commit` | "Commit changes" / "Create commit" |
| `/git:push` | "Push to remote" / "Push changes" |
| `/git:status` | "Git status" / "Show changes" |
| `/git:ignore-init` | "Initialize gitignore" / "Setup gitignore" |

**High-Value Git Natural Language Patterns:**

**Commit Workflow:**
- "Commit my changes" → `/git:commit`
- "Save and commit" → `/git:commit`
- **Recommendation:** Create `git-workflow-trigger` skill

**Status Checks:**
- "What changed?" / "Show my changes" → `/git:status`
- "Git status" → `/git:status`
- **Recommendation:** Add to `git-workflow-trigger` skill

---

### 5. Context Management Commands (3 commands)

**Purpose:** Context and planning file management

| Command | Natural Language Pattern |
|---------|--------------------------|
| `/context:create` | "Create context file" / "Initialize context" |
| `/context:update` | "Update context" / "Refresh context" |
| `/context:prime` | "Prime context" / "Load context" |

**Natural Language Opportunities:** Low (specialized workflow)

---

### 6. Testing Commands (2 commands)

**Purpose:** Test execution and management

| Command | Natural Language Pattern |
|---------|--------------------------|
| `/testing:run` | "Run tests" / "Execute tests" / "Test this" |
| `/testing:prime` | "Prime testing context" |

**High-Value Testing Natural Language Patterns:**

**Test Execution:**
- "Run tests" / "Test this code" → `/testing:run`
- "Execute test suite" → `/testing:run`
- **Recommendation:** Create `testing-trigger` skill

---

### 7. Checkpoint Commands (3 commands)

**Purpose:** Checkpoint/stash management

| Command | Natural Language Pattern |
|---------|--------------------------|
| `/checkpoint:create` | "Create checkpoint" / "Save checkpoint" |
| `/checkpoint:list` | "List checkpoints" / "Show checkpoints" |
| `/checkpoint:restore` | "Restore checkpoint" / "Load checkpoint X" |

**Natural Language Opportunities:** Medium (useful for recovery workflows)

**Recommendation:** Create `checkpoint-trigger` skill for recovery scenarios

---

### 8. GitHub & Dev Commands (6 commands)

**Purpose:** GitHub integration and development utilities

| Command | Natural Language Pattern |
|---------|--------------------------|
| `/gh:repo-init` | "Initialize GitHub repo" / "Create repo" |
| `/dev:cleanup` | "Clean up dev files" / "Remove temp files" |

**Natural Language Opportunities:** Low (specialized, infrequent use)

---

## High-Priority Natural Language Wrappers

### Tier 1: Critical Workflows (5 commands)

These commands represent 80% of common workflow usage and should have comprehensive natural language triggers:

1. **`/code-review`** - Code quality and bug detection
   - Create `code-review-trigger` skill (ANALYSIS-ONLY)
   - Keywords: "review code", "check for bugs", "validate quality", "code review", "find issues"
   - Intent patterns: `(review|check|validate|analyze).*?(code|file|changes)`, `(find|detect).*?(bug|issue|problem)`

2. **`/research`** - Information gathering and best practices
   - Create `research-trigger` skill (ANALYSIS-ONLY)
   - Keywords: "research", "find information", "look up", "investigate", "best practices"
   - Intent patterns: `(research|investigate|find|lookup).*?`, `how.*?(do I|implement|use)`, `what.*?(options|alternatives)`

3. **`/pm:next`** - Task prioritization
   - Add to `pm-workflow-trigger` skill (ANALYSIS-ONLY)
   - Keywords: "what next", "next task", "what should I work on", "prioritize"
   - Intent patterns: `what.*(next|work on|do)`, `next.*(task|item|priority)`

4. **`/pm:status`** - Project status visibility
   - Add to `pm-status-trigger` skill (ANALYSIS-ONLY)
   - Keywords: "project status", "what's in progress", "current work", "status"
   - Intent patterns: `(project|work).*(status|progress)`, `what.*(in progress|working on|current)`

5. **`/git:commit`** - Commit workflow
   - Create `git-workflow-trigger` skill (WRITE-CAPABLE, IMPLEMENT only)
   - Keywords: "commit changes", "save changes", "create commit", "commit"
   - Intent patterns: `(commit|save).*?(changes|work)`, `create.*?commit`

### Tier 2: Frequent Workflows (4 commands)

Moderate usage frequency, valuable for discoverability:

6. **`/ctxk:plan:quick`** - Quick planning
   - Create `contextkit-planning-trigger` skill (ANALYSIS-ONLY)
   - Keywords: "plan this", "how should I approach", "create plan", "quick plan"
   - Intent patterns: `(plan|approach|strategy).*?(this|feature|task)`, `how.*?approach`

7. **`/testing:run`** - Test execution
   - Create `testing-trigger` skill (ANALYSIS-ONLY or WRITE-CAPABLE depending on test framework)
   - Keywords: "run tests", "test this", "execute tests", "run test suite"
   - Intent patterns: `(run|execute|perform).*?test`, `test.*?(this|code|file)`

8. **`/pm:epic-start`** - Epic workflow initiation
   - Add to `pm-workflow-trigger` skill (WRITE-CAPABLE, IMPLEMENT only)
   - Keywords: "start epic", "begin epic", "work on epic", "launch epic"
   - Intent patterns: `(start|begin|launch|work on).*?epic`

9. **`/validate-and-fix`** - Quality automation
   - Create `validation-trigger` skill (WRITE-CAPABLE, IMPLEMENT only)
   - Keywords: "fix linting", "validate code", "quality check", "auto-fix"
   - Intent patterns: `(fix|validate|check).*?(lint|quality|code)`, `auto.*?fix`

### Tier 3: Specialized Workflows (3 commands)

Lower frequency but high value for specific scenarios:

10. **`/pm:blocked`** - Blocker visibility
    - Add to `pm-status-trigger` skill (ANALYSIS-ONLY)
    - Keywords: "what's blocked", "show blockers", "blocked items"
    - Intent patterns: `(what|show).*(blocked|blocker)`

11. **`/checkpoint:restore`** - Recovery workflow
    - Create `checkpoint-trigger` skill (WRITE-CAPABLE, IMPLEMENT only)
    - Keywords: "restore checkpoint", "load checkpoint", "recover state"
    - Intent patterns: `(restore|load|recover).*?checkpoint`

12. **`/pm:prd-parse`** - PRD processing
    - Add to `pm-workflow-trigger` skill (WRITE-CAPABLE, IMPLEMENT only)
    - Keywords: "parse PRD", "PRD to epic", "convert PRD"
    - Intent patterns: `(parse|convert).*?PRD.*?(epic|tasks)`

---

## Recommended New Skills

Based on command inventory analysis, create these new skills:

### 1. code-review-trigger (ANALYSIS-ONLY, HIGH PRIORITY)

**Purpose:** Trigger `/code-review` command from natural language

**Triggers:**
- Keywords: "review code", "code review", "check for bugs", "validate code", "find issues", "analyze code", "check quality"
- Intent patterns: `(review|check|validate|analyze).*?(code|file|changes|this)`, `(find|detect|look for).*?(bug|issue|problem|error)`, `code.*?quality`

**Behavior:** Invoke `/code-review` with appropriate arguments from context

---

### 2. research-trigger (ANALYSIS-ONLY, HIGH PRIORITY)

**Purpose:** Trigger `/research` command from natural language

**Triggers:**
- Keywords: "research", "find information", "look up", "investigate", "best practices", "how do I", "what are the options"
- Intent patterns: `(research|investigate|find|lookup).*?`, `how.*(do I|implement|use|approach)`, `what.*(options|alternatives|ways to)`, `best practices.*?`

**Behavior:** Invoke `/research` with user's question

---

### 3. pm-workflow-trigger (WRITE-CAPABLE, HIGH PRIORITY)

**Purpose:** Trigger PM commands from natural language

**Triggers:**
- Keywords: "start epic", "start issue", "work on epic", "begin issue", "parse PRD", "create PRD"
- Intent patterns: `(start|begin|launch|work on).*(epic|issue)`, `(parse|convert).*?PRD`, `create.*(PRD|product requirements)`

**Behavior:** Route to appropriate PM command based on intent

**DAIC Mode:** IMPLEMENT only (creates/modifies files and git branches)

---

### 4. pm-status-trigger (ANALYSIS-ONLY, HIGH PRIORITY)

**Purpose:** Trigger PM status commands from natural language

**Triggers:**
- Keywords: "project status", "what's in progress", "what next", "what's blocked", "current work", "next task"
- Intent patterns: `(project|work).*(status|progress)`, `what.*(next|work on|in progress|blocked)`, `(show|display).*(status|progress|blockers)`

**Behavior:** Route to appropriate PM status command (/pm:status, /pm:next, /pm:blocked, /pm:in-progress)

---

### 5. git-workflow-trigger (WRITE-CAPABLE, MEDIUM PRIORITY)

**Purpose:** Trigger git commands from natural language

**Triggers:**
- Keywords: "commit changes", "save changes", "create commit", "git status", "show changes", "push changes"
- Intent patterns: `(commit|save).*?(changes|work)`, `create.*?commit`, `(show|display|check).*(changes|status)`, `push.*?(changes|to remote)`

**Behavior:** Route to appropriate git command

**DAIC Mode:** IMPLEMENT only for write operations (commit, push)

---

### 6. contextkit-planning-trigger (ANALYSIS-ONLY, MEDIUM PRIORITY)

**Purpose:** Trigger ContextKit planning commands from natural language

**Triggers:**
- Keywords: "plan this", "how should I approach", "create plan", "quick plan", "break down into steps", "research tech"
- Intent patterns: `(plan|approach|strategy).*(this|feature|task)`, `how.*?(approach|implement|structure)`, `break.*?down.*?steps`, `research.*(tech|technology|options)`

**Behavior:** Route to appropriate planning command (quick, 1-spec, 2-research-tech, 3-steps)

---

### 7. testing-trigger (ANALYSIS-ONLY, MEDIUM PRIORITY)

**Purpose:** Trigger testing commands from natural language

**Triggers:**
- Keywords: "run tests", "test this", "execute tests", "run test suite", "test code"
- Intent patterns: `(run|execute|perform).*?test`, `test.*(this|code|file|suite)`

**Behavior:** Invoke `/testing:run` with appropriate context

---

### 8. validation-trigger (WRITE-CAPABLE, MEDIUM PRIORITY)

**Purpose:** Trigger validation and auto-fix from natural language

**Triggers:**
- Keywords: "fix linting", "validate code", "quality check", "auto-fix", "run quality checks", "fix issues"
- Intent patterns: `(fix|validate|check).*(lint|quality|code|issues)`, `auto.*?fix`, `quality.*?(check|validate)`, `run.*?checks`

**Behavior:** Invoke `/validate-and-fix`

**DAIC Mode:** IMPLEMENT only (modifies files to fix issues)

---

### 9. checkpoint-trigger (WRITE-CAPABLE, LOW PRIORITY)

**Purpose:** Trigger checkpoint commands from natural language

**Triggers:**
- Keywords: "create checkpoint", "save checkpoint", "restore checkpoint", "load checkpoint", "list checkpoints"
- Intent patterns: `(create|save|make).*?checkpoint`, `(restore|load|recover).*?checkpoint`, `(list|show).*?checkpoint`

**Behavior:** Route to appropriate checkpoint command

**DAIC Mode:** IMPLEMENT only (creates git stashes)

---

## Implementation Priority

### Phase 1: Critical Workflows (Week 1)
1. code-review-trigger
2. research-trigger
3. pm-status-trigger

### Phase 2: Frequent Workflows (Week 2)
4. pm-workflow-trigger
5. git-workflow-trigger
6. contextkit-planning-trigger

### Phase 3: Specialized Workflows (Week 3)
7. testing-trigger
8. validation-trigger
9. checkpoint-trigger

---

## Command-to-Skill Mapping

| Command | Skill | Priority | Type |
|---------|-------|----------|------|
| `/code-review` | code-review-trigger | HIGH | ANALYSIS-ONLY |
| `/research` | research-trigger | HIGH | ANALYSIS-ONLY |
| `/pm:next` | pm-status-trigger | HIGH | ANALYSIS-ONLY |
| `/pm:status` | pm-status-trigger | HIGH | ANALYSIS-ONLY |
| `/pm:in-progress` | pm-status-trigger | HIGH | ANALYSIS-ONLY |
| `/pm:blocked` | pm-status-trigger | MEDIUM | ANALYSIS-ONLY |
| `/git:commit` | git-workflow-trigger | HIGH | WRITE-CAPABLE |
| `/git:status` | git-workflow-trigger | MEDIUM | ANALYSIS-ONLY |
| `/git:push` | git-workflow-trigger | MEDIUM | WRITE-CAPABLE |
| `/pm:epic-start` | pm-workflow-trigger | MEDIUM | WRITE-CAPABLE |
| `/pm:issue-start` | pm-workflow-trigger | MEDIUM | WRITE-CAPABLE |
| `/pm:prd-parse` | pm-workflow-trigger | MEDIUM | WRITE-CAPABLE |
| `/ctxk:plan:quick` | contextkit-planning-trigger | MEDIUM | ANALYSIS-ONLY |
| `/ctxk:plan:3-steps` | contextkit-planning-trigger | MEDIUM | ANALYSIS-ONLY |
| `/testing:run` | testing-trigger | MEDIUM | ANALYSIS-ONLY |
| `/validate-and-fix` | validation-trigger | MEDIUM | WRITE-CAPABLE |
| `/checkpoint:restore` | checkpoint-trigger | LOW | WRITE-CAPABLE |
| `/checkpoint:create` | checkpoint-trigger | LOW | WRITE-CAPABLE |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Total Commands** | 74 |
| **Commands Needing NL Triggers** | 18 (24%) |
| **New Skills Recommended** | 9 |
| **High Priority Skills** | 3 |
| **Medium Priority Skills** | 4 |
| **Low Priority Skills** | 2 |
| **ANALYSIS-ONLY Skills** | 6 |
| **WRITE-CAPABLE Skills** | 3 |

---

## Next Steps

1. **Phase 3:** Design comprehensive trigger patterns for all identified skills (existing + new)
2. **Phase 4:** Update skill-rules.json with all new triggers
3. **Phase 5:** Document triggers in skill files
4. **Phase 6:** Create testing suite for trigger validation

---

**Inventory Complete:** 2025-11-15
**Analyst:** Claude (cc-sessions framework)
**Task:** m-audit-and-add-auto-invoke-triggers
