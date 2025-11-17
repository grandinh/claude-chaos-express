---
name: "[prefix]-[descriptive-name]"
branch: "feature/[name]|fix/[name]|experiment/[name]|none"
status: "pending|in-progress|completed|blocked"
created: "YYYY-MM-DD"
context_gathered: false  # Set to true after context-gathering agent completes
depends_on: []  # Optional: list of task files this task depends on, e.g. ["task-file-1.md", "task-file-2.md"]
submodules: []  # Optional: list of git submodules affected (delete if not super-repo)
---

# [Human-Readable Title]

## Problem/Goal
[Clear description of what we're solving/building]

## Success Criteria
- [ ] Specific, measurable outcome
- [ ] Another concrete goal

## Context Manifest
<!-- Added by context-gathering agent -->

## User Notes
<!-- Any specific notes or requirements from the developer -->

## Work Log
<!-- Updated as work progresses -->
- [YYYY-MM-DD] Started task, initial research
