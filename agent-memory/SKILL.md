---
name: agent-memory
description: Persistent memory system for AI agents. Remember facts, learn from experience, and track entities across sessions using MEMORY.md and episodic daily logs.
---

# AgentMemory Skill

Persistent memory system for AI agents. Remember facts, learn from experience, and track entities across sessions.

## Overview

AgentMemory provides a structured way for agents to store and retrieve information that should persist beyond a single conversation. It uses a combination of a central `MEMORY.md` file for high-level facts and a `memory/` directory for detailed daily logs and entity tracking.

## When to Use

- **Starting a session:** Load relevant context from memory to understand the current state and user preferences.
- **After conversations:** Store important facts, decisions, and outcomes to ensure they are available next time.
- **After failures:** Record lessons learned and "what not to do" to prevent repeating mistakes.
- **Meeting new people/projects:** Track individuals, organizations, and project details as entities.

## Core Components

### 1. MEMORY.md
The "Long-Term Memory" file. This should be kept concise and contains:
- User preferences and identity.
- Active project priorities.
- High-level architectural decisions.
- Critical "Never Do" rules learned from past errors.

### 2. Daily Logs (`memory/YYYY-MM-DD.md`)
The "Episodic Memory." These files contain:
- Summaries of specific tasks completed.
- Key decisions made during the day.
- Links to relevant files or commits.
- Handover notes for the next session.

### 3. Entity Tracking (`memory/entities/`)
Detailed profiles for:
- **People:** Roles, communication styles, and past interactions.
- **Projects:** Goals, tech stacks, and repository locations.
- **Tools:** Custom configurations or quirks of specific CLI tools.

## Best Practices

- **Distillation:** Don't dump raw transcripts into memory. Summarize the *intent* and the *outcome*.
- **Pruning:** Periodically review `MEMORY.md` to remove outdated information and keep the context window lean.
- **Search First:** Before starting a complex task, use `grep` or `search` on the `memory/` directory to see if similar tasks have been performed before.
- **Atomic Writes:** Update memory immediately after a significant event or decision while the context is fresh.
