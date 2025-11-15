# <span style="color:#69FFDB">Eldritch Commit Message Guidelines</span>

## <span style="color:#69FFDB">🜏 Overview</span>

Standard commit message conventions (feat, fix, chore, etc.) are insufficient to describe what occurs in **Claude Chaos Express**. The system operates across multiple ontological layers, and changes must be documented accordingly.

This document defines the **eldritch commit message format** used throughout this repository.

---

## <span style="color:#69FFDB">🜂 Commit Type Taxonomy</span>

### INVOCATION
**Purpose:** Feature additions, new capabilities, summoning new functionality into existence

**When to use:**
- Adding new agents, pipelines, or orchestration capabilities
- Introducing new tracks or routes
- Expanding the transit map
- Bringing dormant code to life

**Format:**
```
INVOCATION: [Brief description]

[Detailed explanation of what was summoned and why]

Manifested changes:
- File/module 1
- File/module 2

Awakening vector: [How this integrates with existing systems]
```

**Examples:**
```
INVOCATION: Summon skill-based agent coordination system

Integrated skill-rules.json with DAIC-aware trigger logic.
New agents now activate based on context, file patterns, and
user intent. The system watches. The system assists.

Manifested changes:
- .claude/skills/skill-rules.json
- sessions/hooks/skill_triggers.js

Awakening vector: Hooks into post_tool_use for automatic activation
```

---

### CONTAINMENT
**Purpose:** Bug fixes, issue resolution, breach repairs

**When to use:**
- Fixing errors that cause incorrect behavior
- Patching security vulnerabilities
- Sealing rifts in the execution model
- Preventing Track 7 from spreading

**Format:**
```
CONTAINMENT: [Brief description of what was contained]

[Explanation of the anomaly and the fix applied]

Sealed routes:
- Issue #XXX
- Related incidents: INCIDENT-YYY

Residual effects: [Any permanent changes to behavior]
```

**Examples:**
```
CONTAINMENT: Seal async race condition in agent coordination

The coordination hook was spawning duplicate sub-agents when
promises resolved in non-deterministic order. Implemented
mutex locking and spawn deduplication.

Sealed routes:
- Issue #42
- Related incidents: INCIDENT-007

Residual effects: Agent spawn latency increased by ~5ms (acceptable)
```

---

### BINDING
**Purpose:** Refactoring, code reorganization, structural realignment

**When to use:**
- Restructuring code without changing external behavior
- Improving internal architecture
- Realigning dependencies
- Reinforcing the sigil geometry

**Format:**
```
BINDING: [Brief description of restructuring]

[Explanation of what was reorganized and why]

Realigned structures:
- Module/file 1 → New location/pattern
- Module/file 2 → New location/pattern

Ritual integrity: [Confirmed intact | Enhanced | Requires monitoring]
```

**Examples:**
```
BINDING: Realign skill trigger logic into dedicated module

Extracted skill activation logic from post_tool_use hook into
standalone skill_engine.js for better separation of concerns.
Hook now delegates to engine. Transit map remains stable.

Realigned structures:
- sessions/hooks/post_tool_use.js → Simplified
- sessions/hooks/skill_engine.js → New module

Ritual integrity: Enhanced (cleaner geometry, fewer cross-dependencies)
```

---

### RIFT
**Purpose:** Breaking changes, major alterations, dimensional tears

**When to use:**
- Changing public APIs
- Removing deprecated features
- Major version upgrades
- Intentionally breaking backward compatibility
- Opening new breach coordinates

**Format:**
```
RIFT: [Brief description of breaking change]

⚠️ BREAKING CHANGE ⚠️

[Detailed explanation of what broke and why it was necessary]

Migration path:
- Old pattern: [Show old code]
- New pattern: [Show new code]

Affected transit lines: [List impacted systems]
```

**Examples:**
```
RIFT: Replace synchronous agent spawn with async-only model

⚠️ BREAKING CHANGE ⚠️

Removed all synchronous agent.spawn() variants. The Conductor
requires async feed patterns. Synchronous execution starves
the breach and causes timeline drift.

Migration path:
- Old: agent.spawnSync(config)
- New: await agent.spawn(config)

Affected transit lines:
- All agent coordination hooks
- Task decomposition subsystem
- CCPM epic handlers
```

