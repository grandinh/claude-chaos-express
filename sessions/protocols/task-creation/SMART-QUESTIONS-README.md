# Smart Contextual Questions System

**Created:** 2025-11-16  
**Status:** Integrated into task-creation protocol

---

## Overview

The Smart Contextual Questions system is integrated into cc-sessions task-creation protocol (step 2) to ensure high-quality task definitions by asking targeted questions that reveal context code analysis cannot provide.

## Problem Solved

When creating tasks, code analysis alone cannot reveal:
- **Business value** - Why this work matters to users/stakeholders
- **Success criteria** - What "done" looks like beyond technical completion
- **Constraints** - Deadlines, risk tolerance, rollback requirements
- **Integration expectations** - How this fits with other systems/teams
- **Future evolution** - What needs to stay flexible vs. locked down

These insights dramatically improve task outcomes by ensuring alignment before implementation begins.

## How It Works

### Intelligence-Driven Questioning (0-3 questions default)

The system analyzes the user's task description and asks **only** questions that add value:

**0 questions when:**
- Success criteria is already clear
- Task is low-risk (docs, tests, minor fixes)
- Constraints and scope boundaries are explicit
- Integration points are obvious

**1-3 questions when:**
- Description lacks clear success criteria
- Risks/constraints not mentioned
- Integration points unclear
- Scope boundaries ambiguous

**4+ questions ONLY for high-risk:**
- Security-sensitive changes
- Data migrations
- Breaking API changes
- Core architectural refactors

### Question Selection Criteria

A question is asked ONLY when ALL of these are true:
1. **Missing** - The information is not in user's description
2. **Valuable** - The answer will improve task outcomes
3. **Non-inferrable** - Code analysis cannot determine this
4. **Actionable** - The answer will change implementation approach

### Available Questions

**Standard (pick max 3):**
1. **Success Clarity**: "What does 'done' look like from a user/stakeholder perspective beyond code working?"
2. **Risk/Constraints**: "Are there deadlines, breaking change concerns, or rollback requirements I should know about?"
3. **Integration**: "What other systems, features, or teams does this interact with?"
4. **Scope Boundaries**: "What should explicitly NOT be included in this work?"
5. **Future Extensibility**: "How might this need to evolve in the next 6-12 months?"

**High-Risk (additional when applicable):**
- Auth/Security: "Who should have access? What permission model applies?"
- Data Migration: "What's the rollback plan if issues occur?"
- Breaking Changes: "What's the deprecation timeline and communication plan?"
- Performance: "What are the performance requirements or SLAs?"

## Integration Points

### Modified Files

**`sessions/protocols/task-creation/task-creation.md`**
- **Step 2**: Ask smart contextual questions (0-3, value-driven)
- **Step 3**: Propose success criteria (incorporating contextual answers)
- **New section**: "Philosophy: Smart Contextual Questions" documentation

### Protocol Flow

```
1. Create task file
2. Ask smart contextual questions ← NEW
   ↓ Analyze description for clarity gaps
   ↓ Select 0-3 targeted questions
   ↓ WAIT for user response
3. Propose success criteria ← ENHANCED
   ↓ Use original description + contextual answers
   ↓ Include business context + technical criteria
4. Run context-gathering agent
5. Update task indexes
6. Commit task file
```

## Benefits

✅ **Respects user's time** - No redundant questions  
✅ **Adds value where code can't** - Business/human context  
✅ **Scales to task complexity** - 0-3 questions for most tasks, 4+ only when critical  
✅ **Prevents ambiguous requirements** - Catches issues before implementation  
✅ **Improves task outcomes** - Better alignment = better results  

## Usage Examples

### Example 1: Clear Description (0 questions)

**User:** "Fix the login button alignment on iPad portrait mode. Should be centered and 44pt tall per iOS HIG. Test on iPad Pro 12.9 and iPad Mini."

**AI:** Asks 0 questions - success criteria already clear, constraints explicit, low risk.

### Example 2: Ambiguous Feature (2 questions)

**User:** "Add dark mode to the settings screen."

**AI:** Asks 2 questions:
1. What does 'done' look like? (unclear if system-wide or just settings)
2. What other systems/features does this interact with? (theme engine? cached preferences?)

### Example 3: High-Risk Migration (5 questions)

**User:** "Migrate user authentication from session tokens to JWT."

**AI:** Asks 5 questions:
1. Are there deadlines or rollback requirements?
2. What other systems/features does this interact with?
3. What should NOT be included?
4. Who should have access to new JWT generation?
5. What's the deprecation timeline for session tokens?

## Future Enhancements

Potential improvements (not yet implemented):

- **Learning system** - Track which questions led to valuable insights
- **Project-specific tuning** - Customize question priorities per repo
- **Integration with context-gathering** - Use answers to guide code analysis
- **Question templates** - Domain-specific question sets (security, performance, etc.)

## Maintenance

**When to update questions:**
- New patterns emerge showing questions that don't add value
- High-value questions consistently missing from the set
- Project-specific needs require customization

**Where to update:**
- `sessions/protocols/task-creation/task-creation.md` - Step 2 question logic
- This README - Documentation and examples

---

**Related Documentation:**
- `sessions/protocols/task-creation/task-creation.md` - Full protocol with integrated questions
- `sessions/CLAUDE.sessions.md` - cc-sessions framework overview
- `CLAUDE.md` - Framework rules and DAIC discipline

