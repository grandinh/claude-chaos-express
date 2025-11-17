<!-- 5151c256-1aad-47aa-9cf6-6bc5dc1453ae cc24b56e-f61e-4d9d-8b5e-366ca8247d2c -->
# Documentation Consolidation and Alignment Plan

## Phase 1: Foundation Decisions

### 1.1 Resolve Tier Model

- **Decision**: Keep Tier-0 as defined in `docs/tiers_of_context.md` (already established and referenced)
- **Action**: Update `CLAUDE.md` Section 2.1 to include Tier-0, aligning with `docs/tiers_of_context.md`
- **Files**: `CLAUDE.md` (Section 2.1)

### 1.2 Sync CLAUDE.md and claude-reference.md Versions

- **Current state**: 
- `CLAUDE.md`: Framework Version 2.0, Last Updated 2025-11-16
- `claude-reference.md`: Framework Version 2.0, Last Updated 2025-11-15
- **Action**: Update `claude-reference.md` header to match `CLAUDE.md` (2025-11-16)
- **Action**: Ensure "Recent Changes" sections are consistent
- **Action**: Document resolution in `Context/gotchas.md` per REPAIR-framework-sync pattern
- **Files**: `claude-reference.md` (header), `Context/gotchas.md`

## Phase 2: Path and Reference Fixes

### 2.1 Fix Context/ Directory Casing

- **Issue**: Actual directory is `Context/` (capitalized) but docs reference `context/` (lowercase)
- **Action**: Update all references from `context/` to `Context/` in:
- `CLAUDE.md` (12 references: lines 32, 83-85, 151, 297, 334, 529, 541-543, 595)
- `CURSOR.md` (5 references: lines 49, 94, 144, 156, 207)
- `.cursor/rules/cursor-agent-operating-spec.mdc` (5 references: lines 49, 94, 144, 156, 207)
- `docs/sot-reference-map.md` (LCMP file references)
- **Action**: Add note in `docs/tiers_of_context.md` Protection Rules section clarifying canonical casing
- **Files**: `CLAUDE.md`, `CURSOR.md`, `.cursor/rules/cursor-agent-operating-spec.mdc`, `docs/sot-reference-map.md`, `docs/tiers_of_context.md`

### 2.2 Mark Optional Files as Absent/Optional

- **Issue**: Both specs instruct agents to consult files that don't exist (AGENTS.md, METASTRATEGY.md, etc.)
- **Action**: Update `CURSOR.md` and `.cursor/rules/cursor-agent-operating-spec.mdc` Section 2 to label optional files as "absent/optional; consult when present"
- **Action**: Update `CLAUDE.md` Section 2.1 Tier-1 list to note optional status or point to `docs/sot-reference-map.md` for availability
- **Files**: `CURSOR.md` (Section 2), `.cursor/rules/cursor-agent-operating-spec.mdc` (Section 2), `CLAUDE.md` (Section 2.1)

## Phase 3: Harmonize Tier Definitions

### 3.1 Create Unified Tier Definition

- **Action**: Update `docs/tiers_of_context.md` to be the single authoritative source
- **Action**: Update `CLAUDE.md` Section 2.1 to reference `docs/tiers_of_context.md` and align tier definitions
- **Action**: Update `.cursor/rules/cursor-agent-operating-spec.mdc` Section 5 to reference `@docs/tiers_of_context.md` and align
- **Action**: Add concise lookup table to `docs/tiers_of_context.md` showing tier hierarchy and priority order
- **Files**: `docs/tiers_of_context.md`, `CLAUDE.md` (Section 2.1), `.cursor/rules/cursor-agent-operating-spec.mdc` (Section 5)

## Phase 4: Deprecate Duplicate Specs

### 4.1 Trim CURSOR.md to Pointer

- **Issue**: `CURSOR.md` contains full spec despite migration note saying `.cursor/rules/cursor-agent-operating-spec.mdc` is canonical
- **Action**: Replace `CURSOR.md` content (after header) with:
- Short pointer redirecting to `.cursor/rules/cursor-agent-operating-spec.mdc`
- Note canonical source and last-updated date (2025-11-15)
- Optional: One-paragraph quickstart summary
- **Action**: Update `docs/sot-reference-map.md` to reflect CURSOR.md is now a pointer
- **Files**: `CURSOR.md`, `docs/sot-reference-map.md`

### 4.2 Update SoT References

- **Action**: Ensure all SoT references point only to canonical files:
- `docs/tiers_of_context.md` references `.cursor/rules/cursor-agent-operating-spec.mdc` (not CURSOR.md)
- `docs/sot-reference-map.md` updated to reflect CURSOR.md deprecation
- **Files**: `docs/tiers_of_context.md`, `docs/sot-reference-map.md`

## Phase 5: Consolidation

### 5.1 Create Tier-1 Rules Index

- **Action**: Create `docs/ai_rules_index.md` containing:
- Canonical rule locations (CLAUDE.md, claude-reference.md, .cursor/rules/)
- Shared SoT pointers (linking to docs/sot-reference-map.md)
- Per-agent deltas (what's unique to Claude vs Cursor)
- Tier hierarchy quick reference
- **Action**: Trim redundant sections in `CLAUDE.md` and `.cursor/rules/` to reference index for overlapping material
- **Action**: Keep agent-specific content separate but lean
- **Files**: `docs/ai_rules_index.md` (new), `CLAUDE.md`, `.cursor/rules/cursor-agent-operating-spec.mdc`

## Phase 6: Validation

### 6.1 Verify All References

- **Action**: Run grep to verify all `context/` references are updated to `Context/`
- **Action**: Verify version/date headers match between CLAUDE.md and claude-reference.md
- **Action**: Verify all optional file references are marked appropriately
- **Action**: Update `docs/sot-reference-map.md` with any new findings
- **Files**: All modified files, `docs/sot-reference-map.md`

## Success Criteria

- [ ] CLAUDE.md and claude-reference.md have matching version/date headers
- [ ] All `context/` references updated to `Context/` (actual directory name)
- [ ] CURSOR.md is a short pointer to canonical `.cursor/rules/` file
- [ ] Tier definitions harmonized across all docs, referencing `docs/tiers_of_context.md`
- [ ] Optional files (AGENTS.md, etc.) marked as absent/optional in all specs
- [ ] `docs/ai_rules_index.md` created and referenced by both systems
- [ ] `docs/sot-reference-map.md` updated to reflect all changes
- [ ] No duplicate full specs being loaded (context bloat eliminated)

### To-dos

- [ ] Update CLAUDE.md Section 2.1 to include Tier-0, aligning with docs/tiers_of_context.md
- [ ] Sync version/date headers between CLAUDE.md and claude-reference.md, document in Context/gotchas.md
- [ ] Update all context/ references to Context/ in CLAUDE.md, CURSOR.md, .cursor/rules/, and docs/sot-reference-map.md
- [ ] Label AGENTS.md, METASTRATEGY.md, etc. as absent/optional in CURSOR.md, .cursor/rules/, and CLAUDE.md
- [ ] Update CLAUDE.md and .cursor/rules/ to reference docs/tiers_of_context.md as single source, add lookup table
- [ ] Trim CURSOR.md to short pointer redirecting to .cursor/rules/cursor-agent-operating-spec.mdc
- [ ] Create docs/ai_rules_index.md with canonical locations, SoT pointers, and per-agent deltas
- [ ] Run validation checks: grep for remaining context/ references, verify version sync, update docs/sot-reference-map.md