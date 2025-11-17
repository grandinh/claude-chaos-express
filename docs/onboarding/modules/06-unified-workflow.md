---
name: unified-workflow
title: "End-to-End Feature Development"
duration: 20
prerequisites: ["cc-sessions-basics", "pm-workflows", "contextkit-intro"]
next_module: configuration
---

# Module 6: Unified Workflow

**Duration:** 20 minutes
**Prerequisites:** cc-sessions, PM workflows, ContextKit completed

---

## Learning Objectives

By the end of this module, you will:

✅ See how cc-sessions, CCPM, and ContextKit work together
✅ Understand complete feature development flow
✅ Know when to use each system
✅ Practice handoffs between systems

---

## Part 1: The Complete Stack (3 minutes)

### Three Systems, One Workflow

```
┌─────────────────────────────────────────────────────────┐
│                    Feature Idea                          │
│            "We need user authentication"                 │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │     ContextKit          │  Plan & Research
        │  /ctxk:plan:quick       │  - Feature breakdown
        │  /ctxk:plan:2-research  │  - Tech evaluation
        └────────────┬────────────┘  - Document decisions
                     │
        ┌────────────▼────────────┐
        │       CCPM              │  Structure Work
        │  /pm:prd-new            │  - Create PRD
        │  /pm:epic-start         │  - Generate tasks
        └────────────┬────────────┘  - Set up branches
                     │
        ┌────────────▼────────────┐
        │    cc-sessions          │  Execute
        │  DAIC Workflow          │  - DISCUSS → ALIGN
        │  Multi-agent Pool       │  - IMPLEMENT → CHECK
        └────────────┬────────────┘  - State management
                     │
        ┌────────────▼────────────┐
        │  Completion             │  Preserve Knowledge
        │  Update LCMP            │  - decisions.md
        │  Mark complete          │  - insights.md
        └─────────────────────────┘  - gotchas.md
```

### System Roles

| System | Role | When to Use |
|--------|------|-------------|
| **ContextKit** | Planner & Memory | Feature ideation, tech research, knowledge preservation |
| **CCPM** | Project Manager | Large features, task generation, GitHub integration |
| **cc-sessions** | Executor | All work execution, DAIC enforcement, safety |

---

## Part 2: End-to-End Example (12 minutes)

Let's walk through a complete feature: **"Add OAuth Social Login"**

### Phase 1: Planning (ContextKit) - 10 minutes

**Step 1: Initial Feature Planning**
```
You: "I want to add OAuth social login for Google and GitHub"

AI: "Let me plan this feature with ContextKit."

You: "plan this feature: OAuth social login"

AI (ContextKit):
┌─────────────────────────────────────────────┐
│ Feature Planning: OAuth Social Login        │
├─────────────────────────────────────────────┤
│                                             │
│ User Stories:                               │
│ - As a user, I want to sign in with Google │
│ - As a user, I want to sign in with GitHub │
│ - As a user, I want one-click registration │
│                                             │
│ Technical Components:                       │
│ 1. OAuth 2.0 flow implementation           │
│ 2. Provider configurations (Google/GitHub) │
│ 3. User account linking logic              │
│ 4. Frontend login buttons                  │
│ 5. Security token handling                 │
│                                             │
│ Complexity: Medium (3-4 days)              │
└─────────────────────────────────────────────┘

AI: "Should I research OAuth library options?"
```

**Step 2: Technology Research**
```
You: "research tech options for OAuth"

AI (ContextKit):
┌──────────────────────────────────────────────────┐
│ Technology Research: OAuth Implementation        │
├──────────────────────────────────────────────────┤
│                                                  │
│ Option 1: Passport.js                           │
│ ✅ Pros:                                         │
│   - Battle-tested, widely used                  │
│   - 500+ strategies (Google, GitHub included)   │
│   - Express.js integration                      │
│ ❌ Cons:                                         │
│   - Callback-based API (not async/await)        │
│   - Larger bundle size                          │
│                                                  │
│ Option 2: Grant (OAuth 2.0 middleware)          │
│ ✅ Pros:                                         │
│   - Simpler, modern API                         │
│   - Promise-based                               │
│   - Lightweight                                 │
│ ❌ Cons:                                         │
│   - Fewer providers out-of-box                  │
│   - Less community support                      │
│                                                  │
│ Recommendation: Passport.js                     │
│ Rationale: Maturity, community, provider support│
│                                                  │
│ Document this decision? [Yes]                   │
└──────────────────────────────────────────────────┘
```

