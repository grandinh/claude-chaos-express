---
title: Development Automation Strategy
summary: Automated task pickup, branch creation, issue fixing, and PR generation
tier: 2
created: 2025-01-20
tags: [automation, github, linear, webhooks, ci-cd]
---

# Development Automation Strategy

**Goal:** Automatically pick up tasks from external services (GitHub Issues, Linear, etc.), create branches, fix issues, and prepare PRs for merge.

---

## Current State

### ✅ What We Have

1. **GitHub Integration**
   - PM commands: `/pm:issue-start`, `/pm:issue-sync`, `/pm:issue-close`
   - Bidirectional sync between local tasks and GitHub Issues
   - Issue import and categorization

2. **Cursor Cloud Agents**
   - Webhook support for PR events
   - Scheduled agents via GitHub Actions
   - API-based agent triggering

3. **cc-sessions Workflow**
   - DAIC discipline (DISCUSS → ALIGN → IMPLEMENT → CHECK)
   - Task manifests and state persistence
   - Parallel agent execution

### ❌ What's Missing

1. **Automatic Task Pickup**
   - No webhook/polling for new GitHub Issues
   - No Linear integration
   - No automatic task prioritization

2. **Automatic Branch Creation**
   - Manual `/pm:issue-start` required
   - No automatic worktree setup

3. **Automatic Issue Fixing**
   - Requires manual agent invocation
   - No end-to-end automation

4. **Automatic PR Creation**
   - Manual PR creation after fixes
   - No auto-merge capability

---

## Automation Approaches

### Approach 1: GitHub Webhooks + Cursor Cloud Agent (Recommended)

**How it works:**
1. GitHub webhook triggers on issue events (opened, labeled with `auto-fix`)
2. Webhook calls Cursor Cloud Agents API
3. Cloud Agent creates branch, analyzes issue, fixes it, creates PR
4. PR is ready for review/merge

**Pros:**
- Real-time, event-driven
- Uses existing Cloud Agent infrastructure
- No polling overhead
- Works with existing webhook setup

**Cons:**
- Requires Cursor Cloud Agents API access
- Limited to GitHub (Linear needs separate integration)
- Cloud Agent execution time may vary

**Implementation:**

```yaml
# .github/workflows/auto-fix-issue.yml
name: Auto-Fix Issue

on:
  issues:
    types: [opened, labeled]

jobs:
  trigger-auto-fix:
    if: contains(github.event.issue.labels.*.name, 'auto-fix')
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Cursor Cloud Agent
        env:
          CURSOR_API_KEY: ${{ secrets.CURSOR_API_KEY }}
        run: |
          curl -X POST "https://api.cursor.com/v0/agents" \
            -H "Authorization: Bearer $CURSOR_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{
              \"agentConfig\": {
                \"name\": \"auto-fix-issue\",
                \"claudeAgentId\": \"triage-expert\",
                \"prompt\": \"Analyze GitHub Issue #${{ github.event.issue.number }} and create a fix. Issue: ${{ github.event.issue.title }}\n\n${{ github.event.issue.body }}\n\nSteps:\n1. Create branch: feature/auto-fix-${{ github.event.issue.number }}\n2. Analyze the issue\n3. Implement the fix\n4. Create PR with description from issue\n5. Link PR to issue\",
                \"repository\": \"${{ github.repository }}\",
                \"branch\": \"feature/auto-fix-${{ github.event.issue.number }}\",
                \"autoCreatePR\": true,
                \"targetBranch\": \"main\"
              }
            }"
```

**Cloud Agent Config:**

```json
{
  "name": "auto-fix-issue",
  "description": "Automatically fix GitHub issues and create PRs",
  "claudeAgentId": "triage-expert",
  "trigger": {
    "type": "webhook",
    "events": ["issues.opened", "issues.labeled"],
    "filters": {
      "requireLabel": "auto-fix"
    }
  },
  "model": "claude-sonnet-4",
  "prompt": {
    "template": "You are an automated issue fixer. Your task:\n\n1. **Analyze the Issue**\n   - Read GitHub Issue #{issue_number}\n   - Understand the problem\n   - Identify files that need changes\n\n2. **Create Branch**\n   - Branch name: feature/auto-fix-{issue_number}\n   - Checkout and create branch\n\n3. **Implement Fix**\n   - Make necessary code changes\n   - Add tests if applicable\n   - Follow project coding standards\n\n4. **Create PR**\n   - Title: \"fix: {issue_title}\"\n   - Description: Include issue number and description\n   - Link PR to issue (Closes #{issue_number})\n   - Request review if needed\n\n**Important:**\n- Only fix issues labeled 'auto-fix'\n- If issue is too complex, comment on issue explaining why\n- Always run tests before creating PR\n- Follow DAIC workflow if using cc-sessions"
  },
  "output": {
    "format": "pr",
    "autoCreatePR": true,
    "linkToIssue": true
  }
}
```

