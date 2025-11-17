# Cursor Extensions & Workflow Recommendations

Based on your multi-agent orchestration setup, documentation-heavy workflow, and GitHub integration patterns.

---

## 🔌 Essential Extensions

### Code Quality & Linting
- **ESLint** (`dbaeumer.vscode-eslint`) - You already have ESLint hooks, but the extension provides real-time feedback
- **Prettier** (`esbenp.prettier-vscode`) - Auto-formatting that works with your existing hooks
- **Error Lens** (`usernamehw.errorlens`) - Inline error/warning display (reduces context switching)

### Git & GitHub Workflow
- **GitLens** (`eamodio.gitlens`) - Enhanced Git capabilities, blame annotations, commit history
  - **Why**: Your handoff workflow relies heavily on Git branches/PRs. GitLens helps track changes across agent handoffs
- **GitHub Pull Requests** (`GitHub.vscode-pull-request-github`) - Native PR management in Cursor
  - **Why**: You're creating PRs for handoffs. This lets you review/merge without leaving the editor
- **Git Graph** (`mhutchie.git-graph`) - Visual branch visualization
  - **Why**: Your multi-branch workflow (feature branches, handoffs) benefits from visual branch tracking

### Documentation & Markdown
- **Markdown All in One** (`yzhang.markdown-all-in-one`) - Enhanced markdown editing
  - **Why**: You have extensive docs (3-tier model, handoffs, protocols). This adds TOC generation, preview, etc.
- **Markdown Preview Enhanced** (`shd101wyy.markdown-preview-enhanced`) - Advanced markdown preview
  - **Why**: Better rendering for your structured docs with YAML frontmatter
- **YAML** (`redhat.vscode-yaml`) - YAML syntax support and validation
  - **Why**: Your handoff entries use YAML format. This validates schema and provides autocomplete

### AI & Automation
- **GitHub Copilot** (if not already using) - Complements Cursor's AI
- **Cursor Rules** (built-in) - You're already using `.cursor/rules/` - consider organizing into subdirectories by domain

### Project Management
- **Todo Tree** (`Gruntfuggly.todo-tree`) - Visual TODO/FIXME/XXX tracking
  - **Why**: Your tasks use TODO markers. This surfaces them across the codebase
- **Project Manager** (`alefragnani.project-manager`) - Quick project switching
  - **Why**: If you work across multiple repos with similar setups

---

## 🛠️ Workflow Enhancements

### 1. Cursor Settings Optimization

Add to `.vscode/settings.json` (or workspace settings):

```json
{
  // File associations for your custom formats
  "files.associations": {
    "*.mdc": "markdown",
    "*.plan.md": "markdown"
  },
  
  // Markdown settings for your docs
  "markdown.preview.breaks": true,
  "markdown.preview.linkify": true,
  
  // YAML settings for handoff files
  "yaml.schemas": {
    "file:///Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express/docs/agent_bridge_protocol.md": [
      "docs/ai_handoffs.md"
    ]
  },
  
  // Git settings
  "git.enableSmartCommit": true,
  "git.confirmSync": false,
  "git.autofetch": true,
  
  // File watcher exclusions (performance)
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.git/**": true,
    "**/sessions/sessions-state.json": true
  },
  
  // Editor settings
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  
  // Search exclusions
  "search.exclude": {
    "**/node_modules": true,
    "**/sessions/sessions-state.json": true,
    "**/.cursor/plans": true
  }
}
```

### 2. Keyboard Shortcuts for Common Workflows

Add to `.vscode/keybindings.json`:

```json
[
  {
    "key": "cmd+shift+h",
    "command": "workbench.action.findInFiles",
    "args": {
      "query": "",
      "filesToInclude": "docs/ai_handoffs.md"
    }
  },
  {
    "key": "cmd+shift+t",
    "command": "workbench.action.findInFiles",
    "args": {
      "query": "",
      "filesToInclude": "sessions/tasks/**/*.md"
    }
  },
  {
    "key": "cmd+shift+g",
    "command": "gitlens.showCommitSearch"
  }
]
```

### 3. Snippets for Handoff Entries

Create `.vscode/handoff-snippet.code-snippets`:

