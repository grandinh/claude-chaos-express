# Agent Bridge Protocol

This document defines the rules for inter-agent operations between Cursor (local authority) and Claude Code (high-reasoning executor).

## Key Principles

- Cursor is always the source of truth for local repo state.
- Claude Code must validate repo_state before writing files.
- All handoffs MUST follow the schema in ai_handoffs.md.

## Workflow

1. Cursor generates repo_state.
2. Cursor appends handoff entry.
3. Claude Code validates repo_state.
4. Claude Code executes work.
5. Claude Code appends completions.

## Cursor Responsibilities

- Always maintain `/repo_state/metadata.json` before ANY handoff
- Auto-create missing infrastructure files using templates
- Always update `ai_handoffs.md` with structured YAML entries
- Enforce handoff completeness (never partial or ambiguous)
- Never modify Tier-0 files unless directly instructed by user
- Always treat Cursor as ground truth for filesystem state

## Claude Code Responsibilities

- Always read `/repo_state/metadata.json` at task start
- Validate repo state matches expectations before writing
- Append completion entries to `ai_handoffs.md` after work
- Respect file tier protections
- Coordinate with Cursor via structured handoff protocol

