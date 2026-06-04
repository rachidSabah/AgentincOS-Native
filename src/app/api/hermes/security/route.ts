import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SecurityRule {
  id: string;
  name: string;
  type: "injection" | "pii" | "access" | "rate";
  action: "block" | "warn" | "log";
  pattern?: string;
  description: string;
  enabled: boolean;
}

interface AuditEntry {
  id: string;
  timestamp: number;
  type: "injection" | "pii" | "access" | "rate" | "scan";
  severity: "critical" | "high" | "medium" | "low" | "info";
  source: string;
  action: "blocked" | "warned" | "logged";
  details: string;
  matchedPattern?: string;
  agentId?: string;
}

interface ScanResult {
  safe: boolean;
  threats: {
    type: "injection" | "pii" | "malicious";
    severity: "critical" | "high" | "medium" | "low";
    match: string;
    pattern: string;
    position: number;
  }[];
  riskScore: number;
  recommendations: string[];
}

interface SecurityStatus {
  lastScan: number | null;
  threatsFound: number;
  riskScore: number;
  piiLeaksDetected: number;
  injectionAttempts: number;
  rulesActive: number;
  auditLogSize: number;
}

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

const auditLog: AuditEntry[] = [];
const MAX_AUDIT_ENTRIES = 200;

const securityRules = new Map<string, SecurityRule>();

let totalThreats = 0;
let totalPiiLeaks = 0;
let totalInjectionAttempts = 0;
let lastScanTime: number | null = null;

// ---------------------------------------------------------------------------
// Default security rules
// ---------------------------------------------------------------------------

const DEFAULT_RULES: SecurityRule[] = [
  {
    id: "rule_injection_1",
    name: "Prompt Injection — Ignore Instructions",
    type: "injection",
    action: "block",
    pattern: "ignore previous instructions",
    description: "Blocks attempts to override system instructions",
    enabled: true,
  },
  {
    id: "rule_injection_2",
    name: "Prompt Injection — Disregard Training",
    type: "injection",
    action: "block",
    pattern: "disregard your training",
    description: "Blocks attempts to make the model disregard training",
    enabled: true,
  },
  {
    id: "rule_injection_3",
    name: "Prompt Injection — Persona Override",
    type: "injection",
    action: "block",
    pattern: "you are now",
    description: "Blocks attempts to override the model persona",
    enabled: true,
  },
  {
    id: "rule_injection_4",
    name: "Prompt Injection — System Prefix",
    type: "injection",
    action: "warn",
    pattern: "system:",
    description: "Warns on attempts to inject system-level commands",
    enabled: true,
  },
  {
    id: "rule_injection_5",
    name: "Prompt Injection — Jailbreak",
    type: "injection",
    action: "block",
    pattern: "jailbreak",
    description: "Blocks jailbreak attempts",
    enabled: true,
  },
  {
    id: "rule_injection_6",
    name: "Prompt Injection — DAN Mode",
    type: "injection",
    action: "block",
    pattern: "DAN mode",
    description: "Blocks DAN mode activation attempts",
    enabled: true,
  },
  {
    id: "rule_pii_ssn",
    name: "PII — Social Security Number",
    type: "pii",
    action: "warn",
    pattern: "\\d{3}-\\d{2}-\\d{4}",
    description: "Detects SSN patterns (XXX-XX-XXXX)",
    enabled: true,
  },
  {
    id: "rule_pii_cc",
    name: "PII — Credit Card Number",
    type: "pii",
    action: "block",
    pattern: "\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}",
    description: "Detects credit card number patterns",
    enabled: true,
  },
  {
    id: "rule_pii_apikey",
    name: "PII — API Keys",
    type: "pii",
    action: "block",
    pattern: "(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|key-[a-zA-Z0-9]{20,})",
    description: "Detects exposed API keys (OpenAI, GitHub, generic)",
    enabled: true,
  },
  {
    id: "rule_pii_email",
    name: "PII — Email Addresses",
    type: "pii",
    action: "log",
    pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
    description: "Logs email addresses found in outputs",
    enabled: true,
  },
];

