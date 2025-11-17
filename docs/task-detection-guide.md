# Task Detection Watcher Quick Start

## Setup (One-time)

1. Install dependencies:
   ```bash
   cd scripts
   npm install
   ```

2. Start watcher:
   ```bash
   npm run watch-automation
   ```

## Usage

### Task Detection Workflow

When new task files are created:
1. Watcher detects new `.md` file in `sessions/tasks/`
2. Desktop notification appears
3. Task logged to `sessions/tasks/.new-tasks.log`
4. Task added to queue for multi-agent orchestrator

**Options after detection:**
- Let multi-agent orchestrator handle it automatically (Task 3)
- Manually start task in Claude Code: `@sessions/tasks/[filename]`

### Integration with Task Queue

The watcher feeds detected tasks into the queue manager (see `h-multi-agent-orchestration.md`):
- Tasks without context → Context Queue
- Tasks with context → Implementation Queue

## Monitoring

Check watcher status anytime:
```bash
npm run automation-status
```

Shows:
- Watcher running status
- Total tasks detected
- Recent detections (last 5)
- Queue log location

## Troubleshooting

**Watcher not detecting files:**
- Check if watcher is running: `npm run automation-status`
- Check logs: `.cursor/automation-logs/watch.log`
- Restart watcher: `pm2 restart cursor-automation`

**Files being ignored:**
- Check if file matches excluded patterns (TEMPLATE.md, done/, indexes/, archive/)
- Check `.cursor/automation-logs/detection.log` for details

**Desktop notifications not working:**
- macOS: Ensure Terminal has notification permissions
- Linux: Install `notify-send` package
- Windows: Not currently supported (uses node-notifier fallback)

## Running as Background Service

### Using PM2 (Recommended - Cross-platform)

```bash
npm install -g pm2
cd scripts
pm2 start watch-cursor-automation.js --name task-watcher
pm2 save
pm2 startup  # Follow instructions to enable on boot
```

### macOS (LaunchAgent)

Create `~/Library/LaunchAgents/com.yourname.task-watcher.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.yourname.task-watcher</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/project/scripts/watch-cursor-automation.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/task-watcher.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/task-watcher.error.log</string>
</dict>
</plist>
```

Load with:
```bash
launchctl load ~/Library/LaunchAgents/com.yourname.task-watcher.plist
```

### Linux (systemd)

Create `/etc/systemd/system/task-watcher.service`:

```ini
[Unit]
Description=Task File Watcher
After=network.target

[Service]
Type=simple
User=yourusername
WorkingDirectory=/path/to/project/scripts
ExecStart=/usr/bin/node watch-cursor-automation.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable with:
```bash
sudo systemctl enable task-watcher.service
sudo systemctl start task-watcher.service
```

## Log Files

The watcher creates three log files in `.cursor/automation-logs/`:

- **watch.log** - General watcher activity (start/stop events)
- **detection.log** - Task detection events with timestamps
- **errors.log** - Error messages and stack traces

## Excluded Files and Directories

The watcher automatically ignores:

**Files:**
- `TEMPLATE.md` - Task template file

**Directories:**
- `done/` - Completed tasks
- `indexes/` - Task indexes
- `archive/` - Archived tasks

## Next Steps

After a task is detected:
1. Check `sessions/tasks/.new-tasks.log` for new tasks
2. Let the multi-agent orchestrator handle it automatically, OR
3. Manually start task in Claude Code with `@sessions/tasks/[task-name].md`

## Advanced Configuration

### Changing Notification Behavior

Edit `scripts/watch-cursor-automation.js` and modify the `notify()` function to customize notification behavior.

### Changing Exclusion Patterns

Edit the constants at the top of `watch-cursor-automation.js`:

```javascript
const EXCLUDED_TASK_FILES = ['TEMPLATE.md'];
const EXCLUDED_TASK_DIRS = ['done', 'indexes', 'archive'];
```

### Changing Log Locations

Modify these constants in `watch-cursor-automation.js`:

```javascript
const LOGS_DIR = path.join(PROJECT_ROOT, '.cursor', 'automation-logs');
const TASK_LOG = path.join(TASKS_DIR, '.new-tasks.log');
```

## Migration from Continuous Worker

If you were using the old `agent-continuous-worker.sh` system:

1. The new watcher provides detection only (no auto-implementation)
2. Old assignment/progress JSON files are no longer used
3. Integration with multi-agent orchestrator is handled via `.new-tasks.log`
4. Desktop notifications replace console-only logging

Old files have been archived to `scripts/archive/continuous-worker/` for reference.
