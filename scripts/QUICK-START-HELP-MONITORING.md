# Quick Start: Agent Help Monitoring

## 🚀 Start Monitoring Help Requests

**In a separate terminal, run:**

```bash
./scripts/agent-help-monitor.sh
```

This will:
- ✅ Monitor for new help requests every 10 seconds
- ✅ Display them prominently when they arrive
- ✅ Show blocked agents
- ✅ Keep running until you stop it (Ctrl+C)

## 📋 Check Help Requests Anytime

```bash
# List all open requests
./scripts/list-help-requests.sh open

# View a specific request
cat sessions/tasks/help-requests/agent-*.md
```

## 🆘 How Agents Request Help

Agents can request help by running:

```bash
./scripts/agent-workflow.sh <AGENT_ID> help
```

Or directly:

```bash
./scripts/agent-help-request.sh <AGENT_ID> "Their question here"
```

## ✅ Responding to Help Requests

1. **View the request** (shown in monitor or list)
2. **Edit the file** - Add your response in the "Response" section
3. **Mark as resolved** - Change `status: open` to `status: resolved` in frontmatter
4. **Unblock agent** - Agent status will update automatically

## 📁 Help Request Location

All requests are stored in:
```
sessions/tasks/help-requests/agent-<ID>-<timestamp>.md
```

## 💡 Pro Tip

Keep the monitor running in a background terminal:

```bash
# Run in background
nohup ./scripts/agent-help-monitor.sh > /tmp/help-monitor.log 2>&1 &

# Check the log
tail -f /tmp/help-monitor.log
```

---

**That's it!** Agents can now reach out to you via the help system, and you'll be notified immediately.

