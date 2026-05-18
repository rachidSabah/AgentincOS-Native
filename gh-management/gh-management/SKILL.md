---
name: gh-management
description: Manage GitHub repositories, issues, and pull requests using the gh CLI. Use when you need to list, view, create, or modify GitHub-specific resources like issues, PRs, and repository metadata.
---

# GitHub Management

This skill enables the agent to interact with GitHub using the GitHub CLI (`gh`).

## Prerequisites

- GitHub CLI (`gh`) installed.
- Authenticated via `gh auth login`.

## Workflow

1. **Verify Authentication**: Run `gh auth status` to ensure you have access.
2. **Context Gathering**: 
   - Use `gh repo list` to see available repositories.
   - Use `gh issue list --repo <repo>` or `gh pr list --repo <repo>` to see active items.
3. **Execution**:
   - **View Details**: `gh issue view <number> --repo <repo>` or `gh pr view <number> --repo <repo>`.
   - **Create Issue**: `gh issue create --repo <repo> --title "<title>" --body "<body>"`.
   - **Create PR**: `gh pr create --repo <repo> --title "<title>" --body "<body>" --base main --head <branch>`.
4. **Validation**: Confirm the action by checking the output URL or using a list command.

## Tips

- Use `--json` flags (e.g., `gh issue view 1 --json title,body`) for structured data if raw text is too verbose.
- For local git operations (commit, push, branch), use `git` directly.
