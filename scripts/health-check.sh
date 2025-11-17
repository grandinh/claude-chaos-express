#!/bin/bash

# Health Check Script
# Purpose: Verify all critical system components are working
# Usage: ./scripts/health-check.sh

set -euo pipefail

# Ensure we're at repo root
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
cd "$REPO_ROOT" || {
    echo "❌ ERROR: Cannot determine repository root"
    exit 2
}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
CHECKS_PASSED=0

# Disable colors if NO_COLOR is set
if [ -n "${NO_COLOR:-}" ]; then
    RED=''
    GREEN=''
    YELLOW=''
    CYAN=''
    NC=''
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}System Health Check${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to report error
report_error() {
    echo -e "${RED}✗ $1${NC}"
    ERRORS=$((ERRORS + 1))
}

# Function to report warning
report_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

# Function to report success
report_success() {
    echo -e "${GREEN}✓ $1${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
}

# Check 1: Cursor Rules
echo -e "${CYAN}[1/7] Cursor Rules${NC}"
if [ -f ".cursor/rules/cursor-agent-operating-spec.mdc" ]; then
    report_success "Cursor rules file exists"
else
    report_error "Cursor rules missing (.cursor/rules/cursor-agent-operating-spec.mdc)"
fi
echo ""

# Check 2: Claude Code Access
echo -e "${CYAN}[2/7] Claude Code Documentation${NC}"
if [ -f "CLAUDE.md" ]; then
    report_success "CLAUDE.md exists"
else
    report_error "CLAUDE.md not found"
fi

if [ -f "claude-reference.md" ]; then
    report_success "claude-reference.md exists"
else
    report_error "claude-reference.md not found"
fi
echo ""

# Check 3: Handoff Log
echo -e "${CYAN}[3/7] Handoff Log${NC}"
if [ -f "docs/ai_handoffs.md" ]; then
    if [ -s "docs/ai_handoffs.md" ]; then
        report_success "Handoff log exists and is readable"
    else
        report_warning "Handoff log exists but is empty"
    fi
else
    report_error "Handoff log not found (docs/ai_handoffs.md)"
fi
echo ""

# Check 4: Session State
echo -e "${CYAN}[4/7] Session State${NC}"
if [ -f "sessions/sessions-state.json" ]; then
    # Validate JSON using Node.js if available
    if command -v node >/dev/null 2>&1; then
        if node -e "JSON.parse(require('fs').readFileSync('sessions/sessions-state.json', 'utf8'))" 2>/dev/null; then
            report_success "Session state file exists and is valid JSON"
        else
            report_error "Session state file exists but contains invalid JSON"
        fi
    elif command -v python3 >/dev/null 2>&1; then
        # Fallback to Python if Node.js not available
        if python3 -m json.tool "sessions/sessions-state.json" >/dev/null 2>&1; then
            report_success "Session state file exists and is valid JSON"
        else
            report_error "Session state file exists but contains invalid JSON"
        fi
    else
        # Basic file existence check if no JSON validator available
        report_success "Session state file exists (JSON validation skipped - no validator available)"
    fi
else
    report_warning "Session state file not found (sessions/sessions-state.json) - may be first run"
fi
echo ""

# Check 5: Agent Registry (optional)
echo -e "${CYAN}[5/7] Agent Registry${NC}"
if [ ! -f "repo_state/agent-registry.json" ]; then
    report_warning "Agent registry not found (repo_state/agent-registry.json) - optional"
elif [ ! -f "scripts/agent-registry.js" ]; then
    report_warning "Agent registry CLI missing, skipping schema validation"
    report_success "Agent registry file exists (structure not validated)"
else
    # Use canonical validation from CLI (validates against schema)
    if node scripts/agent-registry.js validate >/dev/null 2>&1; then
        report_success "Agent registry valid (schema validated)"
    else
        report_error "Agent registry validation failed (run: node scripts/agent-registry.js validate)"
    fi
fi
echo ""

# Check 6: Git State
echo -e "${CYAN}[6/7] Git State${NC}"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD")
    if [ "$BRANCH" != "HEAD" ]; then
        report_success "Git repository initialized (on branch: $BRANCH)"
    else
        report_warning "Git repository initialized but not on a branch"
    fi
else
    report_error "Not in a git repository"
fi
echo ""

# Check 7: Alignment (if script exists)
echo -e "${CYAN}[7/7] Alignment Check${NC}"
if [ -f "scripts/check-claude-cursor-alignment.sh" ] && [ -x "scripts/check-claude-cursor-alignment.sh" ]; then
    if ./scripts/check-claude-cursor-alignment.sh >/dev/null 2>&1; then
        report_success "Alignment check passed"
    else
        report_warning "Alignment check found issues (run manually for details)"
    fi
else
    report_warning "Alignment check script not found or not executable"
fi
echo ""

# Summary
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Summary${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Checks passed: $CHECKS_PASSED"
if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
fi
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}Errors: $ERRORS${NC}"
fi
echo ""

# Exit codes
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}Critical errors found. See details above.${NC}"
    exit 2
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}System operational with warnings.${NC}"
    exit 1
else
    echo -e "${GREEN}All systems operational!${NC}"
    exit 0
fi
