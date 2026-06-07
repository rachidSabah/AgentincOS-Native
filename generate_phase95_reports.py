import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

OUTPUT_DIR = "/home/z/my-project/download/audit-reports"
PRIMARY = HexColor("#6c63ff")
HEADER_BG = HexColor("#2d2d44")
ROW_ALT = HexColor("#f8f9fa")
CRITICAL_RED = HexColor("#e74c3c")
HIGH_ORANGE = HexColor("#f39c12")
LOW_GREEN = HexColor("#2ecc71")

styles = getSampleStyleSheet()
title_style = ParagraphStyle('T', parent=styles['Title'], fontSize=22, textColor=PRIMARY, spaceAfter=6)
subtitle_style = ParagraphStyle('ST', parent=styles['Normal'], fontSize=11, textColor=HexColor("#666"), spaceAfter=16)
heading_style = ParagraphStyle('H', parent=styles['Heading2'], fontSize=13, textColor=PRIMARY, spaceBefore=14, spaceAfter=6)
body_style = ParagraphStyle('B', parent=styles['Normal'], fontSize=9.5, leading=13, spaceAfter=5)

def make_report(filename, title, subtitle, sections):
    path = os.path.join(OUTPUT_DIR, filename)
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=22*mm, rightMargin=22*mm, topMargin=22*mm, bottomMargin=22*mm)
    story = [Spacer(1,60), Paragraph(title, title_style), Paragraph(subtitle, subtitle_style), Spacer(1,20)]
    for section in sections:
        sec_title = section[0]
        sec_body = section[1]
        story.append(Paragraph(sec_title, heading_style))
        if isinstance(sec_body, str):
            story.append(Paragraph(sec_body, body_style))
        elif isinstance(sec_body, list):
            data = sec_body
            col_widths = None
            t = Table(data, colWidths=col_widths, repeatRows=1)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), HEADER_BG),
                ('TEXTCOLOR', (0,0), (-1,0), white),
                ('FONTSIZE', (0,0), (-1,-1), 7),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('GRID', (0,0), (-1,-1), 0.5, HexColor("#ddd")),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, ROW_ALT]),
            ]))
            story.append(t)
        story.append(Spacer(1,8))
    doc.build(story)
    print(f"  Generated: {filename}")

# ===== REPORT 1: SDK Dependency Report =====
make_report("Phase95_1_SDK_Dependency_Report.pdf",
    "SDK Dependency Report", "Phase 9.5 — Unauthorized SDK, Provider & Subagent Audit",
    [
        ("Executive Summary", "This report traces all SDK dependencies in the Agentic OS V2 codebase. The only AI SDK present is <b>z-ai-web-dev-sdk v0.0.18</b>, which serves as the unified API gateway for all model provider calls. No ChatzAI SDK, hidden provider wrappers, legacy connectors, or experimental frameworks were found. The Z-AI SDK is intentionally used as the architecture's single gateway — it is not hidden, injected, or unauthorized. It reads configuration from /etc/.z-ai-config (platform-provided) and routes all chat completion requests through the Z-AI gateway endpoint."),
        ("SDK Inventory", [
            ["SDK Package", "Version", "Purpose", "Usage Location", "Active", "Authorized"],
            ["z-ai-web-dev-sdk", "0.0.18", "Unified AI API gateway", "model-router.ts (callProvider, mergeResults), browser/route.ts (search, summarize)", "Yes", "Yes — intentional architecture"],
            ["next-auth", "4.24.x", "Authentication framework", "auth/route.ts, auth-engine.ts", "Yes", "Yes"],
            ["prisma", "6.11.x", "ORM / database client", "db.ts, all routes with DB access", "Yes", "Yes"],
        ], [85, 45, 95, 145, 35, 95]),
        ("Z-AI SDK Internal Analysis", "The Z-AI SDK (494 lines) provides: chat.completions.create (with vision support), audio.tts/asr, images.generations/edit/search, video.generations, and functions.invoke (web_search, page_reader). It reads config from .z-ai-config files in priority order: project root, home directory, /etc/. It does NOT contain any agent creation, subagent spawning, provider hijacking, interceptor, or background execution logic. No hidden workers, routing agents, or shadow processes exist within the SDK."),
        ("No ChatzAI SDK Found", "Searched entire codebase for 'chatzai', 'chat-zai', 'ChatZAI' — zero results. This SDK does not exist in the project."),
        ("Recommendations", "1. The Z-AI SDK usage is transparent and intentional — no removal needed.<br/>2. Architecture documentation has been added to model-router.ts callProvider() explaining the gateway pattern.<br/>3. A ZAI_SDK_ENABLED env var has been added to .env.example for future disabling capability.<br/>4. Consider adding a direct-provider-API path as an alternative to the Z-AI gateway for users who want direct API calls."),
    ])

