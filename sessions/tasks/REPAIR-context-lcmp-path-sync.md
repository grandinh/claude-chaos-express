---
name: REPAIR-context-lcmp-path-sync
branch: feature/REPAIR-context-lcmp-path-sync
status: pending
created: 2025-11-16
priority: high
---

# REPAIR: Align LCMP Path Case Across Framework

## Problem/Goal
Tier-1 docs and health checks reference lowercase `context/` paths, but the repository uses `Context/`, causing alignment checks to flag missing SoT and any automation keyed to lowercase paths to fail. Normalize casing and references so LCMP files are reliably detected on case-sensitive systems.

## Success Criteria
- [ ] Inventory all references to `context/` or `Context/` across docs, scripts, and settings, and select a single canonical casing (prefer `context/`).
- [ ] Rename the directory via `git mv` to the canonical casing and update all references accordingly (docs, scripts, hooks, templates).
- [ ] Rerun `scripts/check-claude-cursor-alignment.sh` or equivalent to confirm LCMP files are detected without case-related errors.
- [ ] Record the casing decision and any fallout in LCMP docs (`context/decisions.md`, `context/gotchas.md`).
- [ ] Capture before/after notes showing the error disappeared after the rename.

## Context Manifest
- `CLAUDE.md`
- `claude-reference.md`
- `scripts/check-claude-cursor-alignment.sh`
- `Context/` directory and all LCMP files
- `.claude/settings.json` references to `Context/Scripts/*`

## User Notes
- Created by a third-party AI; Claude must validate the plan, summarize benefits/risks to the user, recommend whether to proceed, and wait for explicit user permission before implementation.
- Primary benefit: restores LCMP SoT detection and eliminates false negatives in health checks. Primary risk: casing renames can break paths for existing scripts or clones until updated.

## Implementation Instructions

### Step 1: Inventory All References

**Action:** Search for all references to `Context/` or `context/`:

```bash
# Find all references (case-insensitive)
grep -ri "Context/" . --exclude-dir=node_modules --exclude-dir=.git
grep -ri "context/" . --exclude-dir=node_modules --exclude-dir=.git

# Save results to a file for review
grep -ri "Context/" . --exclude-dir=node_modules --exclude-dir=.git > /tmp/context-refs.txt
```

**Files to check:**
- `CLAUDE.md`
- `claude-reference.md`
- `CURSOR.md`
- `scripts/check-claude-cursor-alignment.sh`
- `.claude/settings.json`
- All docs in `docs/`
- Any hook files referencing the path

### Step 2: Rename Directory Using Git

**Action:** Use `git mv` to preserve history:

```bash
# Rename directory (preserves git history)
git mv Context context

# Verify rename
ls -la | grep context
```

### Step 3: Update All References

**Action:** Update all files that reference `Context/` to use `context/`:

**File:** `CLAUDE.md`
- Search for: `Context/`
- Replace with: `context/`

**File:** `claude-reference.md`
- Search for: `Context/`
- Replace with: `context/`

**File:** `scripts/check-claude-cursor-alignment.sh`
- Search for: `Context/`
- Replace with: `context/`

**File:** `.claude/settings.json`
- Search for: `Context/Scripts/`
- Replace with: `context/Scripts/`

**File:** Any other files found in Step 1
- Update all references from `Context/` to `context/`

**Script to automate (optional):**

```bash
#!/bin/bash
# Update all references from Context/ to context/

# Files to update (add more as needed)
files=(
  "CLAUDE.md"
  "claude-reference.md"
  "CURSOR.md"
  "scripts/check-claude-cursor-alignment.sh"
  ".claude/settings.json"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    sed -i '' 's|Context/|context/|g' "$file"
    echo "Updated: $file"
  fi
done

# Also search in docs/
find docs/ -type f -name "*.md" -exec sed -i '' 's|Context/|context/|g' {} \;
```

### Step 4: Verify Alignment Check

**Action:** Run alignment check to confirm fix:

```bash
./scripts/check-claude-cursor-alignment.sh
```

**Expected:** No errors about missing `context/` files.

### Step 5: Record Decision

**File:** `context/decisions.md` (after rename)

**Action:** Add entry:

```markdown
## 2025-01-27: LCMP Path Case Normalization

**Decision:** Standardized LCMP directory path to lowercase `context/` (was `Context/`).

**Rationale:**
- Tier-1 documentation references lowercase `context/`
- Case-sensitive filesystems require exact path matches
- Eliminates false negatives in health checks and SoT detection
- Aligns with documentation expectations

**Changes:**
- Renamed `Context/` directory to `context/` using `git mv`
- Updated all references in docs, scripts, and settings
- Verified alignment check passes after rename

**Impact:**
- All LCMP files now accessible via `context/` path
- Health checks detect LCMP files correctly
- No breaking changes (paths updated atomically)
```

**File:** `context/gotchas.md` (after rename)

**Action:** Add entry if any issues discovered:

```markdown
## Path Case Sensitivity

**Issue:** Directory was `Context/` but docs referenced `context/`, causing detection failures on case-sensitive filesystems.

**Fix:** Renamed to `context/` and updated all references (2025-01-27).

**Prevention:** Always use lowercase for directory names in cross-platform projects.
```

### Step 6: Testing

1. **Verify directory exists:**
   ```bash
   ls -la context/
   ```

2. **Verify LCMP files accessible:**
   ```bash
   ls context/*.md
   ```

3. **Run alignment check:**
   ```bash
   ./scripts/check-claude-cursor-alignment.sh
   ```

4. **Verify no broken references:**
   ```bash
   grep -r "Context/" . --exclude-dir=node_modules --exclude-dir=.git
   # Should return no results (or only in this task file)
   ```

## Work Log
- [2025-11-16] Task authored during audit; awaiting Claude validation and user permission.
