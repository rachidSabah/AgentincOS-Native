---
name: tavily-search
description: AI-optimized web search and content extraction using the Tavily API. Use when you need high-quality search results, real-time data, or clean Markdown content from web pages.
---

# Tavily Search

This skill provides advanced web search capabilities optimized for AI agents.

## Prerequisites

- Tavily API Key.
- Set environment variable: `TAVILY_API_KEY`.

## Usage

### Web Search
For general queries, news, or technical research:
- `tavily_search(query, search_depth="advanced", max_results=5)`

### Content Extraction
To get clean Markdown from specific URLs (useful for reading documentation or articles):
- `tavily_extract(urls=[url1, url2])`

## Guidelines

1. **Depth**: Use `search_depth="advanced"` for complex technical or academic topics.
2. **Efficiency**: Use `tavily_search` first to get snippets. Only use `tavily_extract` if the snippets are insufficient.
3. **Filtering**: Use `include_domains` to focus on trusted sources (e.g., `github.com`, `stackoverflow.com`).
4. **Recency**: Use `time_range="day"` or `"week"` for breaking news.