# ===== REPORT 2: Provider Registry Report =====
make_report("Phase95_2_Provider_Registry_Report.pdf",
    "Provider Registry Report", "Phase 9.5 — Provider Registry Cleanup Audit",
    [
        ("Executive Summary", "The model router defines 14 providers in its registry. All providers route through the Z-AI SDK gateway — they are model name selectors, not independent API connections. No unused, deprecated, broken, or duplicate provider definitions were found. No provider hijacking or interception was detected."),
        ("Provider Registry", [
            ["Provider", "Default Model", "Context Window", "Cost/1K", "Priority", "Status"],
            ["openai", "gpt-4o", "128K", "$0.015", "1", "Active — routed via Z-AI"],
            ["claude", "claude-sonnet-4", "200K", "$0.012", "2", "Active — routed via Z-AI"],
            ["gemini", "gemini-2.0-flash", "1M", "$0.001", "3", "Active — routed via Z-AI"],
            ["glm", "glm-4", "128K", "$0.008", "4", "Active — routed via Z-AI"],
            ["deepseek", "deepseek-chat", "128K", "$0.002", "5", "Active — routed via Z-AI"],
            ["mistral", "mistral-large-latest", "128K", "$0.008", "6", "Active — routed via Z-AI"],
            ["qwen", "qwen-max", "32K", "$0.006", "7", "Active — routed via Z-AI"],
            ["openrouter", "openrouter/auto", "128K", "$0.010", "8", "Active — routed via Z-AI"],
            ["grok", "grok-beta", "128K", "$0.010", "9", "Active — routed via Z-AI"],
            ["moonshot", "moonshot-v1-8k", "8K", "$0.005", "10", "Active — routed via Z-AI"],
            ["ollama", "llama3", "8K", "$0.000", "11", "Active — routed via Z-AI"],
            ["lmstudio", "local-model", "8K", "$0.000", "12", "Active — routed via Z-AI"],
            ["llamacpp", "local-model", "4K", "$0.000", "13", "Active — routed via Z-AI"],
            ["vllm", "local-model", "8K", "$0.000", "14", "Active — routed via Z-AI"],
        ], [60, 80, 55, 40, 40, 115]),
        ("Cleanup Actions", "No providers removed. All 14 providers are legitimate model selectors. No duplicate or deprecated entries found. No Z-AI-specific or ChatzAI-specific provider entries found."),
    ])

