# Claude-Cursor Agent Alignment Strategy

**Purpose:** Define strategy for keeping Claude Code and Cursor Agent systems aligned, especially regarding agent definitions and use cases.

**Created:** 2025-01-20
**Task:** h-align-claude-cursor-systems

---

## Core Principle

**Claude Code subagents and Cursor Cloud Agents are COMPLEMENTARY systems, not competing ones.**

- **Claude subagents:** Local, specialized, deep integration with cc-sessions
- **Cursor Cloud Agents:** Cloud-based, automation-focused, repository-wide operations

Both systems should be documented, mapped, and synchronized to avoid confusion and duplication.

<!-- AUTO-GENERATED:START:registry-reference -->
**Source of Truth:** All Claude agent definitions are maintained in `repo_state/agent-registry.json`. Use `node scripts/agent-registry.js sync` to update the registry from `.claude/agents/` changes.

*Last updated: 2025-11-17T00:29:55.208Z | Registry version 1.0.0*
<!-- AUTO-GENERATED:END:registry-reference -->

---

## Agent Mapping: Claude → Cursor Cloud Agent Candidates

<!-- AUTO-GENERATED:START:agent-mapping -->
### High-Potential Automation Candidates

*Source: `repo_state/agent-registry.json` (automationCandidate === true)*

| Claude Agent | Category | Cloud Agent Use Case | Trigger | File |
|---|---|---|---|---|
| **code-review-expert** | general | [Manual: TBD] | [Manual: TBD] | `.claude/agents/code-review-expert.md` |
| **service-documentation** | uncategorized | [Manual: TBD] | [Manual: TBD] | `.claude/agents/service-documentation.md` |

**Note:** Cloud Agent use cases and triggers are maintained manually. Agent definitions are sourced from the registry.

*Last updated: 2025-11-17T00:29:55.208Z | Auto-generated from `repo_state/agent-registry.json` (v1.0.0)*
<!-- AUTO-GENERATED:END:agent-mapping -->

### High-Potential Automation Candidates (Manual Reference)

These Claude agents have strong potential for Cursor Cloud Agent equivalents for automation use cases:

| Claude Agent | Cloud Agent Use Case | Trigger | Benefit |
|-------------|---------------------|---------|---------|
| **service-documentation** | Automated doc sync across repos | Scheduled (weekly) | Keep docs current without manual intervention |
| **check-code-debt** | Scheduled technical debt reports | Scheduled (monthly) | Proactive debt tracking |
| **check-accessibility** | PR-triggered accessibility audits | PR webhook | Catch issues before merge |
| **check-modern-code** | Automated API modernization detection | Scheduled (quarterly) | Identify outdated patterns |
| **commit-changes** | Automated commit message generation | PR creation | Consistent commit messages |
| **code-review-expert** | Automated code review on PRs | PR webhook | Immediate feedback |

### Conditional Automation Candidates

These could benefit from Cloud Agents under specific conditions:

| Claude Agent | When Cloud Agent Makes Sense | When Claude is Better |
|-------------|------------------------------|----------------------|
| **test-runner** | CI/CD integration, scheduled runs | Interactive debugging, local dev |
| **build-project** | Automated build validation | Local iterative development |
| **refactoring-expert** | Large-scale refactors across repos | Focused, complex refactors |
| **linting-expert** | PR-triggered lint enforcement | Local pre-commit checks |

### Claude-Only Agents

These agents are **NOT** candidates for Cloud Agent equivalents due to their nature:

- **context-gathering** - Requires interactive task setup
- **context-refinement** - Requires cc-sessions state
- **logging** - Deeply integrated with cc-sessions
- **oracle** - Requires multi-step strategic reasoning
- **research-expert** - Requires iterative research and synthesis
- **triage-expert** - Requires interactive diagnosis
- **typescript-type-expert** - Requires deep, focused analysis
- **code-analyzer** - Requires tracing logic flow interactively

