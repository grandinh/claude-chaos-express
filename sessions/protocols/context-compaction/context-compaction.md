---
protocol_version: "1.0"
last_updated: "2025-11-16"
protocol_name: "context-compaction"
---

# Context Compaction Protocol

When context window reaches high capacity, you will be instructed to perform these steps:

```markdown
[STATUS: Context Compaction]
Context window above 85% capacity
Initiating maintenance agents for context preservation...
```

{todos}

## 1. Run Maintenance Agents

Before compacting, delegate to agents:

1. **logging agent** - Update work logs in task file
   ```markdown
   [RUNNING: Logging Agent]
   Consolidating work logs and updating task documentation...
   ```
   - Automatically receives full conversation context
   - Logs work progress and updates task status

   After completion:
   ```markdown
   ✓ Complete
   ```

2. **context-refinement agent** - Check for discoveries/drift
   ```markdown
   [RUNNING: Context-Refinement Agent]
   Checking for new discoveries or context drift...
   ```
   - Reads transcript files automatically
   - Will update context ONLY if changes found
   - Skip if task is complete

   After completion:
   ```markdown
   ✓ Complete - [No updates needed / Context manifest updated]
   ```

3. **service-documentation agent** - Update CLAUDE.md files
   ```markdown
   [RUNNING: Service-Documentation Agent]
   Updating service documentation if needed...
   ```
   - Only if service interfaces changed significantly
   - Include list of modified services

   After completion:
   ```markdown
   ✓ Complete - [No updates needed / Updated X service files]
   ```

4. **LCMP compaction agent** - Promote durable information to LCMP Tier-1 docs
   ```markdown
   [RUNNING: LCMP Compaction Agent]
   Analyzing context for durable information to preserve...
   ```
   - Review recent work context (completed tasks, discussions, learnings)
   - Identify information that:
     - Survived at least one DAIC cycle
     - Affects future work (designs, constraints, tradeoffs)
     - Represents recurring patterns or expensive gotchas
   - Categorize into:
     - **decisions.md** - Architectural decisions, tradeoffs, rationale
     - **insights.md** - Patterns, learnings, best practices discovered
     - **gotchas.md** - Pitfalls, failure modes, edge cases encountered
   - Present recommendations with proposed format/structure
   - Wait for user approval if needed (user already triggered squish, so proceed with compaction)
   - Update LCMP files in IMPLEMENT mode:
     - Add new entries to `context/decisions.md`, `context/insights.md`, `context/gotchas.md`
     - Preserve existing content (additive, not replacement)
     - Maintain chronological order with dates
     - Include context references (task/issue IDs)

   After completion:
   ```markdown
   ✓ Complete - [No durable information found / Added X decisions, Y insights, Z gotchas]
   ```

## 2. Completion Summary

After all agents complete, report status:

```markdown
[COMPLETE: Context Compaction]
✓ Work logs consolidated
✓ Context manifest [updated/current]
✓ Service documentation [updated/current]
✓ LCMP compaction [completed / no durable information found]

Ready to continue with fresh context window.
```

## Notes

### Context Refinement
The context-refinement agent is speculative - it will only update the context manifest if genuine drift or new discoveries occurred. This prevents unnecessary updates while ensuring important findings are captured.

### LCMP Compaction
The LCMP compaction agent promotes durable information to Tier-1 canonical docs (`context/decisions.md`, `context/insights.md`, `context/gotchas.md`). Since the user explicitly triggered compaction with `/squish`, proceed with promoting identified durable information. Only promote information that:
- Has survived at least one DAIC cycle
- Affects future work (designs, constraints, tradeoffs)
- Represents recurring patterns or expensive gotchas

Do NOT promote ephemeral details like specific file paths, temporary workarounds, or one-off debugging steps.