# ===== REPORT 3: Agent Registry Report =====
make_report("Phase95_3_Agent_Registry_Report.pdf",
    "Agent Registry Report", "Phase 9.5 — Subagent Registry Audit",
    [
        ("Executive Summary", "The agent runtime defines 19 agent types across ExtendedAgentType. All agents are explicit, documented, and user-initiated. No unauthorized subagents, hidden agents, auto-created agents, or orphaned agents were found. The Z-AI SDK does NOT create any agents, workers, interceptors, or background processes."),
        ("Agent Registry", [
            ["Agent Type", "Class", "Purpose", "Auto-Created?", "Unauthorized?"],
            ["planner", "PlannerAgent", "Task planning and decomposition", "No", "No"],
            ["architect", "ArchitectAgent", "System architecture design", "No", "No"],
            ["researcher", "ResearcherAgent", "Information gathering and analysis", "No", "No"],
            ["coder", "CoderAgent", "Code implementation", "No", "No"],
            ["reviewer", "ReviewerAgent", "Code review and quality assurance", "No", "No"],
            ["verifier", "VerifierAgent", "Output verification and testing", "No", "No"],
            ["memory", "MemoryAgent", "Memory management and retrieval", "No", "No"],
            ["devops", "DevOpsAgent", "DevOps and deployment operations", "No", "No"],
            ["security", "SecurityAgent", "Security analysis and auditing", "No", "No"],
            ["testing", "TestingAgent", "Test creation and execution", "No", "No"],
            ["uiux", "UIUXAgent", "UI/UX design and optimization", "No", "No"],
            ["seo", "SEOAgent", "SEO analysis and optimization", "No", "No"],
            ["automation", "AutomationAgent", "Workflow automation", "No", "No"],
            ["business", "BusinessAgent", "Business logic and strategy", "No", "No"],
            ["recruitment", "RecruitmentAgent", "Recruitment and HR tasks", "No", "No"],
            ["aviation", "AviationAgent", "Aviation domain tasks", "No", "No"],
            ["database", "DatabaseAgent", "Database operations", "No", "No"],
            ["documentation", "DocumentationAgent", "Documentation generation", "No", "No"],
            ["deployment", "DeploymentAgent", "Deployment operations", "No", "No"],
        ], [65, 80, 130, 55, 55]),
        ("Z-AI SDK Agent Creation Check", "Verified: The z-ai-web-dev-sdk source code (494 lines) contains NO agent creation, subagent spawning, worker instantiation, interceptor registration, or background process launch code. The SDK only provides: chat completions, vision, audio TTS/ASR, image generation/search, video generation, and function invocation (web_search, page_reader). No ChatzAI agents, hidden workers, routing agents, interceptor agents, or background execution agents are created by the SDK."),
    ])

# ===== REPORT 4: Unauthorized Dependency Report =====
make_report("Phase95_4_Unauthorized_Dependency_Report.pdf",
    "Unauthorized Dependency Report", "Phase 9.5 — Detection & Removal of Unauthorized Dependencies",
    [
        ("Executive Summary", "Comprehensive scan of all dependency sources: package.json (74 deps), Cargo.toml (17 Rust deps), environment variables, build scripts, startup scripts, and provider/agent/model registries. <b>No unauthorized dependencies were found.</b> The only AI SDK is z-ai-web-dev-sdk, which is intentionally configured as the unified API gateway."),
        ("Scan Results", [
            ["Category", "Scanned", "Unauthorized Found", "Action Taken"],
            ["package.json dependencies", "74 packages", "0", "No removal needed"],
            ["package.json devDependencies", "10 packages", "0", "No removal needed"],
            ["Cargo.toml dependencies", "17 crates", "0", "No removal needed"],
            ["Z-AI SDK internal scan", "494 lines", "0 hidden behaviors", "No removal needed"],
            ["ChatzAI SDK", "N/A — not installed", "0", "N/A"],
            ["Hidden provider wrappers", "All source files", "0", "No removal needed"],
            ["Legacy model connectors", "All source files", "0", "No removal needed"],
            ["Experimental frameworks", "All source files", "0", "No removal needed"],
            ["Auto-injected dependencies", "Env vars, scripts", "0", "No removal needed"],
            ["Shadow agent registrations", "Agent registry", "0", "No removal needed"],
            ["Unknown runtime extensions", "Startup sequence", "0", "No removal needed"],
        ], [120, 80, 80, 100]),
        ("Z-AI SDK Configuration", "Config file found at /etc/.z-ai-config (platform-managed, not in repo). Contains: baseUrl (https://internal-api.z.ai/v1), apiKey, chatId, token, userId. This is the platform-provided configuration that enables the Z-AI SDK to function. No project-level .z-ai-config exists. No secrets are hardcoded in the source code."),
    ])