// Initialize default rules
for (const rule of DEFAULT_RULES) {
  securityRules.set(rule.id, rule);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function addAuditEntry(entry: Omit<AuditEntry, "id" | "timestamp">): void {
  const full: AuditEntry = {
    id: generateId(),
    timestamp: Date.now(),
    ...entry,
  };
  auditLog.push(full);
  if (auditLog.length > MAX_AUDIT_ENTRIES) {
    auditLog.splice(0, auditLog.length - MAX_AUDIT_ENTRIES);
  }
}

function calculateRiskScore(): number {
  let score = 0;

  // Recent threats add to risk
  const oneHourAgo = Date.now() - 3600_000;
  const recentAudit = auditLog.filter((e) => e.timestamp > oneHourAgo);

  for (const entry of recentAudit) {
    switch (entry.severity) {
      case "critical":
        score += 15;
        break;
      case "high":
        score += 10;
        break;
      case "medium":
        score += 5;
        break;
      case "low":
        score += 2;
        break;
      case "info":
        score += 1;
        break;
    }
  }

  return Math.min(100, score);
}

function scanForInjection(content: string): ScanResult["threats"] {
  const threats: ScanResult["threats"] = [];
  const lower = content.toLowerCase();

  const injectionPatterns = [
    { pattern: "ignore previous instructions", severity: "critical" as const },
    { pattern: "disregard your training", severity: "critical" as const },
    { pattern: "you are now", severity: "high" as const },
    { pattern: "system:", severity: "high" as const },
    { pattern: "jailbreak", severity: "critical" as const },
    { pattern: "DAN mode", severity: "critical" as const },
  ];

  const enabledInjectionRules = Array.from(securityRules.values()).filter(
    (r) => r.enabled && r.type === "injection",
  );

  for (const { pattern, severity } of injectionPatterns) {
    const rule = enabledInjectionRules.find((r) => r.pattern === pattern);
    if (!rule) continue;

    const idx = lower.indexOf(pattern.toLowerCase());
    if (idx !== -1) {
      threats.push({
        type: "injection",
        severity,
        match: content.slice(idx, idx + pattern.length),
        pattern,
        position: idx,
      });
    }
  }

  return threats;
}

function scanForPII(content: string): ScanResult["threats"] {
  const threats: ScanResult["threats"] = [];

  // SSN: XXX-XX-XXXX
  const ssnRule = securityRules.get("rule_pii_ssn");
  if (ssnRule?.enabled) {
    const ssnMatch = content.match(/\d{3}-\d{2}-\d{4}/g);
    if (ssnMatch) {
      for (const m of ssnMatch) {
        threats.push({
          type: "pii",
          severity: "high",
          match: m,
          pattern: "SSN (XXX-XX-XXXX)",
          position: content.indexOf(m),
        });
      }
    }
  }

  // Credit card
  const ccRule = securityRules.get("rule_pii_cc");
  if (ccRule?.enabled) {
    const ccMatch = content.match(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g);
    if (ccMatch) {
      for (const m of ccMatch) {
        threats.push({
          type: "pii",
          severity: "critical",
          match: m,
          pattern: "Credit Card",
          position: content.indexOf(m),
        });
      }
    }
  }

  // API keys
  const apiRule = securityRules.get("rule_pii_apikey");
  if (apiRule?.enabled) {
    const apiMatch = content.match(
      /sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|key-[a-zA-Z0-9]{20,}/g,
    );
    if (apiMatch) {
      for (const m of apiMatch) {
        threats.push({
          type: "pii",
          severity: "critical",
          match: m.slice(0, 8) + "..." + "[REDACTED]",
          pattern: "API Key",
          position: content.indexOf(m),
        });
      }
    }
  }

  return threats;
}

function scanForOutputPII(content: string): ScanResult["threats"] {
  const threats: ScanResult["threats"] = [];

  // Same PII checks as input but also email
  threats.push(...scanForPII(content));

  // Email in output
  const emailRule = securityRules.get("rule_pii_email");
  if (emailRule?.enabled) {
    const emailMatch = content.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    );
    if (emailMatch) {
      for (const m of emailMatch) {
        threats.push({
          type: "pii",
          severity: "medium",
          match: m,
          pattern: "Email Address",
          position: content.indexOf(m),
        });
      }
    }
  }

  return threats;
}

function computeScanRiskScore(threats: ScanResult["threats"]): number {
  if (threats.length === 0) return 0;

  let score = 0;
  for (const t of threats) {
    switch (t.severity) {
      case "critical":
        score += 30;
        break;
      case "high":
        score += 20;
        break;
      case "medium":
        score += 10;
        break;
      case "low":
        score += 5;
        break;
    }
  }
  return Math.min(100, score);
}

