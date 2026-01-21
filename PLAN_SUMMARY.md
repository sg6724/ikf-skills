# IKF Agent Skills Platform - Plan Summary

*Last Updated: Jan 21, 2026*

---

## Vision

Build an internal AI skills playground where:
- **Skills** are filesystem-based, discoverable via tools
- **Agent profiles** define domain expertise (AGENTS.md files)
- **Single harness agent** assumes profiles dynamically (no multi-agent delegation)
- **Sandboxing** (Bubblewrap) secures all execution (future)

---

## Core Concepts

### Skills (`skills/`)
Self-contained instruction packages on the filesystem:
```
skills/
├── social-media/
│   ├── hygiene-check/
│   │   ├── SKILL.md           # Instructions
│   │   └── references/        # Checklists, templates
│   ├── content-strategy/
│   └── ...
├── performance-marketing/
│   └── ...
└── general/
    └── docxmaker/             # Shared utilities
```

Each skill has a `SKILL.md` with YAML frontmatter (name, description) and detailed process instructions.

### Agent Profiles (`agents/`)
Domain expert personas the harness can assume:
```
agents/
├── social-media/
│   └── AGENTS.md              # Profile + workflow
└── performance-marketing/
    └── AGENTS.md              # Profile + workflow
```

Each profile has:
- YAML frontmatter (name, description, keywords, skills_dirs)
- Domain expertise and voice
- Workflow instructions
- Quality standards

### Role-Playing Architecture
**Key Insight**: Multi-agent delegation fragments context. Single-agent role-playing preserves it.

Instead of:
```
Harness → delegate → Sub-Agent (loses context, shortcuts)
```

We do:
```
Harness → load profile → "become" expert → execute fully
```

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     HARNESS AGENT                           │
│  • Discovers agent profiles from agents/                    │
│  • Assumes profile by loading AGENTS.md                     │
│  • Executes skills sequentially with full context           │
└─────────────────────────────────────────────────────────────┘
         │                                     │
         ▼                                     ▼
┌───────────────┐                    ┌───────────────┐
│ agents/       │                    │ skills/       │
│ social-media/ │                    │ social-media/ │
│ perf-mktg/    │                    │ perf-mktg/    │
└───────────────┘                    └───────────────┘
```

### Tools (Consolidated in `src/agents/harness/tools/`)
| Tool | Purpose |
|------|---------|
| `discover_agents()` | List available profiles |
| `get_agent_profile(name)` | Load full profile |
| `discover_skills()` | List available skills |
| `get_skill_instructions(name)` | Load skill process |
| `get_skill_reference(name, path)` | Load templates |
| `web_search_using_tavily(query)` | Web research |
| `extract_url_content(url)` | Get page content |
| `generate_word_document(...)` | Create .docx files |

---

## What Works ✅

1. **Agent discovery** - `discover_agents()` finds profiles with frontmatter
2. **Skill discovery** - `discover_skills()` finds all skills across domains
3. **Profile loading** - `get_agent_profile()` loads full AGENTS.md
4. **Unified context** - Single agent maintains full conversation history
5. **No code for new agents** - Just add AGENTS.md file

## Benefits Over Previous Architecture

| Previous (Multi-Agent) | Current (Role-Playing) |
|------------------------|------------------------|
| Context fragmented | Context unified |
| Sub-agents shortcut tasks | Full workflow execution |
| N agent.py files | 1 agent.py + N profiles |
| Code changes for new agents | Just add AGENTS.md |

---

## Files

### Created
| File | Purpose |
|------|---------|
| `agents/social-media/AGENTS.md` | Social media profile |
| `agents/performance-marketing/AGENTS.md` | Perf marketing profile |
| `src/agents/harness/tools/__init__.py` | Tools package |
| `src/agents/harness/tools/discover_agents.py` | Agent discovery |
| `src/agents/harness/tools/discover_skills.py` | Skill discovery |
| `src/agents/harness/tools/tavily_search.py` | Web search |
| `src/agents/harness/tools/generate_document.py` | Doc generation |

### Modified
| File | Change |
|------|--------|
| `src/agents/harness/agent.py` | Rewritten as role-playing agent |

### Deleted
| File | Reason |
|------|--------|
| `src/agents/social_media/` | Behavior moved to AGENTS.md |
| `src/agents/performance_marketing/` | Behavior moved to AGENTS.md |

---

## Next Steps

**Testing:**
1. Run harness agent with multi-step task
2. Verify both steps are completed (not just last one)

**Future (from sandbox plan):**
1. Move `agents/` and `skills/` to `/var/ikf-*/` 
2. Add Bubblewrap sandboxing
3. Enable meta-agent skill creation

---

## Related Documents

- [Sandbox Plan Summary](sandbox_plan_summary.md) - Bubblewrap sandboxing phases
