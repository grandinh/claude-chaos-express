#!/bin/bash
# Validate handoff entries in docs/ai_handoffs.md

set -e

HANDOFF_LOG="docs/ai_handoffs.md"
ERRORS=0

echo "🔍 Validating handoff entries in $HANDOFF_LOG..."
echo ""

# Check if file exists
if [ ! -f "$HANDOFF_LOG" ]; then
  echo "❌ ERROR: $HANDOFF_LOG not found"
  exit 1
fi

# Extract YAML blocks (entries between ```yaml and ```)
# This is a simple validation - for production, use a proper YAML parser

# Check for required schema fields in the schema definition
echo "📋 Checking schema definition..."
if grep -q "schema_version:" "$HANDOFF_LOG" && \
   grep -q "from:" "$HANDOFF_LOG" && \
   grep -q "to:" "$HANDOFF_LOG" && \
   grep -q "next:" "$HANDOFF_LOG" && \
   grep -q "completed:" "$HANDOFF_LOG"; then
  echo "✅ Schema definition includes required fields"
else
  echo "❌ ERROR: Schema definition missing required fields"
  ERRORS=$((ERRORS + 1))
fi

# Check for legacy field names (should be migrated)
if grep -q "from_agent:" "$HANDOFF_LOG" || \
   grep -q "to_agent:" "$HANDOFF_LOG" || \
   grep -q "needed:" "$HANDOFF_LOG"; then
  echo "⚠️  WARNING: Found legacy field names (from_agent/to_agent/needed)"
  echo "   These should be migrated to normalized schema (from/to/next)"
  # Don't count as error - just warning for backward compatibility
fi

# Validate YAML syntax using python (if available)
if command -v python3 &> /dev/null; then
  echo ""
  echo "🐍 Validating YAML syntax with Python..."

  python3 << 'PYTHON_SCRIPT'
import re
import sys

try:
    import yaml
except ImportError:
    print("⚠️  WARNING: PyYAML not installed, skipping YAML syntax validation")
    print("   Install with: pip3 install pyyaml")
    sys.exit(0)

# Read the handoff log
with open('docs/ai_handoffs.md', 'r') as f:
    content = f.read()

# Extract YAML blocks
yaml_blocks = re.findall(r'```yaml\n(.*?)\n```', content, re.DOTALL)

if not yaml_blocks:
    print("⚠️  WARNING: No YAML blocks found in handoff log")
    sys.exit(0)

errors = 0
for i, block in enumerate(yaml_blocks, 1):
    try:
        entry = yaml.safe_load(block)

        # Check required fields
        required_fields = ['timestamp', 'from', 'to', 'completed', 'next']
        missing = [f for f in required_fields if f not in entry]

        # Also accept legacy field names
        if 'from' not in entry and 'from_agent' in entry:
            entry['from'] = entry['from_agent']
        if 'to' not in entry and 'to_agent' in entry:
            entry['to'] = entry['to_agent']
        if 'next' not in entry and 'needed' in entry:
            entry['next'] = entry['needed']

        missing = [f for f in required_fields if f not in entry]

        if missing:
            print(f"❌ Entry {i}: Missing required fields: {', '.join(missing)}")
            errors += 1
        else:
            # Check schema_version (required for new entries)
            if 'schema_version' in entry:
                print(f"✅ Entry {i}: Valid")
                print(f"   Schema version: {entry['schema_version']}")
            else:
                print(f"⚠️  Entry {i}: Valid but missing schema_version")
                print(f"   WARNING: schema_version field is required for new entries")
                print(f"   Legacy entries without schema_version are accepted for backward compatibility")

    except yaml.YAMLError as e:
        print(f"❌ Entry {i}: YAML syntax error")
        print(f"   {str(e)}")
        errors += 1

if errors > 0:
    print(f"\n❌ {errors} validation error(s) found")
    sys.exit(1)
else:
    print(f"\n✅ All {len(yaml_blocks)} entries validated successfully")
    sys.exit(0)

PYTHON_SCRIPT

  PYTHON_EXIT=$?
  if [ $PYTHON_EXIT -ne 0 ]; then
    ERRORS=$((ERRORS + PYTHON_EXIT))
  fi
else
  echo "⚠️  WARNING: Python3 not found, skipping detailed YAML validation"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ Handoff validation passed!"
  exit 0
else
  echo "❌ Handoff validation failed with $ERRORS error(s)"
  exit 1
fi
