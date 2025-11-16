<!-- 78b42223-2175-4663-a57d-a5e65ce14785 25067dde-6aa4-4f6a-a3a5-c5165a2dbffd -->
# Spec: Agent Registry → Skill Rules Integration

#### 1. Goals & Non-Goals

- **Goals**
- Automatically enrich `skill-rules.json` with keywords/intents derived from `repo_state/agent-registry.json` so relevant skills trigger more often when talking about existing agents/automations.
- Keep runtime overhead minimal: no per-message scanning of the registry; changes are applied via a fast, explicit generator.
- Preserve hand-crafted trigger tuning while adding registry-driven context in a controlled, inspectable way.
- **Non-goals**
- Do not change DAIC enforcement or write-gating semantics.
- Do not introduce dynamic, per-request modification of skill rules.
- Do not attempt full semantic intent detection from registry descriptions (stay with keyword + simple pattern generation).

#### 2. High-Level Design

- **Core idea**: Introduce a build-time (or on-demand) generator that reads `agent-registry.json` and produces an augmented skill rules artifact that cc-sessions uses, instead of wiring the registry directly into runtime skill dispatch.
- **Artifacts**
- Input: `repo_state/agent-registry.json` (already validated by `agent-registry-schema.json`).
- Input: `.claude/skills/skill-rules.json` (treated as the human-authored base rules).
- Output: `.claude/skills/skill-rules.generated.json` (base rules + registry-driven augmentations).
- **Runtime usage**
- cc-sessions continues to load `skill-rules.json` by default.
- A small hook or config change (implemented later) can point it to `skill-rules.generated.json` once the pipeline is stable.
- If the generated file is missing or invalid, the system falls back to the base `skill-rules.json`.

#### 3. Data Model & Mapping

- **From registry entries** (`repo_state/agent-registry.json`)
- Fields used:
- `agents[].id` — canonical machine identifier (`code-review-expert`, `service-documentation`, `doc-sync`).
- `agents[].name` — display name, usually similar to `id` but may differ.
- `agents[].type` — `claude` or `cloud`.
- `agents[].category` — e.g. `framework`, `automation`, `general`.
- `agents[].automationCandidate` — boolean indicating automation priority.
- `agents[].trigger`, `agents[].schedule`, `agents[].webhookEvent` for Cloud agents.
- Derived keywords/intents:
- Direct agent references: `"code-review-expert"`, `"doc-sync"`, `"debt-scanner"`.
- Role/category phrases: `"documentation agent"`, `"automation"`, `"cloud agent"`, `"scheduled chore"`, `"PR reviewer"`.
- Trigger phrases for Cloud agents: `"on pull request"`, `"on push"`, `"weekly chore"`, `"monthly check"`.
- **To skill rules entries** (`skills.*` in `skill-rules.json`)
- Primary targets:
- `skills.code-review-trigger` — code review related agents (category `general` / `code-quality`, id `code-review-expert`, linked Cloud agents like `review-bot`).
- `skills.testing-trigger` — test-runner style agents if you extend registry categories.
- New **automation-oriented skill(s)** (to be created later by Claude): e.g. `cloud-automation-trigger` that reacts when user talks about chores, scheduled agents, or Cloud automations.
- Augmentation rules:
- For each registry agent, compute a set of keywords and optionally intent regexes.
- Inject these into a dedicated `registryKeywords` / `registryIntentPatterns` block under the chosen skills to keep them separable from hand-authored `promptTriggers.keywords`.

#### 4. Generator Behavior