**Reason:** These require cc-sessions integration, interactive workflow, or deep specialized reasoning that doesn't fit automation use cases.

---

## Agent Synchronization Process

### When Adding New Claude Agent

1. **Create agent file** in `.claude/agents/[category]/[agent-name].md`
2. **Document in audit** - Update `docs/agent-system-audit.md` with category and purpose
3. **Evaluate automation potential:**
   - Could this benefit from Cloud Agent equivalent?
   - What would trigger the Cloud Agent? (scheduled, webhook, manual)
   - What's the automation value? (time savings, consistency, coverage)
4. **Update this mapping** if Cloud Agent candidate identified
5. **Document decision** in `context/decisions.md` with rationale

### When Creating Cursor Cloud Agent

1. **Document purpose** in GitHub Issue or task manifest
2. **Reference Claude equivalent** (if exists) with comparison of use cases
3. **Define trigger** (scheduled, webhook, manual API call)
4. **Track agent ID** for monitoring and follow-up
5. **Log outcomes** in PR comments or `docs/ai_handoffs.md`
6. **Update this mapping** with learned patterns

### Template: Agent Purpose Documentation

When documenting agents (Claude or Cloud), use this template:

```markdown
# [Agent Name]

**Type:** [Claude Subagent | Cursor Cloud Agent]
**Category:** [Build Tools | Code Quality | Testing | etc.]
**Created:** YYYY-MM-DD

## Purpose

[1-2 sentence description of what this agent does]

## Use Cases

### Primary Use Cases
- [Use case 1]
- [Use case 2]
- [Use case 3]

### When NOT to Use
- [Anti-pattern 1]
- [Anti-pattern 2]

## Capabilities

[What the agent can do, tools available, specializations]

## Complementary Agents

**Claude Agents:** [List related Claude agents]
**Cloud Agents:** [List related Cloud Agent use cases, if applicable]

## Automation Potential

[For Claude agents: Could this be automated with Cloud Agent?]
[For Cloud agents: What Claude agent provides interactive equivalent?]

## Examples

[Real-world examples of using this agent]

## Related Documentation

- [Link to agent audit]
- [Link to relevant SoT]
- [Link to related tasks/issues]
```

---

## Decision Framework: Claude vs Cloud Agent

### Use Claude Subagent When:

✓ Task requires **deep specialized knowledge** (TypeScript types, React perf, database optimization)
✓ Part of **local development workflow** (code review, testing, refactoring)
✓ Needs **cc-sessions DAIC integration** (task manifests, state tracking)
✓ Requires **multi-step reasoning** (research, triage, strategic decisions)
✓ **Interactive** work with human in the loop
✓ Needs access to **local state** or **task context**

### Use Cursor Cloud Agent When:

✓ Task is **repository-wide** or **multi-repository**
✓ Can run **asynchronously** in the background
✓ Benefits from **CI/CD integration** (PR webhooks, automated checks)
✓ Should run on a **schedule** (nightly, weekly, monthly)
✓ Requires **programmatic API** integration
✓ Can **auto-create PRs** upon completion
✓ Benefits from **webhook notifications** for status changes

### Use BOTH When:

✓ Claude for **local prototyping**, Cloud for **scaled application**
✓ Claude for **deep analysis**, Cloud for **applying fixes**
✓ Claude for **research**, Cloud for **implementation**
✓ Claude for **triage**, Cloud for **remediation**

---

## Maintenance Procedures

### Quarterly Agent Review

Every quarter, review agent usage:

1. **Usage patterns:** Which Claude agents are used most/least?
2. **Automation opportunities:** Are there new Cloud Agent candidates?
3. **Redundancy check:** Are any agents duplicating functionality?
4. **Documentation drift:** Is agent documentation current?
5. **Update audit:** Reflect changes in `docs/agent-system-audit.md`

### Agent Deprecation Process

If an agent should be deprecated:

1. **Document reason** in `context/decisions.md`
2. **Mark as deprecated** in agent file frontmatter
3. **Suggest alternative** (other agent or Cloud Agent)
4. **Grace period:** 30 days before removal
5. **Archive** in `.claude/agents/archive/` (don't delete)
6. **Update audit** to reflect deprecation

### Agent Addition Checklist

Before adding a new agent:

- [ ] Check if functionality already exists in another agent
- [ ] Consider if Cloud Agent would be more appropriate
- [ ] Define clear use cases and anti-patterns
- [ ] Document in `docs/agent-system-audit.md`
- [ ] Add to appropriate category in `.claude/agents/`
- [ ] Evaluate automation potential for Cloud Agent equivalent
- [ ] Update this alignment document if needed

---

## Alignment Validation

### Regular Checks (Monthly)

- [ ] All Claude agents are documented in audit
- [ ] Automation candidates are evaluated for Cloud Agent potential
- [ ] Agent purposes are clear and non-overlapping
- [ ] Documentation matches actual agent capabilities
- [ ] Usage patterns inform future agent development

### Drift Detection (Automated)

The drift detection mechanism (to be created) should check:

- Agent files exist that aren't documented in audit
- Audit documents agents that don't exist
- Agent descriptions don't match file frontmatter
- Usage patterns suggest redundancy or gaps

---

## Future Enhancements

### When Cursor Cloud Agents Add MCP Support

Potential new integrations:

1. **Shared Knowledge** - Cloud Agents could access same knowledge bases as Claude
2. **Tool Integration** - Cloud Agents could use GitHub, Postman, etc. via MCP
3. **Hybrid Workflows** - Seamless handoff between local and cloud
4. **Context Sharing** - Cloud Agents could read task manifests and state

### Agent Communication Protocol

Future possibility: Define protocol for agents to communicate:

- Claude agent identifies pattern, suggests Cloud Agent run
- Cloud Agent completes work, notifies Claude agent of results
- Bidirectional handoff with structured metadata

---

## Real-World Usage Patterns

### Pattern 1: Local Review → Cloud Enforcement

**Scenario:** Enforce coding standards across organization

1. **Develop locally:** Use `code-review-expert` (Claude) to refine standards
2. **Document patterns:** Capture in coding guidelines
3. **Automate enforcement:** Launch Cloud Agent on all PRs to check standards
4. **Iterate:** Cloud Agent findings inform Claude agent improvements

### Pattern 2: Research → Scale

**Scenario:** Apply best practice across codebase

1. **Research:** Use `research-expert` (Claude) to investigate best practices
2. **Prototype:** Use specialized Claude agent to implement in one file
3. **Validate:** Test and refine locally
4. **Scale:** Launch Cloud Agent to apply across entire codebase
5. **Review:** Use Claude agent to review Cloud Agent's changes

### Pattern 3: Detection → Remediation

**Scenario:** Find and fix technical debt

1. **Scheduled scan:** Cloud Agent runs `check-code-debt` pattern monthly
2. **Report:** Cloud Agent creates Issues for findings
3. **Triage:** Use `triage-expert` (Claude) to prioritize Issues
4. **Fix:** Use specialized Claude agents for complex fixes
5. **Simple fixes:** Launch Cloud Agent to apply simple/repetitive fixes

---

## Related Documentation

- `docs/agent-system-audit.md` - Complete agent catalog and comparison
- `docs/sot-reference-map.md` - SoT file references
- `.claude/agents/` - All Claude subagent definitions
- Cursor Cloud Agents API: https://cursor.com/docs/cloud-agent/api/endpoints
- `sessions/tasks/h-align-claude-cursor-systems.md` - Alignment task

---

## Changelog

### 2025-01-20
- Initial agent alignment strategy created
- Mapped Claude agents to Cloud Agent automation candidates
- Defined agent synchronization process
- Created agent purpose documentation template
- Established decision framework for choosing between systems
- Documented maintenance procedures and validation checks
- Identified real-world usage patterns