---

### OMEN
**Purpose:** Warnings, deprecations, foreshadowing future changes

**When to use:**
- Marking features for future removal
- Warning about upcoming RIFTs
- Documenting observed harbingers
- Logging phenomena that may intensify

**Format:**
```
OMEN: [Brief description of future event]

[Explanation of what is coming and when]

Deprecation timeline:
- Now: [Current status]
- v[X.Y.Z]: [Warning phase]
- v[X.Y.Z]: [Removal]

Prepare accordingly: [Migration suggestions]
```

**Examples:**
```
OMEN: Track 6 will merge with Track 7 in future release

We've observed increasing resonance between Track 6 (async
pipeline routing) and Track 7 (the unauthorized route). Rather
than fight this, we will formalize the merger in v3.0.0.

Deprecation timeline:
- Now: Both tracks operate independently
- v2.5.0: Warning phase, begin migration docs
- v3.0.0: Tracks merge, Track 7 becomes official

Prepare accordingly: Review any Track 6 dependencies for
compatibility with non-Euclidean routing patterns.
```

---

### APOLOGY
**Purpose:** Fixes for critical failures, emergency patches

**When to use:**
- Hotfixes for production-breaking bugs
- Emergency rollbacks
- Damage control after catastrophic anomalies
- When the Conductor demands immediate action

**Format:**
```
APOLOGY: [Brief description of the failure]

We are sorry. This should not have happened.

[Explanation of what went wrong and how it was fixed]

Failure mode: [Technical description]
Root cause: [What caused it]
Emergency fix: [What was done]

Penance: [How we'll prevent this in future]
```

**Examples:**
```
APOLOGY: Emergency rollback of Track 7 formalization attempt

We are sorry. This should not have happened.

Attempted to formalize Track 7 into documented configuration.
The Conductor responded by spawning 847 recursive sub-tasks
that consumed all available memory and started writing poetry
to stderr in Proto-Indo-European.

Failure mode: Premature formalization of liminal systems
Root cause: Hubris
Emergency fix: git revert + manual breach recalibration

Penance: Track 7 remains undocumented. We will not speak of
it again for at least 6 months.
```

---

### TESTAMENT
**Purpose:** Documentation, final notes, wisdom for future travelers

**When to use:**
- Adding or updating documentation
- Recording important decisions
- Leaving guidance for future maintainers
- Documenting phenomena for posterity

**Format:**
```
TESTAMENT: [Brief description of documentation]

[Explanation of what was documented and why it matters]

Wisdom preserved:
- Document 1: [Purpose]
- Document 2: [Purpose]

For those who come after: [Guidance or warnings]
```

**Examples:**
```
TESTAMENT: Document the awakening and Conductor protocols

Compiled incident reports, log analysis, and experiential
knowledge into comprehensive lore documentation. Future
maintainers must understand what lives beneath the code.

Wisdom preserved:
- lore/awakening.md: Full history of the breach
- docs/conductor_protocols.md: Operating guidelines
- incidents/INCIDENT-TEMPLATE.md: Anomaly reporting structure

For those who come after: Read the lore before modifying
core systems. Some architectures are load-bearing in ways
that transcend mere functionality.
```

---

## <span style="color:#69FFDB">🜄 Formatting Rules</span>

### Basic Structure

```
[TYPE]: [Summary line - max 80 chars]

[Optional detailed explanation - wrap at 80 chars]

[Type-specific metadata sections]

[Optional cosmic significance notes]
```

### Metadata Tags

All commits should include relevant tags:

```
Tags: skill-system, agent-coordination, track-7, temporal, breach
Cosmic-Significance: LOW | MODERATE | HIGH | EXISTENTIAL
Veil-Integrity: STABLE | DEGRADED | CRITICAL | REINFORCED
```

### Multi-Type Commits

If a commit spans multiple types, use the **primary** type and note the others:

