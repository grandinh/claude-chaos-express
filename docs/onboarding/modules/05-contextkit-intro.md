---
name: contextkit-intro
title: "Planning & Memory (ContextKit)"
duration: 10
prerequisites: ["cc-sessions-basics"]
next_module: unified-workflow
---

# Module 5: Planning & Memory (ContextKit)

**Duration:** 10 minutes
**Prerequisites:** cc-sessions basics completed

---

## Learning Objectives

By the end of this module, you will:

✅ Understand LCMP (Lean Context Master Pattern) memory system
✅ Know ContextKit planning commands
✅ Learn when to update context files
✅ See how memory informs future work

---

## Part 1: The Context Problem (2 minutes)

### Why We Need Long-Term Memory

**The Challenge:**
```
Week 1: You implement authentication with JWT
Week 4: You implement file upload
Week 8: New developer asks "Why JWT instead of sessions?"
         → Answer lost in chat history from Week 1
```

**Traditional Solutions:**
- ❌ Search chat transcripts (time-consuming, unreliable)
- ❌ Re-explain decisions (wastes time, incomplete recall)
- ❌ Hope someone remembers (knowledge locked in heads)

**ContextKit Solution: LCMP**
```
Week 1: Decision documented in context/decisions.md
Week 8: New developer reads decisions.md
        → Gets full rationale instantly
```

---

## Part 2: LCMP - Lean Context Master Pattern (4 minutes)

### The Three Context Files

LCMP uses three specialized files in the `context/` directory:

#### 1. decisions.md - Architectural Decisions

**Purpose:** Record **why** you made key technical choices

**When to Update:**
- Chose one technology over another
- Made architectural decision
- Selected a design pattern
- Changed a convention

**Example Entry:**
```markdown
## Decision: Use JWT for Authentication (2025-01-15)

**Context:**
We needed stateless authentication for the REST API to support horizontal scaling.

**Decision:**
Use JWT tokens with 15-minute expiration and refresh token rotation.

**Rationale:**
- Stateless (no session storage needed)
- Scales horizontally
- Industry standard
- Good library support (jsonwebtoken)

**Alternatives Considered:**
- Sessions (requires session store, harder to scale)
- OAuth only (overkill for simple API)

**Tradeoffs:**
- Pro: Stateless, scalable, standard
- Con: Token revocation harder than sessions
- Con: Need refresh token rotation logic

**Outcome:**
Implemented in PR #123. Works well for API endpoints.
```

#### 2. insights.md - Patterns & Learnings

**Purpose:** Capture recurring patterns, techniques, and "how-to" knowledge

**When to Update:**
- Discovered a useful pattern
- Solved a tricky problem
- Learned a framework quirk
- Found a performance optimization

**Example Entry:**
```markdown
## Pattern: Async Validation in cc-sessions Hooks (2025-01-20)

**Problem:**
Hooks run synchronously, but some validations require async operations (API calls, file I/O).

**Solution:**
Use microtask queue deferral pattern:
```javascript
async function validateAsync() {
  const result = await someAsyncCheck();
  return result;
}

// In hook
process.nextTick(async () => {
  await validateAsync();
});
```

**When to Use:**
- File existence checks
- External API validation
- Database lookups in hooks

**Gotcha:**
Don't await in the main hook body - it blocks Claude Code's event loop.
```

#### 3. gotchas.md - Pitfalls & Edge Cases

**Purpose:** Document failure modes, bugs, and things that trip people up

**When to Update:**
- Hit a bug or edge case
- Found confusing behavior
- Discovered a limitation
- Narrowly avoided a mistake

**Example Entry:**
```markdown
## Gotcha: YAML Frontmatter Template Values (2025-01-22)

**Problem:**
TEMPLATE.md contains example YAML frontmatter with placeholder values like:
```yaml
name: [prefix]-[descriptive-name]
```

When agents parse this, YAML parser throws "bad indentation" errors due to unquoted brackets.

**Solution:**
Quote all template values:
```yaml
name: "[prefix]-[descriptive-name]"  # ✅ Correct
```

**Impact:**
Caused agent crashes when processing task templates.

**Prevention:**
Validate YAML frontmatter with `npm run validate-frontmatter` script.

**Fixed in:**
Commit abc123 (2025-01-22)
```

---

## Part 3: ContextKit Planning Commands (3 minutes)

### Available Planning Commands

The **contextkit-planning-trigger** skill activates on these phrases:

| Phrase Pattern | Purpose | Output |
|----------------|---------|--------|
| "plan this feature" | Quick planning | Outline with todos |
| "create detailed spec" | Full specification | Complete spec doc |
| "research tech options" | Technology research | Comparison & recommendation |
| "break down into steps" | Implementation steps | Step-by-step guide |

### Example Usage