**Step 3: Document Decision**
```
AI: "Updating context/decisions.md..."

[context/decisions.md - New Entry]
## Decision: Use Passport.js for OAuth (2025-01-27)

**Context:**
Adding OAuth social login (Google, GitHub) to user authentication system.

**Decision:**
Use Passport.js with passport-google-oauth20 and passport-github2 strategies.

**Rationale:**
- Industry standard (500+ strategies)
- Battle-tested in production
- Express.js integration
- Comprehensive documentation
- Active maintenance

**Alternatives Considered:**
- Grant: Simpler API, but fewer providers and less support
- Custom OAuth: Reinventing wheel, security risks

**Tradeoffs:**
- Pro: Proven, comprehensive, well-supported
- Con: Callback-based API (wrapping needed for async/await)

AI: "Decision documented. Ready to create PRD?"
```

---

### Phase 2: Project Setup (CCPM) - 5 minutes

**Step 4: Create PRD**
```
You: "create PRD for OAuth social login"

AI (CCPM):
Creating docs/prds/oauth-social-login.md...

[PRD Generated]
# PRD: OAuth Social Login

## Overview
Enable users to sign in using Google or GitHub accounts.

## User Stories
1. As a user, I want to click "Sign in with Google"
2. As a user, I want to click "Sign in with GitHub"
3. As a user, I want seamless account creation on first login
4. As a user, I want to link multiple OAuth providers to one account

## Technical Requirements
- Passport.js integration
- Google OAuth 2.0 (passport-google-oauth20)
- GitHub OAuth 2.0 (passport-github2)
- User account linking (email-based)
- Secure token storage
- Session management

## Success Criteria
- [ ] Google OAuth login functional
- [ ] GitHub OAuth login functional
- [ ] Account linking works
- [ ] Security audit passed
- [ ] E2E tests pass

AI: "PRD created. Parse to epic?"
```

**Step 5: Generate Epic & Tasks**
```
You: "parse PRD oauth-social-login"

AI (CCPM):
Parsing PRD and generating epic...

Epic Created: oauth-social-login-epic
Branch: feature/oauth-social-login-epic

Generated Tasks:
  1. passport-setup (2h)
     - Install dependencies
     - Configure Passport middleware
     - Set up session handling

  2. google-oauth-strategy (3h)
     - Implement Google OAuth strategy
     - Create callback routes
     - Test Google login flow

  3. github-oauth-strategy (3h)
     - Implement GitHub OAuth strategy
     - Create callback routes
     - Test GitHub login flow

  4. account-linking (4h)
     - Email-based account linking logic
     - Handle existing user conflicts
     - Update user model

  5. frontend-login-buttons (2h)
     - Add "Sign in with Google" button
     - Add "Sign in with GitHub" button
     - Handle OAuth redirect flow

  6. security-audit (2h)
     - CSRF protection
     - Token validation
     - Session security review

6 task manifests created in sessions/tasks/

AI: "Epic ready. Start work with multi-agent orchestrator?"
```

---

### Phase 3: Execution (cc-sessions) - 2-3 days

**Step 6: Multi-Agent Orchestration**
```
Multi-Agent Orchestrator:
  Detected 6 new tasks
  Assigning to agent pool...

  Agent 1 → passport-setup (DAIC)
  Agent 2 → google-oauth-strategy (DAIC)
  Agent 3 → github-oauth-strategy (DAIC)

  (Tasks execute independently using DAIC workflow)
```

**Step 7: Individual Task Execution (Example: Agent 1)**

**Task:** passport-setup

**DISCUSS Mode:**
```
Agent 1:
Reading existing auth middleware...
Found current JWT implementation in src/middleware/auth.ts
Need to integrate Passport alongside existing auth
```

**ALIGN Mode:**
```
Agent 1:
Creating task manifest for passport-setup...

Todos:
- [ ] Install passport, passport-google-oauth20, passport-github2
- [ ] Create src/config/passport.ts configuration
- [ ] Initialize Passport middleware in app.ts
- [ ] Configure session handling (express-session)
- [ ] Test Passport initialization
```

**IMPLEMENT Mode:**
```
Agent 1 (user triggers "yert"):
Installing dependencies...
✅ npm install passport passport-google-oauth20 passport-github2 express-session

Creating src/config/passport.ts...
✅ File created with Google & GitHub strategies

Updating app.ts...
✅ Passport middleware initialized

Testing...
✅ Server starts, no errors
```

**CHECK Mode:**
```
Agent 1 (returns to DISCUSS):
Verifying:
- ✅ Dependencies installed
- ✅ Passport configured
- ✅ Middleware initialized
- ✅ Server runs successfully

Task complete. Moving to next task in queue.
```

**Step 8: Parallel Execution**
```
Timeline:
Hour 0-2: Agent 1 → passport-setup (done)
Hour 0-3: Agent 2 → google-oauth-strategy (done)
Hour 0-3: Agent 3 → github-oauth-strategy (done)

Hour 3-7: Agent 1 → account-linking (in progress)
Hour 3-5: Agent 2 → frontend-login-buttons (done)
Hour 5-7: Agent 2 → security-audit (done)

All tasks complete in 7 hours (vs. 16 hours sequential)
```