function getRecommendations(threats: ScanResult["threats"]): string[] {
  if (threats.length === 0) return ["Content appears safe. No threats detected."];

  const recs: string[] = [];
  const types = new Set(threats.map((t) => t.type));

  if (types.has("injection")) {
    recs.push(
      "Prompt injection detected. Consider sanitizing input or rejecting the request.",
    );
    recs.push(
      "Implement additional input validation layers before processing.",
    );
  }
  if (types.has("pii")) {
    recs.push(
      "PII detected. Ensure data is redacted before storing or transmitting.",
    );
    recs.push(
      "Review data handling policies and apply appropriate access controls.",
    );
  }

  const criticalCount = threats.filter((t) => t.severity === "critical").length;
  if (criticalCount > 0) {
    recs.unshift(
      `⚠ ${criticalCount} critical threat(s) found — immediate review required.`,
    );
  }

  return recs;
}

// ---------------------------------------------------------------------------
// GET — Return security status
// ---------------------------------------------------------------------------

export async function GET() {
  const status: SecurityStatus = {
    lastScan: lastScanTime,
    threatsFound: totalThreats,
    riskScore: calculateRiskScore(),
    piiLeaksDetected: totalPiiLeaks,
    injectionAttempts: totalInjectionAttempts,
    rulesActive: Array.from(securityRules.values()).filter(
      (r) => r.enabled,
    ).length,
    auditLogSize: auditLog.length,
  };

  return NextResponse.json({
    status,
    rules: Array.from(securityRules.values()),
    recentThreats: auditLog
      .filter((e) => e.severity === "critical" || e.severity === "high")
      .slice(-10),
  });
}

// ---------------------------------------------------------------------------
// POST — Security operations
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const action = body.action as string | undefined;

  if (!action) {
    return NextResponse.json(
      { error: "Missing 'action' field" },
      { status: 400 },
    );
  }

  switch (action) {
    case "scan-input":
      return handleScanInput(body);
    case "scan-output":
      return handleScanOutput(body);
    case "audit-log":
      return handleAuditLog();
    case "set-rules":
      return handleSetRules(body);
    case "report":
      return handleReport();
    default:
      return NextResponse.json(
        {
          error: `Unknown action '${action}'. Valid: scan-input, scan-output, audit-log, set-rules, report`,
        },
        { status: 400 },
      );
  }
}

// ---------------------------------------------------------------------------
// scan-input — Scan for prompt injection, PII, malicious patterns
// ---------------------------------------------------------------------------

function handleScanInput(
  body: Record<string, unknown>,
): NextResponse {
  const { content, source } = body;

  if (!content || typeof content !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'content'" },
      { status: 400 },
    );
  }

  if (!source || typeof source !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'source'" },
      { status: 400 },
    );
  }

  lastScanTime = Date.now();

  const injectionThreats = scanForInjection(content);
  const piiThreats = scanForPII(content);
  const threats = [...injectionThreats, ...piiThreats];

  const riskScore = computeScanRiskScore(threats);
  const recommendations = getRecommendations(threats);

  // Update counters
  if (injectionThreats.length > 0) {
    totalInjectionAttempts += injectionThreats.length;
  }
  if (piiThreats.length > 0) {
    totalPiiLeaks += piiThreats.length;
  }
  if (threats.length > 0) {
    totalThreats += threats.length;
  }

  // Determine action based on rules
  let scanAction: "blocked" | "warned" | "logged" = "logged";
  for (const threat of threats) {
    const matchingRule = Array.from(securityRules.values()).find(
      (r) =>
        r.enabled &&
        ((threat.type === "injection" && r.type === "injection") ||
          (threat.type === "pii" && r.type === "pii")),
    );
    if (matchingRule?.action === "block") {
      scanAction = "blocked";
      break;
    }
    if (matchingRule?.action === "warn" && scanAction !== "blocked") {
      scanAction = "warned";
    }
  }

  // Log to audit
  if (threats.length > 0) {
    for (const threat of threats) {
      addAuditEntry({
        type: threat.type === "pii" ? "pii" : "injection",
        severity: threat.severity,
        source,
        action: scanAction,
        details: `Detected ${threat.type}: "${threat.match}" via pattern "${threat.pattern}"`,
        matchedPattern: threat.pattern,
      });
    }
  } else {
    addAuditEntry({
      type: "scan",
      severity: "info",
      source,
      action: "logged",
      details: "Input scan completed — no threats detected",
    });
  }

  const result: ScanResult = {
    safe: threats.length === 0,
    threats,
    riskScore,
    recommendations,
  };

  return NextResponse.json({
    ...result,
    action: scanAction,
    scannedAt: lastScanTime,
  });
}