**Scenario 1: Quick Feature Planning**
```
You: "plan this feature: user profile editing"

AI (ContextKit):
## Feature: User Profile Editing

### User Story
As a user, I want to edit my profile information.

### Required Components
- Profile form component (React)
- Validation logic
- API endpoint (PATCH /users/:id)
- Database update

### Estimated Todos
1. Create ProfileEditForm component
2. Add form validation
3. Implement PATCH endpoint
4. Write tests
5. Update API docs

Ready to create task manifest? [Yes/No]
```

**Scenario 2: Technology Research**
```
You: "research tech options for real-time updates"

AI (ContextKit):
## Technology Research: Real-Time Updates

### Options Analyzed
1. **WebSockets** (Socket.io)
   - Pros: Bidirectional, real-time, mature
   - Cons: Connection overhead, scaling complexity

2. **Server-Sent Events (SSE)**
   - Pros: Simple, unidirectional works for many cases
   - Cons: HTTP/2 only, one-way only

3. **Long Polling**
   - Pros: Universal compatibility
   - Cons: Higher latency, more requests

### Recommendation
Use WebSockets (Socket.io) for chat features.
Use SSE for notification feeds.

Document this decision? [Yes → decisions.md]
```

---

## Part 4: When to Update LCMP Files (1 minute)

### Update Frequency Guidelines

**decisions.md:**
- ✅ After architectural decisions
- ✅ When choosing between alternatives
- ✅ Technology selection
- ❌ Not for every small code choice

**insights.md:**
- ✅ When you discover a pattern
- ✅ After solving a tricky problem
- ✅ Learning framework quirks
- ❌ Not for trivial "how-to" steps

**gotchas.md:**
- ✅ Every time you hit a bug
- ✅ Edge cases discovered
- ✅ Confusing behavior
- ❌ Not for expected errors

### Compaction Trigger

The framework includes a **manual compaction trigger**:

```
You: "squish"  (context compaction trigger)

AI:
Analyzing recent work for durable information...

Candidates for LCMP:
- JWT auth decision (→ decisions.md)
- Async validation pattern (→ insights.md)
- YAML template bug (→ gotchas.md)

Promote to LCMP? [Yes/No]
```

**Important:** Compaction is **manual only**. Never auto-compacts based on time or heuristics.

---

## Part 5: How Memory Informs Future Work

### The LCMP Feedback Loop

```
┌─────────────────────────────────────────┐
│  Work Session 1: Implement Feature A    │
│  Document decision in decisions.md      │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  Work Session 2: Implement Feature B    │
│  AI reads decisions.md                  │
│  Applies same pattern automatically     │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  Work Session 3: New Developer          │
│  Reads LCMP files                       │
│  Understands project context quickly    │
└─────────────────────────────────────────┘
```

### Example: Memory in Action

**Week 1: Initial Implementation**
```
Task: Add authentication
Decision: JWT with 15-min expiration
Document: decisions.md

[decisions.md]
## JWT Authentication
- Chose JWT for stateless auth
- 15-minute token expiration
- Refresh token rotation
```

**Week 4: Related Feature**
```
Task: Add API rate limiting
AI reads decisions.md
AI suggests: "Use JWT claims to identify users for rate limiting?"
You: "Yes, perfect!"
```

**Week 8: Bug Fix**
```
Task: Debug token expiration issue
AI reads gotchas.md
AI finds: "Known issue: Clock skew causes premature expiration"
AI applies: Known fix immediately
```

---

## Key Takeaways

✅ **LCMP = Long-Term Memory** - Decisions, insights, gotchas preserved
✅ **Three files** - decisions.md, insights.md, gotchas.md
✅ **Manual compaction** - Use "squish" trigger when ready
✅ **Planning commands** - Quick feature planning, tech research
✅ **Feedback loop** - Past decisions inform future work

### Why Use ContextKit?

**Without LCMP:**
```
Every new developer:
- Re-asks same questions
- Re-discovers same solutions
- Re-makes same mistakes
```

**With LCMP:**
```
New developers:
- Read decisions.md → Understand "why"
- Read insights.md → Learn patterns
- Read gotchas.md → Avoid pitfalls
- Productive in hours, not days
```

---

## Module Summary

You've completed ContextKit intro! You now understand:

✅ LCMP memory system (decisions, insights, gotchas)
✅ Planning commands for feature breakdown
✅ When to update context files
✅ How memory informs future work

### What's Next

In **Module 6: Unified Workflow**, you'll see:
- End-to-end feature development
- How all three systems work together
- Complete workflow example
- Handoffs between systems

**Time Estimate:** 20 minutes

---

## Navigation

**Current Module:** ContextKit Intro (5/7)
**Progress:** 56% → 70% (after completion)

**Actions:**
- Type `[Next]` to continue to Module 6: Unified Workflow
- Type `[Back]` to return to previous module
- Type `[Help]` for all navigation commands
- Type `[Quit]` to save progress and exit

---

**Pro Tip:** Review your project's `context/` directory monthly. Remove outdated entries, update decisions that changed, and consolidate similar gotchas.

**Module Complete!** 🎉
You understand LCMP and how to preserve knowledge.

→ **Type `[Next]` to continue to Unified Workflow**