- **Location & interface**
- New script (or subcommand) under `scripts/` (Node.js, consistent with `scripts/agent-registry.js`).
- Canonical entrypoint: `node scripts/agent-registry.js generate-skill-rules` or a dedicated `scripts/generate-skill-rules.js`.
- Behavior:
- Read and validate `repo_state/agent-registry.json` (re-use existing Ajv setup where possible).
- Read `.claude/skills/skill-rules.json`.
- Produce `.claude/skills/skill-rules.generated.json` with merged content.
- **Merging strategy**
- Never mutate the original `skill-rules.json` on disk.
- For each skill you augment:
- Keep existing `promptTriggers.keywords` and `promptTriggers.intentPatterns` untouched.
- Add a new sibling object, e.g.:
- `registryTriggers: { keywords: [...], intentPatterns: [...] }`.
- At runtime, Claude skills loader can treat:
- `effectiveKeywords = keywords ∪ registryTriggers.keywords`.
- `effectiveIntentPatterns = intentPatterns ∪ registryTriggers.intentPatterns`.
- **Filtering & thresholds**
- Only include agents that meet at least one of:
- `automationCandidate === true`.
- `type === "cloud"`.
- `category` in a whitelist (`["general", "framework", "automation", "testing", "documentation"]`).
- Avoid exploding the keyword space:
- Hard cap on generated keywords per skill (e.g. max 25–40 per skill).
- De-duplicate and normalize (lowercase, trim).

#### 5. Example Mapping (Conceptual)

- **Registry entries** (simplified view)
- `code-review-expert` (claude, category `general`, automationCandidate: true).
- `review-bot` (cloud, trigger: `webhook`, webhookEvent: `pull_request`).
- **Augmented `code-review-trigger` skill** (conceptually)
- Existing keywords: `"review code"`, `"code review"`, ...
- Registry-derived:
- `registryTriggers.keywords`: `"code-review-expert"`, `"review-bot"`, `"PR review bot"`, `"cloud code review"`.
- `registryTriggers.intentPatterns`: `"(run|trigger).*review-bot"`, `"use.*code-review-expert"`.

#### 6. Performance & Scaling Considerations

- **Runtime cost**
- No per-request registry scanning: all heavy work happens when the generator is run.
- cc-sessions reads a single JSON file (`skill-rules.generated.json`), same as today.
- **Build-time cost**
- Generator complexity is linear in number of agents and skills.
- With ~50–100 agents and 20–40 relevant skills, generation should remain sub‑second.
- **Change propagation**
- When the agent registry changes (new agents, renamed, new cloud configs):
- Run `generate-skill-rules` locally or in CI as part of a “registry updated” workflow.
- The generated file is committed alongside registry changes, so behavior is reproducible per commit.

#### 7. Edge Cases & Safety

- **Invalid registry**
- If Ajv validation fails, the generator should:
- Exit non‑zero.
- Not overwrite `skill-rules.generated.json`.
- Claude continues using the last good generated file or the base `skill-rules.json`.
- **Conflicting or noisy agents**
- Avoid adding very generic keywords that conflict with existing intent (e.g. just `"review"`, `"test"`).
- For any agent whose `id` or `name` is too generic, skip derived keywords or require an explicit allowlist in the generator.
- **Backwards compatibility**
- If `registryTriggers` is absent for a skill, behavior is identical to current `skill-rules.json`.
- The loader logic can be rolled out separately and fall back to `promptTriggers` only.

#### 8. Handoff to Claude Code

- **Task for Claude**
- Implement the generator script and, optionally, the small change in the skill loader that merges `registryTriggers` with existing triggers.
- **Key files for Claude to read**
- `repo_state/agent-registry.json` / `repo_state/agent-registry-schema.json` — registry structure and current contents.
- `scripts/agent-registry.js` — existing Ajv wiring and CLI patterns.
- `.claude/skills/skill-rules.json` — base skill trigger configuration.
- **Acceptance criteria**
- A single command (e.g. `node scripts/agent-registry.js generate-skill-rules`) produces a valid `.claude/skills/skill-rules.generated.json`.
- Generated file meaningfully increases trigger coverage for at least:
- Code review agents (Claude + Cloud).
- Documentation automation (`service-documentation` + `doc-sync`).
- Other automation candidates flagged in the registry.
- cc-sessions (in a later change) can be configured to use the generated file without breaking existing workflows.

### To-dos

- [ ] Define the exact CLI entrypoint for the generator (new subcommand vs new script) and how it discovers registry + base skill rules.
- [ ] Specify precise mapping from agent fields (id, type, category, trigger) to registryTriggers.keywords and registryTriggers.intentPatterns for each target skill.
- [ ] List test cases and scenarios Claude should implement to validate that generated rules improve triggering without causing noisy over-triggering.