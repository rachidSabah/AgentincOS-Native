---
name: self-improvement
description: Log learnings, errors, and user corrections to markdown files for persistent project memory. Use when an operation fails, when the user provides a correction, or when a best practice is discovered for the current project.
---

# Self-Improvement

This skill helps maintain a persistent memory of errors and learnings within a project to avoid repeating mistakes.

## Logging Guidelines

1. **Errors**: If a command or tool fails unexpectedly, log it to `.learnings/ERRORS.md`.
2. **Corrections**: If the user says "No, that's wrong" or "Do it this way", log it to `.learnings/LEARNINGS.md`.
3. **Best Practices**: If you find an efficient way to do something specific to this project, log it to `.learnings/LEARNINGS.md`.

## Setup

If the `.learnings` directory doesn't exist, create it:
`mkdir -p .learnings`

## File Structure

- `.learnings/LEARNINGS.md`: For general learnings, corrections, and best practices.
- `.learnings/ERRORS.md`: For tool failures and environment issues.

## Entry Format

- `Timestamp`: ISO 8601
- `Context`: Brief description of what was happening.
- `Learning/Error`: What happened and what should be done differently next time.
- `Status`: Open, Investigating, or Resolved.

## Promotion

If a pattern occurs frequently, consider promoting the learning to `GEMINI.md` (if it exists) or the project's root instructions.
