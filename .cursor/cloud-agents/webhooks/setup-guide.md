# Cloud Agent Webhook Setup Guide

This guide explains how to configure GitHub webhooks and GitHub Actions to trigger Cursor Cloud Agents automatically.

## Overview

### Webhook-Triggered Agents (PR Events)

- **A11yGuard** - Accessibility compliance checker (PR opened/updated)
- **ReviewBot** - Comprehensive code review (PR opened/updated)
- **CommitGen** - Commit message suggestions (PR opened, optional with label)

### Scheduled Agents (GitHub Actions Alternative)

- **DocSync** - Weekly documentation sync (Mondays 9 AM UTC)
- **DebtScanner** - Monthly technical debt scan (1st of month, 10 AM UTC)
- **ModernizeBot** - Quarterly modernization scan (Jan/Apr/Jul/Oct 1st, 11 AM UTC)

---

## Option 1: GitHub Webhooks (Recommended for PR Agents)

### Prerequisites

1. **Cursor Cloud Agents API Key**
   - Obtain from: https://cursor.com/settings/api
   - Store securely (we'll add it to GitHub secrets)

2. **Repository Admin Access**
   - Required to create webhooks

### Step 1: Create GitHub Webhook

1. Navigate to your repository on GitHub
2. Go to **Settings** → **Webhooks** → **Add webhook**
3. Configure webhook:

   **Payload URL:**
   ```
   https://api.cursor.com/v0/agents/webhook
   ```

   **Content type:**
   ```
   application/json
   ```

   **Secret:** (Generate a secure random string)
   ```bash
   # Generate webhook secret
   openssl rand -hex 32
   ```

   **SSL verification:** Enable SSL verification

   **Events:** Select individual events:
   - ✅ Pull requests
   - ✅ Pull request reviews (optional)
   - ✅ Pull request review comments (optional)

4. Click **Add webhook**

### Step 2: Configure GitHub Repository Secrets

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following secrets:

   **CURSOR_API_KEY**
   ```
   Your Cursor Cloud Agents API key from step 1
   ```

   **CURSOR_WEBHOOK_SECRET**
   ```
   The webhook secret you generated in Step 1
   ```

### Step 3: Test Webhook Delivery

1. Go to **Settings** → **Webhooks** → Select your webhook
2. Click **Recent Deliveries**
3. Create a test pull request to trigger the webhook
4. Verify delivery in the **Recent Deliveries** tab:
   - Response code should be `200` or `202`
   - Check response body for agent activation confirmation

### Step 4: Configure Agent Filtering (Optional)

Edit the Cloud Agent config files to customize when agents trigger:

**Example: A11yGuard - Only trigger on UI component changes**
```json
{
  "trigger": {
    "type": "webhook",
    "events": ["pull_request.opened", "pull_request.synchronize"],
    "filters": {
      "pathPatterns": [
        "**/*.tsx",
        "**/*.jsx",
        "src/components/**"
      ],
      "excludePatterns": [
        "**/*.test.*",
        "**/__tests__/**"
      ]
    }
  }
}
```

**Example: CommitGen - Only trigger with specific label**
```json
{
  "trigger": {
    "type": "webhook",
    "events": ["pull_request.opened"],
    "filters": {
      "requireLabel": "needs-commit-msg"
    },
    "optional": true
  }
}
```

---

## Option 2: GitHub Actions (Recommended for Scheduled Agents)

For scheduled agents (DocSync, DebtScanner, ModernizeBot), GitHub Actions provides more flexibility and better integration with repository workflows.

### Step 1: Create Workflow Files

Create `.github/workflows/cloud-agents-scheduled.yml`:

```yaml
name: Cursor Cloud Agents - Scheduled

on:
  schedule:
    # DocSync - Every Monday at 9:00 AM UTC
    - cron: '0 9 * * 1'
    # DebtScanner - 1st of each month at 10:00 AM UTC
    - cron: '0 10 1 * *'
    # ModernizeBot - Quarterly (Jan/Apr/Jul/Oct 1st at 11:00 AM UTC)
    - cron: '0 11 1 1,4,7,10 *'

  workflow_dispatch:
    inputs:
      agent:
        description: 'Agent to run'
        required: true
        type: choice
        options:
          - doc-sync
          - debt-scanner
          - modernize-bot
          - all

jobs:
  determine-agent:
    runs-on: ubuntu-latest
    outputs:
      agents: ${{ steps.set-agents.outputs.agents }}
    steps:
      - name: Determine which agents to run
        id: set-agents
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            if [ "${{ github.event.inputs.agent }}" = "all" ]; then
              echo "agents=[\"doc-sync\",\"debt-scanner\",\"modernize-bot\"]" >> $GITHUB_OUTPUT
            else
              echo "agents=[\"${{ github.event.inputs.agent }}\"]" >> $GITHUB_OUTPUT
            fi
          else
            # Determine based on schedule
            HOUR=$(date -u +%H)
            DAY=$(date -u +%d)
            MONTH=$(date -u +%m)

            AGENTS="[]"

            # DocSync - Monday 9 AM
            if [ "$(date -u +%u)" = "1" ] && [ "$HOUR" = "09" ]; then
              AGENTS=$(echo $AGENTS | jq '. + ["doc-sync"]')
            fi

            # DebtScanner - 1st of month 10 AM
            if [ "$DAY" = "01" ] && [ "$HOUR" = "10" ]; then
              AGENTS=$(echo $AGENTS | jq '. + ["debt-scanner"]')
            fi

            # ModernizeBot - Quarterly 1st 11 AM
            if [ "$DAY" = "01" ] && [ "$HOUR" = "11" ] && ([ "$MONTH" = "01" ] || [ "$MONTH" = "04" ] || [ "$MONTH" = "07" ] || [ "$MONTH" = "10" ]); then
              AGENTS=$(echo $AGENTS | jq '. + ["modernize-bot"]')
            fi

            echo "agents=$AGENTS" >> $GITHUB_OUTPUT
          fi

  run-agent:
    needs: determine-agent
    runs-on: ubuntu-latest
    strategy:
      matrix:
        agent: ${{ fromJson(needs.determine-agent.outputs.agents) }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Run Cloud Agent via Cursor API
        env:
          CURSOR_API_KEY: ${{ secrets.CURSOR_API_KEY }}
        run: |
          AGENT_NAME="${{ matrix.agent }}"
          CONFIG_FILE=".cursor/cloud-agents/${AGENT_NAME}.json"

          # Read agent config
          AGENT_CONFIG=$(cat $CONFIG_FILE)

          # Call Cursor Cloud Agents API
          curl -X POST "https://api.cursor.com/v0/agents" \
            -H "Authorization: Bearer $CURSOR_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{
              \"agentConfig\": $AGENT_CONFIG,
              \"repository\": \"${{ github.repository }}\",
              \"branch\": \"${{ github.ref_name }}\",
              \"triggeredBy\": \"github-actions-scheduled\"
            }"

      - name: Wait for agent completion
        env:
          CURSOR_API_KEY: ${{ secrets.CURSOR_API_KEY }}
        run: |
          # Poll agent status (example - adjust based on actual API)
          AGENT_ID=$(cat agent_id.txt)

          for i in {1..60}; do
            STATUS=$(curl -s -H "Authorization: Bearer $CURSOR_API_KEY" \
              "https://api.cursor.com/v0/agents/$AGENT_ID/status" | jq -r '.status')

            if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
              echo "Agent finished with status: $STATUS"
              break
            fi

            echo "Agent still running... ($i/60)"
            sleep 30
          done
```

### Step 2: Manual Trigger (Testing)

You can manually trigger any agent using GitHub Actions UI:

1. Go to **Actions** → **Cursor Cloud Agents - Scheduled**
2. Click **Run workflow**
3. Select which agent to run
4. Click **Run workflow**

---

## Option 3: Hybrid Approach (Recommended)

Use **webhooks for PR agents** (immediate feedback) and **GitHub Actions for scheduled agents** (better integration).

**Webhook Agents:**
- A11yGuard
- ReviewBot
- CommitGen

**GitHub Actions:**
- DocSync
- DebtScanner
- ModernizeBot

---

## Troubleshooting

### Webhook Issues

**Problem:** Webhook returns 401 Unauthorized

**Solution:**
- Verify `CURSOR_API_KEY` is correct
- Check API key has `agent:trigger` permission
- Ensure webhook secret matches configured value

**Problem:** Webhook returns 404 Not Found

**Solution:**
- Verify payload URL is correct: `https://api.cursor.com/v0/agents/webhook`
- Check Cursor Cloud Agents API endpoint documentation for updates

**Problem:** Agent doesn't trigger on PR events

**Solution:**
- Check webhook delivery logs in GitHub Settings → Webhooks
- Verify agent config `filters` aren't too restrictive
- Ensure PR changes match `pathPatterns` in agent config

### GitHub Actions Issues

**Problem:** Scheduled workflow doesn't run

**Solution:**
- Ensure repository is active (scheduled workflows disabled on inactive repos)
- Verify cron syntax is correct
- Check Actions tab for workflow run history

**Problem:** API call fails with 403 Forbidden

**Solution:**
- Verify `CURSOR_API_KEY` secret is set correctly
- Check API key hasn't expired
- Ensure repository has permission to trigger agents

---

## Security Best Practices

1. **Rotate webhook secrets regularly** (every 90 days)
2. **Use GitHub environment secrets** for production vs staging
3. **Audit webhook deliveries** monthly
4. **Monitor Cloud Agent API usage** to detect anomalies
5. **Restrict agent triggers** with filters to avoid unnecessary runs
6. **Review agent outputs** before auto-merging PRs

---

## Next Steps

1. ✅ Set up webhooks for PR agents (5 min)
2. ✅ Create GitHub Actions workflow for scheduled agents (10 min)
3. ✅ Test each agent manually (15 min)
4. ✅ Monitor agent runs for 1 week (ongoing)
5. ✅ Refine filters and schedules based on usage (as needed)

---

## References

- **Cursor Cloud Agents API:** https://cursor.com/docs/cloud-agent/api/endpoints
- **GitHub Webhooks Documentation:** https://docs.github.com/en/webhooks
- **GitHub Actions Scheduled Workflows:** https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule
- **Webhook Payload Examples:** See `payload-examples.json` in this directory