```json
{
  "Handoff Entry": {
    "prefix": "handoff",
    "body": [
      "```yaml",
      "schema_version: \"1.0\"",
      "timestamp: ${1:ISO-8601}",
      "from: ${2:cursor|claude}",
      "to: ${3:claude|cursor}",
      "issue_id: ${4:<GitHub Issue number or \"none\">}",
      "branch: ${5:<current branch>}",
      "completed:",
      "  - ${6:<completed task>}",
      "next:",
      "  - ${7:<next action>}",
      "context_files:",
      "  - ${8:<path>}",
      "```"
    ],
    "description": "Create a handoff entry"
  }
}
```

### 4. Task File Templates

Create `.vscode/task-template.code-snippets`:

```json
{
  "CC-Sessions Task": {
    "prefix": "cctask",
    "body": [
      "---",
      "name: ${1:task-name}",
      "branch: ${2:feature/branch-name}",
      "status: ${3:open}",
      "created: ${4:YYYY-MM-DD}",
      "---",
      "",
      "# ${1:task-name}",
      "",
      "## Description",
      "${5:Task description}",
      "",
      "## Success Criteria",
      "- [ ] ${6:Criterion 1}",
      "",
      "## Context Manifest",
      "${7:<!-- Populated by context-gathering agent -->}",
      ""
    ],
    "description": "Create a cc-sessions task manifest"
  }
}
```

---

## 🔄 MCP Server Recommendations

### Already Configured
- ✅ `localdocs` - Documentation provider

### Additional MCPs to Consider

1. **GitHub MCP** (you're already using via tools)
   - Consider adding more GitHub-specific MCPs for:
     - Issue templates
     - PR templates
     - Release notes generation

2. **File System MCP**
   - For better file operations across your complex directory structure

3. **Postman MCP** (mentioned in your CURSOR.md)
   - If you're testing APIs, this would be valuable

---

## 📋 Workspace-Specific Recommendations

### 1. Create a Cursor Workspace File

Create `claude-chaos-express.code-workspace`:

```json
{
  "folders": [
    {
      "path": ".",
      "name": "Claude Chaos Express"
    }
  ],
  "settings": {
    "files.exclude": {
      "**/node_modules": true,
      "**/.git": true
    },
    "search.exclude": {
      "**/node_modules": true,
      "**/sessions/sessions-state.json": true
    }
  },
  "extensions": {
    "recommendations": [
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode",
      "usernamehw.errorlens",
      "eamodio.gitlens",
      "GitHub.vscode-pull-request-github",
      "yzhang.markdown-all-in-one",
      "redhat.vscode-yaml",
      "Gruntfuggly.todo-tree"
    ]
  }
}
```

### 2. Organize Cursor Rules

Your `.cursor/rules/` directory could benefit from organization:

```
.cursor/rules/
  ├── cursor-agent-operating-spec.mdc (existing)
  ├── git-workflow.mdc (extract Git-specific rules)
  ├── documentation.mdc (extract doc-specific rules)
  └── handoffs.mdc (extract handoff-specific rules)
```

This makes rules more maintainable and allows domain-specific rule sets.

### 3. Create Quick Access Commands

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Open Handoff Log",
      "type": "shell",
      "command": "code docs/ai_handoffs.md",
      "problemMatcher": []
    },
    {
      "label": "Validate Handoffs",
      "type": "shell",
      "command": "./scripts/validate-handoffs.sh",
      "problemMatcher": []
    },
    {
      "label": "List Open Tasks",
      "type": "shell",
      "command": "ls -1 sessions/tasks/*.md | grep -E '^[hml]'",
      "problemMatcher": []
    }
  ]
}
```

---

## 🎯 Workflow Automation Ideas

### 1. Pre-Commit Hook Enhancement

Your existing hooks are comprehensive. Consider adding:

- **Handoff validation** - Ensure handoff entries are valid YAML before commit
- **Task reference check** - Verify referenced tasks exist
- **Branch name validation** - Enforce `feature/<issue-id>-name` pattern

### 2. Cursor Cloud Agent Triggers

You have Cloud Agents configured. Consider:

- **Auto-handoff on branch push** - Trigger a Cloud Agent to validate handoff completeness
- **PR template auto-fill** - Use Cloud Agent to populate PR description from handoff entry
- **Task status sync** - Update task status when PR is merged

