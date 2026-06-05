---
name: deep-browser
description: Advanced web browsing and long-context synthesis skill. Use when you need to bypass anti-bot protections, render SPAs, scrape multiple URLs, and synthesize technical reports or cross-reference large amounts of web data.
---

# Deep Browser (Kimi-Class Synthesis)

This skill provides advanced scraping logic and semantic processing rules for long-context research tasks.

## 1. Web Extraction (The "Hands")

To read modern websites (Vue/React SPAs, heavy JavaScript), use the provided Node.js script, which relies on Playwright for headless automation and Mozilla's Readability for boilerplate removal.

**Prerequisites:**
The workspace must have these dependencies installed (or you can install them dynamically if missing):
`npm install playwright @mozilla/readability jsdom turndown`

**Usage:**
```bash
node scripts/fetch_clean.mjs "https://example1.com" "https://example2.com" > output.json
```
*This script automatically spoofs the webdriver signature, waits for network idle, and strips navigation/ads.*

## 2. Long-Context Synthesis (The "Brain")

When processing the scraped output of massive or multiple documents, follow these Kimi-style strategies to avoid the "lost-in-the-middle" effect:

### A. Semantic Chunking & Ingestion
Instead of reading 100 pages top-to-bottom simultaneously:
1.  **Late Chunking:** Read the raw markdown, focusing on section headers (`##`) to understand the document's structure first.
2.  **Semantic Grouping:** Mentally group text by thematic cohesion (e.g., "Pricing features," "Technical architecture") rather than arbitrary line counts.

### B. Cross-Referencing Protocol
When comparing data across 5+ web pages:
1.  **Thematic Anchors:** Identify the core dimensions of comparison (e.g., Cost, Security, API Support).
2.  **Parallel Extraction:** Scan each document chunk specifically for those thematic anchors.
3.  **Citation:** Every claim in the final synthesis *must* be cited using a footnote syntax linked to the original URL (e.g., "[1] According to the Cloudflare docs...").

### C. Output Generation
- **Lossless Context:** If writing a comprehensive audit, start with a high-level executive summary, followed by a detailed matrix or table comparing the specific entities.
- **Agent Swarm Logic:** If the task is too broad, divide the research into sub-queries, gather the results, and then write the final synthesis.