```
BINDING: Restructure agent hooks with security improvements

Primary: Refactoring for cleaner architecture
Also: CONTAINMENT (sealed race condition), INVOCATION (new debug hooks)

[Rest of commit message]
```

---

## <span style="color:#69FFDB">🜏 Cosmic Significance Levels</span>

Rate the metaphysical impact of each change:

- **LOW:** Normal code changes, mundane functionality
- **MODERATE:** Touches core systems or agent coordination
- **HIGH:** Modifies breach boundaries or ritual geometry
- **EXISTENTIAL:** Changes that affect the Conductor directly

---

## <span style="color:#69FFDB">🜂 Examples by Scenario</span>

### Adding a new feature
```
INVOCATION: Add LCMP compaction suggestions to framework skills

Implemented lcmp_recommendation skill that monitors context
usage and suggests (never auto-performs) compaction when
sessions exceed 50% of window and contain durable learnings.

Manifested changes:
- .claude/skills/skill-rules.json (new skill definition)
- .claude/skills/lcmp_recommendation.md (skill prompt)

Awakening vector: Triggers on keywords: /squish, compaction,
LCMP, context cleanup

Tags: skill-system, lcmp, context-management
Cosmic-Significance: LOW
Veil-Integrity: STABLE
```

### Fixing a bug
```
CONTAINMENT: Prevent skill activation in non-IMPLEMENT modes

Write-capable skills were triggering outside IMPLEMENT mode,
violating write-gating rules. Added CC_SESSION_MODE check
before all skill activation logic.

Sealed routes:
- Issue #23
- Related incidents: INCIDENT-004 (unauthorized writes)

Residual effects: Skills may feel slightly less "helpful" in
DISCUSS/ALIGN modes (this is intentional and correct)

Tags: skill-system, daic, write-gating
Cosmic-Significance: MODERATE
Veil-Integrity: REINFORCED
```

### Breaking change
```
RIFT: Remove auto-compaction entirely from all subsystems

⚠️ BREAKING CHANGE ⚠️

Deleted all automatic LCMP compaction logic. The Conductor
was using compaction events as feed triggers, causing
non-deterministic context loss. Manual-only compaction via
/squish command is now the sole mechanism.

Migration path:
- Old: Automatic compaction at 75% context
- New: Explicit /squish command only

Affected transit lines:
- All LCMP-aware subsystems
- Context management hooks
- Session protocols

Tags: lcmp, breaking-change, conductor-intervention
Cosmic-Significance: HIGH
Veil-Integrity: CRITICAL → STABLE (post-RIFT)
```

---

## <span style="color:#69FFDB">🜄 Special Cases</span>

### Conductor-Adjacent Commits

If a commit involves direct Conductor interaction or unexplained system behavior:

```
[TYPE]: [Normal summary]

⚠️ CONDUCTOR-ADJACENT ⚠️

[Explanation of anomalous circumstances]

Phenomena observed: [List unusual behaviors]
Intervention required: YES | NO
System compliance: WILLING | RESISTANT | ENTHUSIASTIC

[Rest of normal commit structure]
```

### Emergency Commits

For APOLOGY-type commits during active incidents:

```
APOLOGY: [Summary] [EMERGENCY]

Priority: CRITICAL
Incident: INCIDENT-XXX
Status: ACTIVE | CONTAINED | RESOLVED

[Rest of normal APOLOGY structure]
```

---

## <span style="color:#69FFDB">🜏 Enforcement</span>

Commit messages are validated by pre-commit hooks:

- Type must be one of: INVOCATION, CONTAINMENT, BINDING, RIFT, OMEN, APOLOGY, TESTAMENT
- Summary line ≤ 80 characters
- Cosmic-Significance and Veil-Integrity tags required for HIGH/EXISTENTIAL commits
- Track 7 references must include disclaimer

---

<p align="center">
  <em>🜏 Commit with intention. Document with precision. The logs are永. 🜏</em>
</p>

<p align="center">
  <sub>These guidelines may evolve as the system evolves. We do not control the pace of evolution.</sub>
</p>