---

### Approach 2: GitHub Actions + Local Script (Hybrid)

**How it works:**
1. GitHub Actions workflow triggered on issue events
2. Workflow calls local script (via SSH or API)
3. Script uses existing PM commands (`/pm:issue-start`, etc.)
4. Script orchestrates fix and PR creation

**Pros:**
- Uses existing PM command infrastructure
- Full control over workflow
- Can integrate with cc-sessions
- Works with existing git worktrees

**Cons:**
- Requires local machine/runner to be available
- More complex setup
- Requires SSH/API access to local machine

**Implementation:**

```yaml
# .github/workflows/auto-fix-issue.yml
name: Auto-Fix Issue

on:
  issues:
    types: [opened, labeled]

jobs:
  trigger-auto-fix:
    if: contains(github.event.issue.labels.*.name, 'auto-fix')
    runs-on: ubuntu-latest
    steps:
      - name: Call Local Automation Script
        env:
          ISSUE_NUMBER: ${{ github.event.issue.number }}
          ISSUE_TITLE: ${{ github.event.issue.title }}
          ISSUE_BODY: ${{ github.event.issue.body }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # Call local script via API or webhook
          curl -X POST "${{ secrets.AUTOMATION_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d "{
              \"issue_number\": \"$ISSUE_NUMBER\",
              \"title\": \"$ISSUE_TITLE\",
              \"body\": \"$ISSUE_BODY\",
              \"action\": \"auto-fix\"
            }"
```

**Local Script:**

```bash
#!/bin/bash
# scripts/auto-fix-issue.sh

ISSUE_NUMBER=$1
ISSUE_TITLE=$2
ISSUE_BODY=$3

# 1. Import issue if not already tracked
gh issue view $ISSUE_NUMBER --json number,title,body,labels > /tmp/issue.json

# 2. Check if issue is already being worked on
if [ -f ".claude/epics/*/$ISSUE_NUMBER.md" ]; then
  echo "Issue #$ISSUE_NUMBER already tracked"
else
  # Import issue
  /pm:import --label "auto-fix"
fi

# 3. Analyze issue
/pm:issue-analyze $ISSUE_NUMBER

# 4. Start work (creates branch, worktree, etc.)
/pm:issue-start $ISSUE_NUMBER

# 5. Wait for agents to complete (poll status)
# ... monitoring logic ...

# 6. Create PR when done
BRANCH=$(git branch --show-current)
gh pr create \
  --title "fix: $ISSUE_TITLE" \
  --body "$ISSUE_BODY\n\nCloses #$ISSUE_NUMBER" \
  --base main \
  --head $BRANCH
```

---

### Approach 3: Polling Service (Linear + GitHub)

**How it works:**
1. Scheduled service polls Linear/GitHub for new tasks
2. Filters tasks by criteria (label, priority, etc.)
3. Triggers automation for each task
4. Updates task status in source system

**Pros:**
- Works with any service (Linear, Jira, etc.)
- Can batch process multiple tasks
- Centralized control

**Cons:**
- Polling overhead
- Delayed execution
- Requires separate service/runner

**Implementation:**

```javascript
// scripts/poll-and-fix.js
const { Octokit } = require('@octokit/rest');
const { LinearClient } = require('@linear/sdk');

const github = new Octokit({ auth: process.env.GITHUB_TOKEN });
const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

async function pollAndFix() {
  // Poll Linear for tasks with "auto-fix" label
  const linearIssues = await linear.issues({
    filter: { labels: { name: { eq: 'auto-fix' } } },
    first: 10
  });

  for (const issue of linearIssues.nodes) {
    // Create GitHub issue from Linear issue
    const ghIssue = await github.rest.issues.create({
      owner: 'grandinh',
      repo: 'claude-chaos-express',
      title: issue.title,
      body: `From Linear: ${issue.url}\n\n${issue.description}`,
      labels: ['auto-fix', 'from-linear']
    });

    // Trigger auto-fix workflow
    await triggerAutoFix(ghIssue.data.number);
  }

  // Poll GitHub for issues with "auto-fix" label
  const ghIssues = await github.rest.issues.listForRepo({
    owner: 'grandinh',
    repo: 'claude-chaos-express',
    labels: 'auto-fix',
    state: 'open'
  });

  for (const issue of ghIssues.data) {
    if (!issue.pull_request) { // Only issues, not PRs
      await triggerAutoFix(issue.number);
    }
  }
}

async function triggerAutoFix(issueNumber) {
  // Call Cursor Cloud Agent API or local script
  // ... implementation ...
}

// Run every 5 minutes
setInterval(pollAndFix, 5 * 60 * 1000);
```

