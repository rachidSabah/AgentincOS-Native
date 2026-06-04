# Task: Optimize Hermes AI Integration

## Agent: Main Agent
## Task ID: hermes-optimization

## Summary

All 7 optimizations have been implemented successfully:

### 1. Replaced ALL `execSync` with Async Functions (`/home/z/my-project/src/lib/hermes.ts`)
- Created `findHermesBinaryAsync()`, `isHermesInstalledAsync()`, `getHermesVersionAsync()`, `getHermesModelAsync()`, `isHermesProcessRunningAsync()`
- Kept sync versions as deprecated aliases for backward compatibility
- All new code uses `execFileAsync` from `child_process` with `promisify`

### 2. Added Connection Pooling and Keep-Alive
- Created `hermesHttpAgent` using Node.js `http.Agent` with keepAlive, maxSockets=10, maxFreeSockets=5
- Added `getHermesApiEndpointCached()` with 1-minute TTL cache
- Created `hermesFetch()` wrapper that uses the agent and cached endpoint
- Added `hermesFetchQueued()` with concurrency limiting (max 5 concurrent requests)

### 3. Added Retry Logic with Exponential Backoff
- Created `fetchWithRetry()` with max 3 retries, base delay 500ms
- Handles 429 (rate limit) with Retry-After header support
- Retries 5xx errors and network errors with jitter
- Does NOT retry on 4xx client errors (except 429)

### 4. Updated ALL API Routes
- `/api/hermes/detect/route.ts` — Uses async functions + latency measurement
- `/api/hermes/chat/route.ts` — Uses `hermesFetchQueued` with keep-alive and retry
- `/api/hermes/status/route.ts` — Uses async + pool + 5-second cache
- `/api/hermes/skills/route.ts` — Uses async + pool + 5-minute skill cache
- `/api/hermes/command/route.ts` — Uses async functions + retry

### 5. Added Skill Execution Endpoint
- `/api/hermes/execute/route.ts` — POST handler for skill execution
- Uses `hermesFetchQueued` with keep-alive and retry
- Supports both streaming and non-streaming responses
- Uses chat completions with tool_calls format for skill invocation

### 6. Added Kanban Task Endpoint
- `/api/hermes/kanban/route.ts` — GET/POST/PATCH handlers
- Tries Hermes API first, falls back to local in-memory store
- Supports task creation, listing, and status updates
- Syncs local state with Hermes when connected

### 7. Added MCP Server Connection
- `/api/hermes/mcp/route.ts` — GET/POST handlers
- Reads MCP config from `~/.hermes/config.yaml`
- Lists available MCP servers and their tools
- Supports connecting to MCP servers and calling tools
- Tries API first, falls back to CLI

### 8. Added SSE Stream Endpoint
- `/api/hermes/stream/route.ts` — Server-Sent Events endpoint
- Sends `hermes:status` events every 5 seconds
- Sends `hermes:latency` events every 15 seconds
- Includes keep-alive pings every 30 seconds

### 9. Updated Store with New State
- Added `sseConnectionStatus`, `setSSEConnectionStatus`
- Added `skillExecutions`, `addSkillExecution`, `updateSkillExecution`
- Added `mcpServers`, `setMCPServers`
- Added `hermesLatencyHistory`, `addHermesLatency`
- Extended `HermesConnection` with `skillCount`, `activeSessions`, `mcpServerCount`

### 10. Updated Dashboard UI
- `useHermesDetection` hook now:
  - Fetches skills, MCP servers, and status in parallel on connection
  - Connects to SSE stream when Hermes is running
  - Auto-measures latency every 15 seconds
  - Tracks latency history
- `HermesConnectionBanner` now shows:
  - Latency badge with color coding (green <100ms, yellow <500ms, red >500ms)
  - Skills count, Sessions count, MCP servers count
- Added `HermesQuickActions` component with:
  - "Run Research" button
  - "Create Task" button
  - Top skill execution buttons

### 11. Updated Mission Control
- Added latency indicator and SSE status badge to workspace header
- Added "Quick Skills" action bar with top 4 skills + "+ Task" button
- Skills execute via `/api/hermes/execute` endpoint
- Kanban tasks create via `/api/hermes/kanban` endpoint

## Verification
- Lint passes: `bun run lint` → no errors
- All API endpoints tested and returning correct responses
- Dev server running without compilation errors