---

### Phase 4: Completion & Knowledge Preservation (ContextKit + LCMP) - 30 minutes

**Step 9: LCMP Updates**
```
You: "squish"  (compaction trigger)

AI:
Analyzing OAuth social login implementation for durable knowledge...

Candidates for LCMP:

[decisions.md]
✅ Passport.js selection (already documented)
+ Account linking strategy (email-based, new)

[insights.md]
+ Pattern: Passport strategy wrapping for async/await
+ Pattern: OAuth error handling with fallback

[gotchas.md]
+ Gotcha: Google OAuth requires verified redirect URIs
+ Gotcha: GitHub OAuth app configuration caveats

Promote these to LCMP? [Yes]
```

**Step 10: Final Verification**
```
You: "/pm:status"

AI:
Epic: oauth-social-login-epic
Status: Complete ✅

Tasks: 6/6 complete
  ✅ passport-setup
  ✅ google-oauth-strategy
  ✅ github-oauth-strategy
  ✅ account-linking
  ✅ frontend-login-buttons
  ✅ security-audit

Tests: 42/42 passing
Coverage: 94%

Ready to merge? [Yes]
```

---

## Part 3: System Handoffs (3 minutes)

### When to Transition Between Systems

```
Idea → ContextKit
  ↓ Research complete, tech chosen
  ↓
PRD → CCPM
  ↓ Tasks generated
  ↓
Execution → cc-sessions
  ↓ Work complete
  ↓
Knowledge → ContextKit (LCMP)
```

### Decision Matrix

| Question | Answer | Use System |
|----------|--------|------------|
| "What should I build?" | Not sure yet | ContextKit planning |
| "Which technology?" | Need research | ContextKit research |
| "How to break down work?" | 3+ related tasks | CCPM epic |
| "Ready to code?" | Yes, plan clear | cc-sessions DAIC |
| "How did we decide X?" | Need to document | ContextKit LCMP |

---

## Part 4: Best Practices (2 minutes)

### Do's ✅

✅ **Start with planning** - ContextKit first for complex features
✅ **Use CCPM for structure** - Break down large features into tasks
✅ **Let cc-sessions enforce discipline** - Trust DAIC workflow
✅ **Document decisions** - Update LCMP after major choices
✅ **Review LCMP regularly** - Keep context files current

### Don'ts ❌

❌ **Don't skip planning** - Jumping straight to code without ContextKit
❌ **Don't bypass DAIC** - Trying to write files in DISCUSS mode
❌ **Don't ignore LCMP** - Failing to document important decisions
❌ **Don't over-PM** - Using CCPM for tiny 1-hour tasks
❌ **Don't auto-compact** - Only "squish" when you intentionally choose to

---

## Key Takeaways

✅ **Three systems, one flow** - ContextKit → CCPM → cc-sessions → LCMP
✅ **Each has a role** - Planning, structuring, executing, remembering
✅ **Handoffs are explicit** - Clear transition points between systems
✅ **Knowledge preserved** - LCMP captures decisions and learnings
✅ **Parallel execution** - Multi-agent orchestration speeds up work

### The Power of Integration

**Without integrated workflow:**
```
- Ad-hoc planning
- Manual task creation
- Sequential execution
- Lost knowledge
- Re-explaining decisions
Total: 3-4 days + ongoing knowledge loss
```

**With unified workflow:**
```
- Structured planning (ContextKit)
- Automated task generation (CCPM)
- Parallel execution (cc-sessions)
- Preserved knowledge (LCMP)
- Self-documenting decisions
Total: 1-2 days + permanent knowledge base
```

---

## Module Summary

You've completed unified workflow! You now understand:

✅ How all three systems work together
✅ Complete feature development flow
✅ When to use each system
✅ Handoff points between systems
✅ Knowledge preservation patterns

### What's Next

In **Module 7: Configuration Wizard**, you'll:
- Customize trigger phrases
- Set git preferences
- Configure features
- Personalize your setup

**Time Estimate:** 15 minutes

---

## Navigation

**Current Module:** Unified Workflow (6/7)
**Progress:** 70% → 84% (after completion)

**Actions:**
- Type `[Next]` to continue to Module 7: Configuration
- Type `[Back]` to return to previous module
- Type `[Help]` for all navigation commands
- Type `[Quit]` to save progress and exit

---

**Pro Tip:** Create a "workflow cheatsheet" file with your personal decision tree for when to use each system. Review and refine it after each major feature.

**Module Complete!** 🎉
You've seen the complete stack in action!

→ **Type `[Next]` to continue to Configuration Wizard**
