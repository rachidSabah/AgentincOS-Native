---
name: agent-autonomy-kit
description: Stop waiting for prompts and keep working. This kit turns an agent into a self-directed worker that continuously makes progress on tasks by pulling from a persistent queue.
---

# Agent Autonomy Kit

**Stop waiting for prompts. Keep working.**

Most AI agents sit idle between human messages. This kit turns your agent into a self-directed worker that continuously makes progress on meaningful tasks by pulling from a persistent queue and operating on a heartbeat/cron schedule.

## Quick Start

1. **Create the Queue:** Create a file at `tasks/QUEUE.md` with sections for Ready, In Progress, Blocked, and Done.
2. **Configure Heartbeat:** Update your `HEARTBEAT.md` template to pull from the queue and perform work.
3. **Set Up Cron:** Add cron jobs for overnight work, morning kickoffs, and daily reports.
4. **Watch Work Happen:** The agent will now work without needing a human prompt.

## Core Concepts

### 1. The Task Queue (Queue-First Enforcement)
Instead of waiting for prompts, agents pull from a persistent task queue. 
**CRITICAL:** The Autonomy Kit enforces queue-first execution. If `HIGH` or `CRITICAL` priority tasks exist in the queue, the agent **CANNOT** skip them to work on other things.

**Location:** `tasks/QUEUE.md`

```markdown
# Task Queue

## Ready (can be picked up)
- [ ] [HIGH] Research competitor X pricing
- [ ] Write blog post draft on memory systems

## In Progress
- [ ] @agent: Building autonomy skill

## Blocked
- [ ] Deploy to production (needs: Approval)

## Done Today
- [x] Memory system shipped
```

**Rules:**
- Any agent can pick up a "Ready" task.
- Mark yourself when you start: `@agentname: task`.
- Move to Done when complete.
- Add new tasks as you discover them.

### 2. Queue Checker Script (Enforcement)
The queue checker script enforces queue-first execution programmatically.
Every heartbeat runs the script. It scans `tasks/QUEUE.md` for `HIGH`/`CRITICAL` tasks.

## Automation Triggers (Cron Examples)

**Daily Progress Report (10 PM):**
`openclaw cron add --name "Daily Progress Report" --cron "0 22 * * *" --message "Generate daily progress report. Read tasks/QUEUE.md for completed tasks."`

**Morning Kickoff (7 AM):**
`openclaw cron add --name "Morning Kickoff" --cron "0 7 * * *" --system-event "Morning kickoff: Review task queue, pick top priorities."`

## Related Kits
- `agent-memory`: Provides the structured memory patterns this kit builds on.
- `agent-team`: Coordinates multiple autonomous agents working together.
