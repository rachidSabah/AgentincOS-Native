---
Task ID: 1
Agent: Main Agent
Task: Restore front page with Claude/OpenClaw/Hermes hero cards and add SEO silo

Work Log:
- Read and analyzed the full project structure (Next.js 16 + Tailwind + Zustand)
- Created AgentHeroCards component with large prominent cards for Claude, OpenClaw, Hermes, and Self Vault on the front page
- Each hero card features: agent icon, name, layer badge, status indicator, description, feature list, metrics (uptime/latency/requests), tags, and "Open Control Room" CTA
- Created SEOSilo component with 4 layer sections (Intelligence, Execution, Research, Self), each with descriptions, keywords, and breadcrumb navigation
- Updated front page (mission-control view) to include: QuickStats → AgentHeroCards → SystemMonitor + NetworkTopology → SEOSilo → LogStream + LatencyGraph
- Added breadcrumbs to all inner views (stack-overview, layer-* views, self-* views) for SEO silo navigation hierarchy
- Enhanced layout.tsx with comprehensive SEO metadata: title, description, keywords, Open Graph, Twitter Cards, canonical URL, JSON-LD structured data for all 4 layers
- Added accessibility: aria-labels, semantic HTML (section, article, nav, main), role attributes
- Verified build succeeds with `npx next build`
- Verified dev server renders all components correctly with `curl localhost:3000`

Stage Summary:
- Front page now prominently displays Claude, OpenClaw, Hermes, and Self Vault as large hero cards
- SEO silo structure added: JSON-LD structured data, Open Graph, Twitter Cards, breadcrumbs, keyword taxonomy
- Goldie Mission Stack layers remain on inner pages only (sidebar navigation)
- All builds pass successfully
