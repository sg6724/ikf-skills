# Agent Skills Playground - Sandbox Implementation Plan

## Vision
Build an internal agent skills platform where:
1. Skills live in a **shared filesystem** (not bundled in codebase)
2. Agents use **bash commands** to explore and execute skills
3. **Meta-agent** can create new skills dynamically
4. All bash execution is **sandboxed** using Bubblewrap

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Meta Agent                           │
│  • Routes tasks to domain agents                        │
│  • Creates skills dynamically                           │
│  • Orchestrates multi-agent workflows                   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              Domain Agents (Social Media, etc.)         │
│  • Execute skills via sandboxed bash commands           │
│  • Access shared filesystem read-only                   │
│  • Write results to isolated workspaces                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  Bubblewrap Sandbox                     │
│  • Isolates filesystem access                           │
│  • Prevents network access                              │
│  • Blocks privilege escalation                          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                 Shared Filesystem                       │
│  /var/ikf-skills/          (read-only for agents)       │
│  /var/ikf-workspaces/      (read-write per user)        │
└─────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Filesystem-Based Skills (Local Dev)
**Goal:** Move skills from codebase to local filesystem

**Steps:**
1. Create `/var/ikf-skills/` directory structure
2. Move `skills/` → `/var/ikf-skills/`
3. Update agents to use bash commands instead of `LocalSkills`:
   - Replace `get_skill_instructions()` tool
   - Use `cat /var/ikf-skills/{domain}/{skill}/SKILL.md`
4. Test: Verify agents can read skills via filesystem

**Storage:** Local filesystem (`/var/ikf-skills/`)

---

### Phase 2: Bubblewrap Sandboxing
**Goal:** Secure all bash command execution

**Steps:**
1. Install Bubblewrap (Linux only - use Docker/VM on macOS)
2. Create Python sandbox wrapper:
   ```python
   def run_sandboxed(command: str) -> str:
       # Wrap command in bwrap with proper isolation
   ```
3. Integrate with agent's shell tool execution
4. Define sandbox policy:
   - Skills: Read-only (`--ro-bind /var/ikf-skills /skills`)
   - Workspace: Read-write (`--bind /var/ikf-workspaces/user-{id} /workspace`)
   - Network: Disabled (`--unshare-net`)
5. Test: Verify agent cannot escape sandbox

**Security:** Bubblewrap namespace isolation

---

### Phase 3: Cloud Storage (Production)
**Goal:** Share skills across multiple servers

**Steps:**
1. Create S3 bucket: `ikf-skills-production`
2. Install `s3fs-fuse` on servers
3. Mount S3 to `/var/ikf-skills/`:
   ```bash
   s3fs ikf-skills-production /var/ikf-skills
   ```
4. Agents use same bash commands (transparent)
5. Implement sync workflow:
   - Dev: Local `/var/ikf-skills/`
   - Prod: S3-backed `/var/ikf-skills/`

**Storage:** Amazon S3 + s3fs-fuse

---

### Phase 4: Meta-Agent & Skill Creation
**Goal:** Dynamic skill creation and orchestration

**Steps:**
1. Build meta-agent with:
   - Task intake & clarification
   - Domain routing logic
   - Skill creation capability (write to `/var/ikf-skills/`)
2. Create skill template generator
3. Build playground UI:
   - Skill browser
   - Skill editor
   - Test runner
4. Implement agent registry for routing

**Workflow:**
```
User: "Analyze competitor pricing"
Meta: "No pricing-analysis skill found. Creating..."
      [Writes to /var/ikf-skills/competitive-intel/pricing-analysis/]
      "Routing to Competitive Intel Agent..."
```

---

## Key Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Sandboxing** | Bubblewrap | Isolate bash command execution |
| **Local Storage** | Local filesystem | Development environment |
| **Cloud Storage** | S3 + s3fs-fuse | Production multi-server access |
| **Agent Framework** | Agno | Agent orchestration & tools |
| **Bash Tools** | ShellTools | Execute commands in sandbox |

---

## Security Model

### Sandbox Boundaries
- **Skills:** Read-only access via `--ro-bind`
- **Workspace:** Isolated per-user via `--bind`
- **Network:** Disabled by default via `--unshare-net`
- **Processes:** Isolated via `--unshare-pid`

### Defense-in-Depth
1. Bubblewrap namespace isolation
2. Non-root user execution
3. Resource limits (future: cgroups)
4. Audit logging
5. For untrusted code: Consider microVMs

---

## Next Actions

**Immediate (When Ready):**
1. Review `bubblewrap_sandbox_guide.md` for technical details
2. Decide: Linux VM for dev or wait for prod server?
3. Start Phase 1: Move skills to filesystem

**Future:**
1. Design meta-agent prompting strategy
2. Build playground UI mockups
3. Define skill creation templates
