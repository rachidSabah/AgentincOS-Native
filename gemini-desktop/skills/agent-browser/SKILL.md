---
name: agent-browser
description: Browser automation CLI for AI agents. Use when the user needs to interact with websites, including navigating pages, filling forms, clicking buttons, taking screenshots, extracting data, testing web apps, or automating any browser task. Triggers include requests to "open a website", "fill out a form", "click a button", "take a screenshot", "scrape data from a page", "test this web app", "login to a site", "automate browser actions", or any task requiring programmatic web interaction. Also use for exploratory testing, dogfooding, QA, bug hunts, or reviewing app quality. Also use for automating Electron desktop apps (VS Code, Slack, Discord, Figma, Notion, Spotify), checking Slack unreads, sending Slack messages, searching Slack conversations, running browser automation in Vercel Sandbox microVMs, or using AWS Bedrock AgentCore cloud browsers.
allowed-tools: Bash(agent-browser:*), Bash(npx agent-browser:*)
---

# agent-browser

Fast browser automation CLI for AI agents. Chrome/Chromium via CDP with
accessibility-tree snapshots and compact `@eN` element refs.

Install: `npm i -g agent-browser && agent-browser install`

## Start here

Before running any `agent-browser` command, load the actual workflow content from the CLI:

```bash
agent-browser skills get core             # start here — workflows, common patterns, troubleshooting
agent-browser skills get core --full      # include full command reference and templates
```

## Specialized skills

Load a specialized skill when the task falls outside browser web pages:

```bash
agent-browser skills get electron          # Electron desktop apps (VS Code, Slack, Discord, Figma, ...)
agent-browser skills get slack             # Slack workspace automation
agent-browser skills get dogfood           # Exploratory testing / QA / bug hunts
agent-browser skills get vercel-sandbox    # agent-browser inside Vercel Sandbox microVMs
agent-browser skills get agentcore         # AWS Bedrock AgentCore cloud browsers
```

## Quick Start Commands

```bash
agent-browser open example.com
agent-browser snapshot --interactive        # Get interactive elements with @eN refs
agent-browser click @e2                     # Click element by ref
agent-browser fill @e3 "test@example.com"   # Fill input by ref
agent-browser screenshot page.png
agent-browser close
```

## Core Commands

```bash
agent-browser open <url>              # Navigate to URL
agent-browser click <selector>        # Click element
agent-browser fill <selector> <text>  # Clear and fill input
agent-browser type <selector> <text>  # Type into element
agent-browser snapshot                # Full accessibility tree
agent-browser snapshot -i             # Interactive elements only
agent-browser screenshot [path]       # Take screenshot
agent-browser get text <selector>     # Get text content
agent-browser get url                 # Get current URL
agent-browser get title               # Get page title
agent-browser scroll <dir> [px]       # Scroll page
agent-browser press <key>             # Press key (Enter, Tab, etc.)
agent-browser hover <selector>        # Hover element
agent-browser select <sel> <val>      # Select dropdown option
agent-browser back                    # Go back
agent-browser reload                  # Reload page
agent-browser close                   # Close browser
```

## Why agent-browser

- Fast native Rust CLI, not a Node.js wrapper
- Works with any AI agent
- Chrome/Chromium via CDP with no Playwright or Puppeteer dependency
- Accessibility-tree snapshots with element refs for reliable interaction
- Sessions, authentication vault, state persistence, video recording