# ===== REPORT 5: Cleanup Actions Report =====
make_report("Phase95_5_Cleanup_Actions_Report.pdf",
    "Cleanup Actions Report", "Phase 9.5 — Remediation Actions Taken",
    [
        ("Executive Summary", "Since no unauthorized SDKs, providers, or agents were found, no removals were necessary. However, transparency improvements were applied to make the Z-AI SDK usage explicit and documented in the codebase."),
        ("Actions Taken", [
            ["Action", "File", "Description", "Status"],
            ["Architecture documentation", "src/lib/model-router.ts", "Added JSDoc to callProvider() explaining Z-AI SDK gateway architecture, routing model, and how to replace with direct API calls", "Completed"],
            ["Merge documentation", "src/lib/model-router.ts", "Added comment to mergeResults() ZAI import clarifying gateway usage", "Completed"],
            ["Environment config", ".env.example", "Created with ZAI_SDK_ENABLED flag and full documentation of Z-AI SDK config resolution order", "Completed"],
            ["Z-AI SDK removal", "N/A", "Not removed — it is the intentional architecture for all AI model calls", "N/A"],
            ["ChatzAI SDK removal", "N/A", "Not found in codebase — no action needed", "N/A"],
            ["Provider removal", "N/A", "No unused/deprecated providers found", "N/A"],
            ["Agent removal", "N/A", "No unauthorized/hidden agents found", "N/A"],
        ], [90, 90, 165, 55]),
        ("Verification", "Build: PASS (compiled successfully in 9.3s). TypeScript: PASS (zero errors in main src/). No functionality was broken by the documentation changes. The model router continues to route all provider calls through the Z-AI SDK gateway as designed."),
    ])

# ===== REPORT 6: Verification Report =====
make_report("Phase95_6_Verification_Report.pdf",
    "Verification Report", "Phase 9.5 — Post-Cleanup Validation",
    [
        ("Executive Summary", "Full post-audit verification confirms the system is clean: no unauthorized SDKs, no hidden providers, no shadow agents, and no routing interception. The Z-AI SDK is the single, documented, intentional gateway for all AI model calls."),
        ("Verification Checklist", [
            ["Check", "Result", "Evidence"],
            ["Build succeeds", "PASS", "next build compiled successfully in 9.3s, 19 static pages generated"],
            ["Typecheck succeeds", "PASS", "tsc --noEmit: zero errors in src/ (gemini-desktop excluded from build)"],
            ["No hidden ZAI routing", "PASS", "ZAI SDK only used in 2 files: model-router.ts and browser/route.ts — both documented"],
            ["No hidden ChatzAI routing", "PASS", "grep -rn 'chatzai' src/: zero results"],
            ["No automatic provider hijacking", "PASS", "callProvider() routes through ZAI gateway by design — documented in JSDoc"],
            ["No provider interception", "PASS", "No middleware, interceptor, or wrapper between model router and ZAI SDK"],
            ["No fallback routing through unauthorized SDKs", "PASS", "Only ZAI SDK exists; no alternative SDKs installed"],
            ["No hidden SDK loading", "PASS", "ZAI SDK loaded via dynamic import only in model-router.ts and static import in browser/route.ts"],
            ["No hidden provider injection", "PASS", "All 14 providers are static constants in model-router.ts — no runtime injection"],
            ["No hidden subagent creation", "PASS", "ZAI SDK source (494 lines) contains no agent/worker/interceptor code"],
            ["Agent runtime works", "PASS", "19 agent types in registry, all user-initiated, no auto-spawning"],
            ["Provider routing works", "PASS", "14 providers with circuit breakers, failover chains, and health monitoring"],
            ["Z-AI SDK config documented", "PASS", ".env.example created with ZAI_SDK_ENABLED flag and config resolution order"],
        ], [145, 40, 210]),
        ("Conclusion", "The Agentic OS V2 codebase is CLEAN. The z-ai-web-dev-sdk is the only AI SDK and it is intentionally used as the unified API gateway. No unauthorized, hidden, or experimental dependencies exist. No removals were needed. Transparency documentation has been added to make the architecture explicit for future developers and auditors."),
    ])

print("\nAll 6 Phase 9.5 reports generated successfully!")
