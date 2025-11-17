# Claude-Cursor Alignment Maintenance Guide

**Purpose:** Comprehensive guide for maintaining alignment between Claude Code and Cursor Agent systems.

**Created:** 2025-01-20
**Last Updated:** 2025-01-20
**Task:** h-align-claude-cursor-systems

---

## Overview

This guide ensures Claude Code and Cursor Agent systems stay synchronized as the framework evolves. It consolidates:

- Change propagation rules
- Maintenance procedures
- Alignment validation
- Drift detection
- Agent synchronization

**Key Principle:** When a change is made to the Claude system-wide framework, it should also apply to Cursor (where applicable, respecting Cursor's scope as editor/integrator).

---

## Change Propagation Matrix

### Type 1: Shared SoT Changes

**When:** Modifying files referenced by BOTH systems

**Files Affected:**
- `CLAUDE.md` (Claude reads, Cursor reads for context)
- `claude-reference.md` (Claude reads, Cursor reads for context)
- LCMP files: `context/decisions.md`, `context/insights.md`, `context/gotchas.md`
- `docs/agent_bridge_protocol.md`
- `docs/tiers_of_context.md`
- `docs/ai_handoffs.md`

**Action Required:**
- [ ] Make change to the file
- [ ] Verify path references remain consistent
- [ ] Check if Cursor rule needs awareness of change
- [ ] If behavior changes affect coordination, update Cursor rule
- [ ] Document change in `context/decisions.md`
- [ ] Run drift detection to verify alignment

**Example:** Adding new LCMP file `context/metrics.md`
- Add reference in CLAUDE.md
- Add reference in Cursor rule
- Update `docs/sot-reference-map.md`
- Both systems now aware of new SoT file

---

### Type 2: Framework Rule Changes

**When:** Modifying Claude framework rules (DAIC, write-gating, hooks, etc.)

**Files Affected:**
- `CLAUDE.md` Section 2 (SoT Tiers), Section 3 (Write Gating), Section 4 (Skills), Section 6 (cc-sessions)
- `claude-reference.md` protocols and examples
- `.claude/skills/`, `.claude/commands/`, `.claude/hooks/`

**Action Required:**
- [ ] Make change to Claude framework file
- [ ] Assess if change affects Cursor coordination
- [ ] If YES: Update Cursor rule Section 4 (Collaboration & Handoff) or Section 7 (Claude-Owned Docs)
- [ ] If NO: Cursor rule stays as-is (Claude-only change)
- [ ] Document change in `context/decisions.md` with propagation decision
- [ ] Update framework health checks if needed

**Example 1 (Propagate):** New handoff log field required
- Update `docs/agent_bridge_protocol.md` with new field
- Update CLAUDE.md to reference new field
- Update Cursor rule to document new field requirement
- Update handoff log schema validation

**Example 2 (Don't Propagate):** New cc-sessions DAIC sub-phase
- Update CLAUDE.md with new sub-phase
- Update `claude-reference.md` with examples
- Cursor rule unchanged (cc-sessions is Claude-only)
- Document in `context/decisions.md` as Claude-only change

---

### Type 3: Agent Changes

**When:** Adding, modifying, or removing agents

#### 3a. Adding New Claude Agent

**Action Required:**
- [ ] Create agent file in `.claude/agents/[category]/[agent-name].md`
- [ ] Add YAML frontmatter (name, description, tools, model)
- [ ] Update `docs/agent-system-audit.md` with agent details
- [ ] Evaluate automation potential for Cloud Agent equivalent
- [ ] If automation candidate: Update `docs/claude-cursor-agent-alignment.md`
- [ ] Document decision in `context/decisions.md`

**Cursor Awareness:** Cursor doesn't need to know about Claude agent additions unless they change coordination patterns.

#### 3b. Creating Cursor Cloud Agent

**Action Required:**
- [ ] Document purpose in GitHub Issue or task manifest
- [ ] Reference Claude equivalent (if exists)
- [ ] Define trigger (scheduled, webhook, manual)
- [ ] Launch via API with appropriate parameters
- [ ] Track agent ID for monitoring
- [ ] Update `docs/claude-cursor-agent-alignment.md` with use case
- [ ] Log outcomes in PR comments or `docs/ai_handoffs.md`
- [ ] Document learned patterns in `context/insights.md`

**Claude Awareness:** Claude doesn't need explicit awareness of Cloud Agents, but patterns should be documented for future reference.

#### 3c. Agent Synchronization Event

**When:** Claude agent changes in a way that affects potential Cloud Agent equivalent

**Action Required:**
- [ ] Update Claude agent file
- [ ] Check `docs/claude-cursor-agent-alignment.md` for Cloud Agent mapping
- [ ] If Cloud Agent equivalent exists or planned:
  - Update Cloud Agent configuration/documentation
  - Or note that Cloud Agent is now outdated
- [ ] Document synchronization in `context/decisions.md`

---

### Type 4: Logging Standard Changes

**When:** Modifying handoff log schema, Work Log format, or logging requirements

**Files Affected:**
- `docs/agent_bridge_protocol.md`
- `docs/ai_handoffs.md` (schema/template)
- CLAUDE.md (logging references)
- Cursor rule (logging requirements)

**Action Required:**
- [ ] Make change to logging schema/format
- [ ] Update `docs/agent_bridge_protocol.md` with new requirements
- [ ] Update CLAUDE.md if Work Log format changes
- [ ] Update Cursor rule if handoff log requirements change
- [ ] Update example entries in `docs/ai_handoffs.md`
- [ ] Test that both systems can parse new format
- [ ] Document change in `context/decisions.md`

**Critical:** Logging changes affect BOTH systems and must be synchronized.

---

### Type 5: File Path Changes

**When:** Renaming, moving, or reorganizing files

**Action Required:**
- [ ] Plan the change (document in task or Issue)
- [ ] Identify ALL references to file(s):
  - Grep in `CLAUDE.md`
  - Grep in `claude-reference.md`
  - Grep in `.cursor/rules/cursor-agent-operating-spec.mdc`
  - Grep in `CURSOR.md` (legacy)
  - Grep in protocol docs (`docs/agent_bridge_protocol.md`, etc.)
- [ ] Execute rename/move
- [ ] Update ALL references found in step 2
- [ ] Update `docs/sot-reference-map.md`
- [ ] Run drift detection to verify no orphaned references
- [ ] Document change in `context/decisions.md`

**Critical:** Path mismatches break both systems. Must update everywhere.

---

### Type 6: Cursor-Specific Changes

**When:** Modifying Cursor editor settings, rules, or Cursor-only workflows

**Files Affected:**
- `.cursor/rules/*.mdc`
- `.vscode/**`
- `CURSOR.md` (legacy reference)

**Action Required:**
- [ ] Make change to Cursor file
- [ ] No Claude changes needed (Cursor-only)
- [ ] Optional: Document in `context/decisions.md` if significant

**Claude Awareness:** Claude doesn't need awareness unless change affects coordination.

---

### Type 7: Claude-Specific Changes

**When:** Modifying Claude-only internals (cc-sessions, hooks, state management)

**Files Affected:**
- `sessions/sessions-state.json`
- `.claude/hooks/**`
- `.claude/skills/**` (implementation details)
- `claude-reference.md` (Claude-specific protocols)

**Action Required:**
- [ ] Make change to Claude file
- [ ] No Cursor changes needed (Claude-only)
- [ ] Optional: Document in `context/decisions.md` if significant

**Cursor Awareness:** Cursor doesn't need awareness of Claude internals.

---

### Type 8: Protocol Changes

**When:** Modifying cc-sessions protocols (task-completion, task-creation, task-startup, context-compaction, etc.)

**Files Affected:**
- Protocol files in `sessions/protocols/`
- `sessions/protocols/PROTOCOL-VERSIONS.md` (version registry)
- `.cursor/rules/cursor-agent-operating-spec.mdc` (if protocol applies to Cursor)
- `CLAUDE.md` (if protocol is referenced)
- `docs/cc-sessions-protocol-reference.md` (quick reference guide)

**Action Required:**
- [ ] Update protocol file with new version and `last_updated` date in frontmatter
- [ ] Update `sessions/protocols/PROTOCOL-VERSIONS.md` with new version and date
- [ ] Assess if change affects Cursor coordination:
  - Does Cursor reference this protocol in its rules?
  - Does the change affect how Cursor should behave?
  - Does the change affect task completion, creation, or handoff patterns?
- [ ] If YES: Update Cursor rules (`.cursor/rules/cursor-agent-operating-spec.mdc`) with new protocol reference or behavior
- [ ] If protocol is referenced in quick guide: Update `docs/cc-sessions-protocol-reference.md`
- [ ] Run drift detection (`scripts/check-claude-cursor-alignment.sh`) to verify protocol synchronization
- [ ] Document change in `context/decisions.md` with propagation decision

**Example 1 (Propagate to Cursor):** Task completion protocol adds new step
- Update `sessions/protocols/task-completion/task-completion.md` with new version
- Update `sessions/protocols/PROTOCOL-VERSIONS.md`
- Update Cursor rules Section 4.2 to include new step (adapted for Cursor's scope)
- Update `docs/cc-sessions-protocol-reference.md` if needed
- Run drift detection
- Document in `context/decisions.md`

**Example 2 (Claude-only):** Task startup protocol adds internal hook trigger
- Update protocol file with new version
- Update `sessions/protocols/PROTOCOL-VERSIONS.md`
- Cursor rules unchanged (internal mechanism)
- Document in `context/decisions.md` as Claude-only change

**Critical:** Protocol changes are part of the global SOP. Both systems must stay synchronized when protocols affect coordination.

---

## Change Propagation Checklist

Use this checklist for ANY framework change:

### Pre-Change

- [ ] Identify change type (refer to Types 1-7 above)
- [ ] Determine which system(s) are affected
- [ ] Check `docs/sot-reference-map.md` for file references
- [ ] Plan propagation strategy

### During Change

- [ ] Make change to primary file(s)
- [ ] Update all references per propagation matrix
- [ ] Update documentation:
  - `docs/sot-reference-map.md` if file references changed
  - `docs/agent-system-audit.md` if agents changed
  - `docs/claude-cursor-agent-alignment.md` if agent use cases changed
  - `context/decisions.md` with change rationale

### Post-Change

- [ ] Run drift detection (see Section 6)
- [ ] Run framework health checks (CLAUDE.md Section 8)
- [ ] Verify both systems still work correctly
- [ ] Test coordination (handoff, file access, etc.)
- [ ] Document any issues in `context/gotchas.md`

---

## System-Wide Change Template

Use this template when documenting significant framework changes:

```markdown
## [Change Name]

**Date:** YYYY-MM-DD
**Type:** [Shared SoT | Framework Rule | Agent | Logging | Path | Cursor-Only | Claude-Only]
**Task/Issue:** [Reference to task or Issue]

### What Changed

[Description of the change and why it was made]

### Files Modified

**Claude System:**
- [file1] - [what changed]
- [file2] - [what changed]

**Cursor System:**
- [file1] - [what changed]
- [file2] - [what changed]

### Propagation Decision

- [ ] Propagated to both systems
- [ ] Claude-only change
- [ ] Cursor-only change

**Rationale:** [Why this propagation decision was made]

### Verification

- [ ] Drift detection passed
- [ ] Framework health checks passed
- [ ] Both systems tested
- [ ] Documentation updated

### Impact

[What this change means for users, workflows, or future development]
```

Document in `context/decisions.md`.

---

## Maintenance Schedule

### Weekly

- [ ] Review recent changes for propagation needs
- [ ] Quick drift detection scan (paths, schemas)

### Monthly

- [ ] Full drift detection run (all checks)
- [ ] Framework health checks
- [ ] Agent usage review
- [ ] Documentation freshness check

### Quarterly

- [ ] Comprehensive alignment audit
- [ ] Agent system review (add/deprecate candidates)
- [ ] Update alignment documentation
- [ ] Review and refine propagation rules

---

## Drift Detection (Overview)

Detailed drift detection mechanism in separate script. High-level checks:

### File Reference Drift
- [ ] All files referenced in CLAUDE.md exist or are marked optional
- [ ] All files referenced in Cursor rule exist or are marked optional
- [ ] Paths match between systems for shared SoT

### Schema Drift
- [ ] Handoff log schema matches between systems
- [ ] Work Log format is current
- [ ] Agent frontmatter matches expected schema

### Agent Drift
- [ ] All Claude agents documented in audit
- [ ] All automation candidates evaluated
- [ ] No orphaned agent references

### Documentation Drift
- [ ] SoT reference map is current
- [ ] Agent audit is current
- [ ] Alignment guide is current

**Full drift detection mechanism:** See next task (todo 7)

---

## Alignment Health Metrics

Track these metrics to measure alignment health:

1. **Path Consistency:** % of shared file references that match between systems
2. **Schema Consistency:** Handoff log schema matches (boolean)
3. **Agent Documentation:** % of Claude agents documented in audit
4. **Change Propagation Rate:** % of changes that correctly propagated
5. **Drift Detection Frequency:** How often drift detection runs
6. **Time to Fix Drift:** Average time from detection to resolution

**Target:** 100% path consistency, 100% schema consistency, 100% agent documentation, 95%+ propagation rate

---

## Troubleshooting

### Problem: Path mismatch detected

**Symptoms:** File not found, broken @references in Cursor rule

**Solution:**
1. Check `docs/sot-reference-map.md` for canonical path
2. Grep for all references to the file
3. Update all references to match canonical path
4. Re-run drift detection to verify fix

### Problem: Handoff log schema mismatch

**Symptoms:** Parsing errors, missing fields, coordination failures

**Solution:**
1. Check `docs/agent_bridge_protocol.md` for current schema
2. Review recent changes to logging standards
3. Update both CLAUDE.md and Cursor rule to match protocol
4. Test with sample handoff entry
5. Document fix in `context/decisions.md`

### Problem: Agent not documented

**Symptoms:** Agent exists but not in audit, or vice versa

**Solution:**
1. If agent exists but not documented: Update `docs/agent-system-audit.md`
2. If documented but doesn't exist: Remove from audit or create agent
3. Evaluate automation potential if newly documented
4. Update alignment documents if needed

### Problem: Conflicting instructions

**Symptoms:** CLAUDE.md says one thing, Cursor rule says another

**Solution:**
1. Determine which is correct (usually CLAUDE.md takes precedence for framework rules)
2. Update the incorrect reference
3. Document the resolution in `context/decisions.md`
4. Add preventive check to drift detection

---

## Related Documentation

### Core Alignment Docs
- **This file** - Master alignment maintenance guide
- `docs/sot-reference-map.md` - SoT file references
- `docs/agent-system-audit.md` - Complete agent catalog
- `docs/claude-cursor-agent-alignment.md` - Agent alignment strategy

### Framework Specs
- `CLAUDE.md` - Claude Code operator spec
- `claude-reference.md` - Claude Code reference
- `.cursor/rules/cursor-agent-operating-spec.mdc` - Cursor Agent spec (active)
- `CURSOR.md` - Cursor Agent spec (legacy, reference only)

### Protocols
- `docs/agent_bridge_protocol.md` - Inter-agent coordination
- `docs/tiers_of_context.md` - File hierarchy and protection

### Context
- `context/decisions.md` - Framework decisions log
- `context/insights.md` - Patterns and learnings
- `context/gotchas.md` - Pitfalls and prevention

---

## Changelog

### 2025-01-20
- Initial alignment maintenance guide created
- Defined 7 change propagation types with action matrices
- Created change propagation checklist
- Established maintenance schedule (weekly/monthly/quarterly)
- Documented troubleshooting procedures
- Created system-wide change documentation template
