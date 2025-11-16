---
name: h-eldritch-commit-composer
branch: feature/h-eldritch-commit-composer
status: pending
created: 2025-11-16
priority: medium
---

# Ship Eldritch Commit Composer

## Problem/Goal
Lore-heavy commit taxonomy exists in `docs/commit_guidelines.md` but nothing enforces or assists authors, leading to drift from the ritual format. Provide a guided composer and optional hook to standardize commit messages.

## Success Criteria
- [ ] Implement `scripts/eldritch-commit.js` that prompts for commit type, breach context, manifest list, and residual effects, outputting the formatted message per guidelines.
- [ ] Add `npm run commit:ritual` alias to invoke the composer.
- [ ] Provide optional `prepare-commit-msg` hook under `summoning/hooks/` that runs the composer unless bypassed via env flag.
- [ ] Update `docs/commit_guidelines.md` and `README.md` with usage instructions and escape hatches for automation.
- [ ] Log any deviations or hook behavior in `context/decisions.md`.

## Context Manifest
- `scripts/eldritch-commit.js`
- `summoning/hooks/prepare-commit-msg`
- `docs/commit_guidelines.md`
- `README.md`
- `context/decisions.md`

## User Notes
- Created by a third-party AI; Claude must validate the plan, summarize benefits/risks to the user, recommend whether to proceed, and wait for explicit user permission before implementation.
- Benefit: consistent commit ritual and reduced manual errors. Risk: added friction for quick commits if the composer is too rigid.

## Work Log
- [2025-11-16] Task authored from feature suggestions; awaiting Claude validation and user permission.
