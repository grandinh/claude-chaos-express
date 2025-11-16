#!/bin/bash

# Claude-Cursor Alignment Drift Detection Script
# Purpose: Detect when Claude Code and Cursor Agent systems drift out of sync
# Created: 2025-01-20
# Task: h-align-claude-cursor-systems

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ISSUES_FOUND=0
CHECKS_PASSED=0

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Claude-Cursor Alignment Drift Detection${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to report issue
report_issue() {
    echo -e "${RED}✗ ISSUE: $1${NC}"
    ((ISSUES_FOUND++))
}

# Function to report success
report_success() {
    echo -e "${GREEN}✓ PASS: $1${NC}"
    ((CHECKS_PASSED++))
}

# Function to report warning
report_warning() {
    echo -e "${YELLOW}⚠ WARNING: $1${NC}"
}

echo -e "${BLUE}[1/5] Checking File References${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if Cursor rule exists
if [ -f ".cursor/rules/cursor-agent-operating-spec.mdc" ]; then
    report_success "Cursor rule file exists"
else
    report_issue "Cursor rule file missing: .cursor/rules/cursor-agent-operating-spec.mdc"
fi

# Check key shared files exist
SHARED_FILES=(
    "CLAUDE.md"
    "claude-reference.md"
    "context/decisions.md"
    "context/insights.md"
    "context/gotchas.md"
    "docs/ai_handoffs.md"
    "docs/agent_bridge_protocol.md"
    "docs/tiers_of_context.md"
)

for file in "${SHARED_FILES[@]}"; do
    if [ -f "$file" ]; then
        report_success "Shared SoT file exists: $file"
    else
        report_issue "Shared SoT file missing: $file"
    fi
done

echo ""
echo -e "${BLUE}[2/5] Checking Handoff Log Path Consistency${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if both systems reference same handoff log path
CURSOR_HANDOFF=$(grep -o '@docs/ai_handoffs.md\|docs/ai_handoffs.md' .cursor/rules/cursor-agent-operating-spec.mdc 2>/dev/null | head -1 || echo "")
BRIDGE_HANDOFF=$(grep -o 'docs/ai_handoffs.md' docs/agent_bridge_protocol.md 2>/dev/null | head -1 || echo "")

if [ "$CURSOR_HANDOFF" != "" ] && [ "$BRIDGE_HANDOFF" != "" ]; then
    # Normalize paths (remove @ prefix)
    CURSOR_PATH=$(echo "$CURSOR_HANDOFF" | sed 's/@//')

    if [ "$CURSOR_PATH" = "$BRIDGE_HANDOFF" ]; then
        report_success "Handoff log path consistent: $BRIDGE_HANDOFF"
    else
        report_issue "Handoff log path mismatch: Cursor=$CURSOR_PATH, Bridge=$BRIDGE_HANDOFF"
    fi
else
    report_warning "Could not verify handoff log path consistency"
fi

echo ""
echo -e "${BLUE}[3/5] Checking Agent System Alignment${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Count Claude agents
AGENT_COUNT=$(find .claude/agents -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')

if [ "$AGENT_COUNT" -gt 0 ]; then
    report_success "Found $AGENT_COUNT Claude agents"

    # Check if agent audit exists and is reasonably current
    if [ -f "docs/agent-system-audit.md" ]; then
        report_success "Agent system audit exists"

        # Check if audit mentions the agent count (rough validation)
        if grep -q "51 agents\|$AGENT_COUNT agents" docs/agent-system-audit.md 2>/dev/null; then
            report_success "Agent audit appears current (mentions agent count)"
        else
            report_warning "Agent audit may be outdated (doesn't mention current agent count)"
        fi
    else
        report_issue "Agent system audit missing: docs/agent-system-audit.md"
    fi

    # Check if agent alignment strategy exists
    if [ -f "docs/claude-cursor-agent-alignment.md" ]; then
        report_success "Agent alignment strategy exists"
    else
        report_issue "Agent alignment strategy missing: docs/claude-cursor-agent-alignment.md"
    fi
else
    report_warning "No Claude agents found in .claude/agents/"
fi

echo ""
echo -e "${BLUE}[4/5] Checking Documentation Alignment${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if key alignment docs exist
ALIGNMENT_DOCS=(
    "docs/sot-reference-map.md"
    "docs/agent-system-audit.md"
    "docs/claude-cursor-agent-alignment.md"
    "docs/claude-cursor-alignment.md"
)

for doc in "${ALIGNMENT_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        report_success "Alignment doc exists: $doc"
    else
        report_issue "Alignment doc missing: $doc"
    fi
done

# Check if CURSOR.md has migration note
if [ -f "CURSOR.md" ]; then
    if grep -q "Migration Note" CURSOR.md 2>/dev/null; then
        report_success "CURSOR.md has migration note to .cursor/rules/"
    else
        report_warning "CURSOR.md missing migration note (legacy file)"
    fi
else
    report_warning "CURSOR.md not found (acceptable if fully migrated)"
fi

echo ""
echo -e "${BLUE}[5/5] Checking CLAUDE.md References to Cursor${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if CLAUDE.md Section 5 references Cursor rules
if grep -q ".cursor/rules" CLAUDE.md 2>/dev/null; then
    report_success "CLAUDE.md references .cursor/rules/"
else
    report_warning "CLAUDE.md may not reference .cursor/rules/ (check Section 5)"
fi

# Check if CLAUDE.md Section 5 exists (Claude Code vs Cursor)
if grep -q "## 5. Claude Code vs Cursor" CLAUDE.md 2>/dev/null; then
    report_success "CLAUDE.md has Section 5 (Claude Code vs Cursor)"
else
    report_warning "CLAUDE.md may be missing Section 5 coordination section"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Systems are aligned.${NC}"
    echo -e "${GREEN}  Checks passed: $CHECKS_PASSED${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Issues found: $ISSUES_FOUND${NC}"
    echo -e "${GREEN}  Checks passed: $CHECKS_PASSED${NC}"
    echo ""
    echo -e "${YELLOW}Recommendations:${NC}"
    echo "  1. Review issues above"
    echo "  2. Consult docs/claude-cursor-alignment.md for fix procedures"
    echo "  3. Re-run this script after fixes"
    echo "  4. Document fixes in context/decisions.md"
    echo ""
    exit 1
fi
