import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agentic OS — Mission Control Dashboard | Claude · OpenClaw · Hermes",
  description: "Mission Control Dashboard for managing AI agents. Control Claude (Intelligence), OpenClaw (Execution), Hermes (Research), and Self Vault (Identity) in a unified cyberpunk command center with real-time monitoring, agent control rooms, and compounding knowledge systems.",
  keywords: [
    "AI Agent Dashboard",
    "Claude AI",
    "OpenClaw",
    "Hermes Agent",
    "Mission Control",
    "Agent Orchestration",
    "MCP Protocol",
    "AI Skills Registry",
    "Obsidian Vault",
    "OMI Recording",
    "Multi-Agent Coordination",
    "AI Agent Management",
    "Cyberpunk Dashboard",
    "Agentic OS",
  ],
  authors: [{ name: "Goldie Mission Stack" }],
  creator: "Agentic OS",
  publisher: "Goldie Mission Stack",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://agentic-os.local",
    siteName: "Agentic OS — Mission Control",
    title: "Agentic OS — Mission Control Dashboard | Claude · OpenClaw · Hermes",
    description: "Unified command center for AI agent orchestration. Monitor and control Claude, OpenClaw, Hermes, and Self Vault with real-time dashboards, control rooms, and compounding knowledge systems.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Agentic OS Mission Control Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agentic OS — Mission Control Dashboard",
    description: "Unified command center for AI agent orchestration — Claude, OpenClaw, Hermes, Self Vault",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧠</text></svg>",
  },
  metadataBase: new URL("https://agentic-os.local"),
  alternates: {
    canonical: "/",
  },
};

// JSON-LD Structured Data for SEO Silo
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Agentic OS — Mission Control",
  description: "Unified command center for managing AI agents — Claude, OpenClaw, Hermes, and Self Vault with real-time monitoring and control rooms.",
  applicationCategory: "AI Agent Management",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Claude AI Intelligence Layer — CEO reasoning, MCP protocol, code execution",
    "OpenClaw Execution Layer — Agent routing, session management, multi-model coordination",
    "Hermes Research Layer — 2,550+ skills, browser automation, Kanban tasks, MCP server",
    "Self Identity Layer — Obsidian Vault, OMI recording, goal tracking, memory search",
    "Real-time system monitoring — CPU, memory, network, disk I/O",
    "Cross-layer latency tracking and signal logging",
    "Agent Control Rooms — Interactive command interface per agent",
    "Compounding knowledge system — Day 1 good, Day 30 wild",
  ],
};

const siloSchemas = {
  intelligence: {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Intelligence Layer — Claude AI",
    description: "The CEO of the stack. Claude handles reasoning, planning, and decision-making with full tool access, MCP protocol, and code execution.",
    isPartOf: { "@type": "WebPage", name: "Agentic OS Mission Control" },
    about: {
      "@type": "SoftwareApplication",
      name: "Claude AI",
      applicationCategory: "AI Reasoning Engine",
    },
  },
  execution: {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Execution Layer — OpenClaw Gateway",
    description: "The router of the stack. OpenClaw routes tasks between agents, manages sessions, and handles multi-agent coordination.",
    isPartOf: { "@type": "WebPage", name: "Agentic OS Mission Control" },
    about: {
      "@type": "SoftwareApplication",
      name: "OpenClaw",
      applicationCategory: "Agent Gateway",
    },
  },
  research: {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Research Layer — Hermes Agent",
    description: "The worker of the stack. Hermes executes 2,550+ skills, browser automation, Kanban tasks, and deep research workflows.",
    isPartOf: { "@type": "WebPage", name: "Agentic OS Mission Control" },
    about: {
      "@type": "SoftwareApplication",
      name: "Hermes Agent",
      applicationCategory: "AI Research Agent",
    },
  },
  self: {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Self Layer — Obsidian Vault + OMI",
    description: "The identity of the stack. OMI records screen and mic, exporting to Obsidian vault for personalised, context-rich AI output.",
    isPartOf: { "@type": "WebPage", name: "Agentic OS Mission Control" },
    about: {
      "@type": "SoftwareApplication",
      name: "Self Vault",
      applicationCategory: "Knowledge Base",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Primary SEO Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* SEO Silo Structured Data — one per layer */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siloSchemas.intelligence) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siloSchemas.execution) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siloSchemas.research) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siloSchemas.self) }}
        />
        {/* Canonical verification */}
        <link rel="canonical" href="/" />
        <meta name="theme-color" content="#0a0a1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground overflow-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
