#!/bin/bash

# Validate skill frontmatter structure
# Usage: ./scripts/validate-skill-frontmatter.sh

set -e

SKILLS_DIR=".claude/skills"
ERRORS=0
WARNINGS=0

echo "=== Skill Frontmatter Validation ==="
echo ""

# Check if skills directory exists
if [ ! -d "$SKILLS_DIR" ]; then
  echo "❌ Error: $SKILLS_DIR directory not found"
  exit 1
fi

# Iterate through all skill directories
for skill_dir in "$SKILLS_DIR"/*/; do
  if [ ! -d "$skill_dir" ]; then
    continue
  fi

  skill_name=$(basename "$skill_dir")
  skill_file="${skill_dir}SKILL.md"

  echo "Checking: $skill_name"

  # Check if SKILL.md exists
  if [ ! -f "$skill_file" ]; then
    echo "  ❌ SKILL.md file missing"
    ((ERRORS++))
    continue
  fi

  # Check for YAML frontmatter
  if ! head -1 "$skill_file" | grep -q "^---$"; then
    echo "  ❌ Missing YAML frontmatter delimiter (first line should be '---')"
    ((ERRORS++))
    continue
  fi

  # Extract frontmatter (between first two --- lines)
  frontmatter=$(awk '/^---$/{flag++;next}/^---$/{flag++;next}flag==1' "$skill_file")

  # Check for required fields
  has_name=$(echo "$frontmatter" | grep -c "^name:" || true)
  has_description=$(echo "$frontmatter" | grep -c "^description:" || true)
  has_schema_version=$(echo "$frontmatter" | grep -c "^schema_version:" || true)

  if [ "$has_name" -eq 0 ]; then
    echo "  ❌ Missing 'name' field in frontmatter"
    ((ERRORS++))
  fi

  if [ "$has_description" -eq 0 ]; then
    echo "  ❌ Missing 'description' field in frontmatter"
    ((ERRORS++))
  fi

  if [ "$has_schema_version" -eq 0 ]; then
    echo "  ⚠️  Missing 'schema_version' field in frontmatter"
    ((WARNINGS++))
  fi

  # Check if name matches directory
  if [ "$has_name" -gt 0 ]; then
    frontmatter_name=$(echo "$frontmatter" | grep "^name:" | sed 's/^name: *//')
    if [ "$frontmatter_name" != "$skill_name" ]; then
      echo "  ❌ Name mismatch: directory='$skill_name', frontmatter='$frontmatter_name'"
      ((ERRORS++))
    fi
  fi

  # Check for well-formed YAML
  if ! echo "$frontmatter" | grep -q ":"; then
    echo "  ❌ Malformed YAML frontmatter (no key-value pairs found)"
    ((ERRORS++))
  fi

  # Success message if no errors for this skill
  if [ "$has_name" -gt 0 ] && [ "$has_description" -gt 0 ]; then
    if [ "$has_schema_version" -gt 0 ]; then
      echo "  ✓ Valid"
    else
      echo "  ⚠️  Valid (missing schema_version)"
    fi
  fi

  echo ""
done

# Check for orphaned .md files in root (excluding README.md)
orphaned_files=$(find "$SKILLS_DIR" -maxdepth 1 -name "*.md" -type f ! -name "README.md" 2>/dev/null || true)
if [ -n "$orphaned_files" ]; then
  echo "⚠️  Orphaned .md files found in $SKILLS_DIR root:"
  echo "$orphaned_files"
  echo "  (These should be removed or moved to skill directories)"
  ((WARNINGS++))
  echo ""
fi

# Summary
echo "=== Summary ==="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ All skills valid!"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  All skills valid with $WARNINGS warning(s)"
  exit 0
else
  echo "❌ Validation failed: $ERRORS error(s), $WARNINGS warning(s)"
  exit 1
fi