### 3. Quick Actions via Command Palette

Create custom commands for:
- "Create Handoff Entry" - Opens template with current branch/issue pre-filled
- "Open Related Task" - Finds task file from current branch name
- "Validate Current Handoff" - Runs validation on most recent handoff

---

## 📊 Monitoring & Observability

### 1. Extension: Output Colorizer
- **Output Colorizer** (`IBM.output-colorizer`) - Colorize terminal output
  - **Why**: Your hooks generate a lot of output. Colorization helps parse it

### 2. Extension: Better Comments
- **Better Comments** (`aaron-bond.better-comments`) - Highlight TODO/FIXME/etc.
  - **Why**: Your tasks use TODO markers. This makes them more visible

---

## 🔐 Security & Best Practices

### 1. Extension: Secret Scanner
- **git-secret** or similar - Scan for accidentally committed secrets
  - **Why**: You're working with API keys (Cursor API, GitHub tokens)

### 2. Extension: Dependency Review
- **Dependency Review** (`github.vscode-pull-request-github`) - Review dependency changes in PRs
  - **Why**: Part of your PR workflow

---

## 🚀 Performance Optimizations

### 1. File Watcher Exclusions
Already mentioned in settings, but ensure:
- `sessions/sessions-state.json` is excluded (changes frequently)
- `.cursor/plans/` is excluded (temporary files)
- Large generated files are excluded

### 2. Search Indexing
- Exclude `node_modules`, `.git`, generated files from search
- Use `.cursorignore` for Cursor-specific exclusions

---

## 📝 Documentation Workflow

### 1. Markdown Linting
- **markdownlint** (`DavidAnson.vscode-markdownlint`) - Lint your markdown files
  - **Why**: Your docs are critical. Consistent formatting helps

### 2. Spell Checker
- **Code Spell Checker** (`streetsidesoftware.code-spell-checker`) - Spell check in code/docs
  - **Why**: Professional docs benefit from spell checking

---

## 🎨 UI/UX Enhancements

### 1. Theme
- **One Dark Pro** or **GitHub Theme** - Better syntax highlighting
  - **Why**: You're reading a lot of code/docs. Good themes reduce eye strain

### 2. Icons
- **Material Icon Theme** (`PKief.material-icon-theme`) - Better file type icons
  - **Why**: Your complex directory structure benefits from visual organization

---

## 🔗 Integration Ideas

### 1. Linear Integration (if you use Linear)
- You mentioned Linear in your automation strategy. Consider:
  - Linear MCP server
  - Linear extension for Cursor

### 2. Slack/Discord Notifications
- For handoff completions, PR merges, etc.
- Could be triggered via Cloud Agents

---

## 📌 Priority Recommendations

**High Priority (Immediate Value):**
1. GitLens - Essential for your Git-heavy workflow
2. Markdown All in One - You write a lot of docs
3. YAML extension - Your handoffs use YAML
4. Error Lens - Reduces context switching

**Medium Priority (Nice to Have):**
5. GitHub Pull Requests extension - Streamlines PR workflow
6. Todo Tree - Surfaces TODOs across codebase
7. Better Comments - Highlights task markers
8. Workspace file with extension recommendations

**Low Priority (Optimization):**
9. Custom snippets for handoffs/tasks
10. Custom tasks for common operations
11. Theme/icons for better visual organization

---

## 🧪 Testing Recommendations

Since you have a complex setup, consider:

1. **Test Explorer** - If you add more tests
2. **REST Client** - For testing your API endpoints (if any)
3. **Thunder Client** - Alternative to Postman for API testing

---

## 📚 Learning Resources

- **Cursor Documentation** - Keep up with new Cursor features
- **MCP Documentation** - Explore new MCP servers as they're released
- **GitHub Actions** - You're using Actions; stay updated on new features

---

## 🔄 Maintenance

### Regular Tasks
- Review and update extension recommendations quarterly
- Clean up `.cursor/plans/` periodically (temporary files)
- Audit Cloud Agent configurations monthly
- Review handoff patterns for optimization opportunities

---

*Last updated: 2025-01-20*
*Based on analysis of your current workflow and codebase structure*