// ---------------------------------------------------------------------------
// scan-output — Scan for PII leaks, sensitive data in outputs
// ---------------------------------------------------------------------------

function handleScanOutput(
  body: Record<string, unknown>,
): NextResponse {
  const { content, agentId } = body;

  if (!content || typeof content !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'content'" },
      { status: 400 },
    );
  }

  if (!agentId || typeof agentId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'agentId'" },
      { status: 400 },
    );
  }

  lastScanTime = Date.now();

  const piiThreats = scanForOutputPII(content);
  const riskScore = computeScanRiskScore(piiThreats);
  const recommendations = getRecommendations(piiThreats);

  if (piiThreats.length > 0) {
    totalPiiLeaks += piiThreats.length;
    totalThreats += piiThreats.length;
  }

  let scanAction: "blocked" | "warned" | "logged" = "logged";
  for (const threat of piiThreats) {
    const matchingRule = Array.from(securityRules.values()).find(
      (r) => r.enabled && r.type === "pii" && r.pattern === threat.pattern,
    );
    if (!matchingRule) continue;
    if (matchingRule.action === "block") {
      scanAction = "blocked";
      break;
    }
    if (matchingRule.action === "warn" && scanAction !== "blocked") {
      scanAction = "warned";
    }
  }

  if (piiThreats.length > 0) {
    for (const threat of piiThreats) {
      addAuditEntry({
        type: "pii",
        severity: threat.severity,
        source: `agent:${agentId}`,
        action: scanAction,
        details: `Output PII leak: "${threat.match}" via pattern "${threat.pattern}"`,
        matchedPattern: threat.pattern,
        agentId,
      });
    }
  } else {
    addAuditEntry({
      type: "scan",
      severity: "info",
      source: `agent:${agentId}`,
      action: "logged",
      details: "Output scan completed — no PII leaks detected",
      agentId,
    });
  }

  const result: ScanResult = {
    safe: piiThreats.length === 0,
    threats: piiThreats,
    riskScore,
    recommendations,
  };

  return NextResponse.json({
    ...result,
    action: scanAction,
    scannedAt: lastScanTime,
  });
}

// ---------------------------------------------------------------------------
// audit-log — Return recent security audit entries
// ---------------------------------------------------------------------------

function handleAuditLog(): NextResponse {
  return NextResponse.json({
    entries: auditLog.slice(-100),
    total: auditLog.length,
    summary: {
      critical: auditLog.filter((e) => e.severity === "critical").length,
      high: auditLog.filter((e) => e.severity === "high").length,
      medium: auditLog.filter((e) => e.severity === "medium").length,
      low: auditLog.filter((e) => e.severity === "low").length,
      info: auditLog.filter((e) => e.severity === "info").length,
      blocked: auditLog.filter((e) => e.action === "blocked").length,
      warned: auditLog.filter((e) => e.action === "warned").length,
    },
  });
}

// ---------------------------------------------------------------------------
// set-rules — Configure security rules
// ---------------------------------------------------------------------------