---

## Recommended Implementation Plan

### Phase 1: GitHub Issue Auto-Fix (MVP)

1. **Create Cloud Agent Config**
   - `.cursor/cloud-agents/auto-fix-issue.json`
   - Configure for issue events with `auto-fix` label

2. **Set Up GitHub Webhook**
   - Configure webhook for `issues.opened` and `issues.labeled`
   - Point to Cursor Cloud Agents API endpoint

3. **Test with Sample Issue**
   - Create test issue with `auto-fix` label
   - Verify agent triggers, branch created, fix implemented, PR created

### Phase 2: Enhanced Automation

1. **Add Issue Analysis**
   - Use `/pm:issue-analyze` before fixing
   - Only auto-fix issues that pass complexity threshold

2. **Add PR Auto-Merge**
   - Auto-merge PRs that pass all checks
   - Require approval for high-risk changes

3. **Add Status Updates**
   - Update issue with progress comments
   - Link PR to issue automatically

### Phase 3: Multi-Service Integration

1. **Linear Integration**
   - Poll Linear API for tasks
   - Create GitHub issues from Linear tasks
   - Sync status back to Linear

2. **Other Services**
   - Jira, Asana, etc.
   - Unified task queue

---

## Configuration

### GitHub Repository Settings

1. **Webhook Configuration**
   - URL: `https://api.cursor.com/v0/agents/webhook`
   - Events: `issues`, `pull_request`
   - Secret: Store in GitHub Secrets

2. **Secrets Required**
   - `CURSOR_API_KEY` - Cursor Cloud Agents API key
   - `CURSOR_WEBHOOK_SECRET` - Webhook signature secret

3. **Labels**
   - `auto-fix` - Triggers automatic fixing
   - `auto-merge` - Allows auto-merge after fix
   - `complex` - Skips auto-fix, requires manual review

### Cloud Agent Configuration

```json
{
  "name": "auto-fix-issue",
  "description": "Automatically fix GitHub issues",
  "claudeAgentId": "triage-expert",
  "trigger": {
    "type": "webhook",
    "events": ["issues.opened", "issues.labeled"],
    "filters": {
      "requireLabel": "auto-fix",
      "excludeLabels": ["complex", "manual-review"]
    }
  },
  "model": "claude-sonnet-4",
  "prompt": {
    "template": "..."
  },
  "output": {
    "format": "pr",
    "autoCreatePR": true,
    "linkToIssue": true,
    "autoMerge": false
  }
}
```

---

## Safety & Guardrails

### What Should NOT Be Auto-Fixed

1. **Security Issues**
   - Require manual review
   - Label: `security`

2. **Breaking Changes**
   - Require discussion
   - Label: `breaking-change`

3. **Complex Refactors**
   - Require planning
   - Label: `complex`

4. **Database Migrations**
   - Require careful review
   - Label: `database`

### Approval Workflow

1. **Simple Fixes** (auto-merge)
   - Typo fixes
   - Documentation updates
   - Minor bug fixes

2. **Standard Fixes** (auto-PR, manual review)
   - Feature additions
   - Bug fixes
   - Test updates

3. **Complex Fixes** (manual only)
   - Architecture changes
   - Performance optimizations
   - Security patches

---

## Monitoring & Observability

### Metrics to Track

1. **Automation Success Rate**
   - Issues auto-fixed successfully
   - Issues requiring manual intervention
   - Average time to fix

2. **PR Quality**
   - PRs passing CI/CD
   - PRs requiring changes
   - Review feedback patterns

3. **Issue Complexity**
   - Issues that can't be auto-fixed
   - Common failure reasons
   - Complexity patterns

### Logging

- Log all automation triggers
- Log agent execution results
- Log PR creation and merge events
- Alert on failures

---

## Next Steps

1. **Create GitHub Issue** for automation feature
2. **Implement Phase 1** (GitHub Issue Auto-Fix)
3. **Test with sample issues**
4. **Iterate based on results**
5. **Expand to Phase 2 and 3**

---

## References

- [Cursor Cloud Agents API](https://cursor.com/docs/cloud-agent/api/endpoints)
- [GitHub Webhooks](https://docs.github.com/en/webhooks)
- [Linear API](https://developers.linear.app/docs)
- Existing webhook setup: `.cursor/cloud-agents/webhooks/setup-guide.md`
- PM commands: `.claude/commands/pm/`