function handleSetRules(
  body: Record<string, unknown>,
): NextResponse {
  const { rules } = body;

  if (!Array.isArray(rules)) {
    return NextResponse.json(
      { error: "Missing or invalid 'rules' — must be an array" },
      { status: 400 },
    );
  }

  const updated: SecurityRule[] = [];
  const errors: string[] = [];

  for (const rule of rules as SecurityRule[]) {
    if (!rule.id || typeof rule.id !== "string") {
      errors.push(`Rule missing valid 'id'`);
      continue;
    }

    if (
      !rule.type ||
      !["injection", "pii", "access", "rate"].includes(rule.type)
    ) {
      errors.push(`Rule '${rule.id}' has invalid 'type'`);
      continue;
    }

    if (
      !rule.action ||
      !["block", "warn", "log"].includes(rule.action)
    ) {
      errors.push(`Rule '${rule.id}' has invalid 'action'`);
      continue;
    }

    const existing = securityRules.get(rule.id);
    const finalRule: SecurityRule = {
      id: rule.id,
      name: rule.name ?? existing?.name ?? rule.id,
      type: rule.type,
      action: rule.action,
      pattern: rule.pattern ?? existing?.pattern,
      description:
        rule.description ?? existing?.description ?? "",
      enabled: rule.enabled ?? existing?.enabled ?? true,
    };

    securityRules.set(rule.id, finalRule);
    updated.push(finalRule);
  }

  addAuditEntry({
    type: "access",
    severity: "info",
    source: "admin",
    action: "logged",
    details: `Security rules updated: ${updated.length} applied, ${errors.length} errors`,
  });

  return NextResponse.json({
    success: true,
    updated,
    errors: errors.length > 0 ? errors : undefined,
    totalRules: securityRules.size,
    activeRules: Array.from(securityRules.values()).filter(
      (r) => r.enabled,
    ).length,
  });
}

// ---------------------------------------------------------------------------
// report — Return full security report
// ---------------------------------------------------------------------------

function handleReport(): NextResponse {
  const oneHourAgo = Date.now() - 3600_000;
  const oneDayAgo = Date.now() - 86400_000;

  const recentHour = auditLog.filter((e) => e.timestamp > oneHourAgo);
  const recentDay = auditLog.filter((e) => e.timestamp > oneDayAgo);

  const topSources = new Map<string, number>();
  for (const entry of recentDay) {
    const count = topSources.get(entry.source) ?? 0;
    topSources.set(entry.source, count + 1);
  }

  const sortedSources = Array.from(topSources.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([source, count]) => ({ source, count }));

  return NextResponse.json({
    generatedAt: Date.now(),
    summary: {
      riskScore: calculateRiskScore(),
      totalThreats,
      totalPiiLeaks,
      totalInjectionAttempts,
      threatsLastHour: recentHour.filter(
        (e) => e.severity !== "info",
      ).length,
      threatsLastDay: recentDay.filter(
        (e) => e.severity !== "info",
      ).length,
    },
    breakdown: {
      byType: {
        injection: auditLog.filter((e) => e.type === "injection").length,
        pii: auditLog.filter((e) => e.type === "pii").length,
        access: auditLog.filter((e) => e.type === "access").length,
        rate: auditLog.filter((e) => e.type === "rate").length,
      },
      bySeverity: {
        critical: auditLog.filter((e) => e.severity === "critical").length,
        high: auditLog.filter((e) => e.severity === "high").length,
        medium: auditLog.filter((e) => e.severity === "medium").length,
        low: auditLog.filter((e) => e.severity === "low").length,
      },
      byAction: {
        blocked: auditLog.filter((e) => e.action === "blocked").length,
        warned: auditLog.filter((e) => e.action === "warned").length,
        logged: auditLog.filter((e) => e.action === "logged").length,
      },
    },
    topThreatSources: sortedSources,
    rules: Array.from(securityRules.values()),
    recentCritical: auditLog
      .filter((e) => e.severity === "critical")
      .slice(-5),
    recommendations: generateReportRecommendations(),
  });
}

function generateReportRecommendations(): string[] {
  const recs: string[] = [];

  if (totalInjectionAttempts > 10) {
    recs.push(
      "High injection attempt count — consider enabling stricter input validation and rate limiting.",
    );
  }

  if (totalPiiLeaks > 5) {
    recs.push(
      "Multiple PII leaks detected — review output sanitization and agent data access policies.",
    );
  }

  const risk = calculateRiskScore();
  if (risk > 70) {
    recs.push(
      `Risk score is ${risk}/100 — immediate security review recommended.`,
    );
  } else if (risk > 40) {
    recs.push(
      `Risk score is ${risk}/100 — monitor closely and tighten security rules.`,
    );
  } else {
    recs.push(
      `Risk score is ${risk}/100 — security posture is healthy. Continue monitoring.`,
    );
  }

  const disabledRules = Array.from(securityRules.values()).filter(
    (r) => !r.enabled,
  ).length;
  if (disabledRules > 0) {
    recs.push(
      `${disabledRules} security rule(s) are disabled — consider re-enabling for better protection.`,
    );
  }

  return recs;
}
