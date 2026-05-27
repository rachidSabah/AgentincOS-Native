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
  title: "Agentic OS — 7-Layer Mission Control | Claude · OpenClaw · Hermes",
  description: "7-Layer Agentic AI Stack dashboard. Control the full stack: Interaction & Perception, Knowledge Acquisition, Agent Orchestration, Cognitive Reasoning, Execution & Integration, Memory & Context, and Deployment & Governance.",
  keywords: [
    "AI Agent Dashboard",
    "7-Layer AI Stack",
    "Agentic AI",
    "Claude AI",
    "OpenClaw",
    "Hermes Agent",
    "Mission Control",
    "Agent Orchestration",
    "Cognitive Reasoning",
    "MCP Protocol",
    "AI Skills Registry",
    "Obsidian Vault",
    "OMI Recording",
    "Multi-Agent Coordination",
    "AI Agent Management",
    "Cyberpunk Dashboard",
    "Agentic OS",
    "AI Governance",
    "Agent Memory",
    "AI Execution Layer",
  ],
  authors: [{ name: "Goldie Mission Stack" }],
  creator: "Agentic OS",
  publisher: "Goldie Mission Stack",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://agentic-os.local",
    siteName: "Agentic OS — 7-Layer Mission Control",
    title: "Agentic OS — 7-Layer Mission Control Dashboard",
    description: "Unified command center for the 7-Layer Agentic AI Stack. Monitor and control every layer from Interaction to Governance.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Agentic OS 7-Layer Mission Control Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agentic OS — 7-Layer Mission Control",
    description: "7-Layer Agentic AI Stack: Input → Retrieve → Coordinate → Reason → Act → Remember → Govern",
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

// JSON-LD Structured Data for 7-Layer Stack
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Agentic OS — 7-Layer Mission Control",
  description: "Unified command center for the 7-Layer Agentic AI Stack. Input → Retrieve → Coordinate → Reason → Act → Remember → Govern.",
  applicationCategory: "AI Agent Management",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Layer 1: Interaction & Perception — Multimodal input understanding, intent detection, adaptive user interaction",
    "Layer 2: Knowledge Acquisition — Data retrieval across systems, search + synthesis, fact-checking and validation",
    "Layer 3: Agent Orchestration — Task routing, role delegation, dynamic workflow coordination",
    "Layer 4: Cognitive Reasoning — Structured planning, self-reflection and error correction, reasoning with rules and logic",
    "Layer 5: Execution & Integration — Tool use, API execution, workflow automation and monitoring",
    "Layer 6: Memory, Learning & Context — Short-term and long-term memory, personalization, continuous improvement",
    "Layer 7: Deployment, Governance & Infrastructure — Secure hosting, policies and safety controls, observability",
    "Real-time system monitoring — CPU, memory, network, disk I/O across all 7 layers",
    "Cross-layer latency tracking and signal logging",
    "Agent Control Rooms — Interactive command interface per agent",
    "Compounding knowledge system — Day 1 good, Day 30 wild",
  ],
};

const layerSchemas: Record<string, object> = {
  interaction: {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Layer 1: Interaction & Perception",
    description: "Turns voice, text, image, and video into usable signals. This is the AI's front door.",
    isPartOf: { "@type": "WebPage", name: "Agentic OS 7-Layer Mission Control" },
    about: { "@type": "SoftwareApplication", name: "Interaction & Perception Layer", applicationCategory: "AI Input Processing" },
  },
  knowledge: {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Layer 2: Knowledge Acquisition",
    description: "Finds the right information from internal and external sources. Good answers depend on good information.",
    isPartOf: { "@type": "WebPage", name: "Agentic OS 7-Layer Mission Control" },
    about: { "@type": "SoftwareApplication", name: "Hermes Agent", applicationCategory: "AI Research Agent" },
  },
  orchestration: {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Layer 3: Agent Orchestration",
    description: "Coordinates multiple agents, roles, and tasks toward one goal. This is where agents become a team.",
    isPartOf: { "@type": "WebPage", name: "Agentic OS 7-Layer Mission Control" },
    about: { "@type": "SoftwareApplication", name: "OpenClaw Gateway", applicationCategory: "Agent Orchestration" },
  },
  cognition: {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Layer 4: Cognitive Reasoning",
    description: "Plans, evaluates options, and reasons through multi-step problems. Reasoning turns information into decisions.",
    isPartOf: { "@type": "WebPage", name: "Agentic OS 7-Layer Mission Control" },
    about: { "@type": "SoftwareApplication", name: "Claude AI", applicationCategory: "AI Reasoning Engine" },
  },
  execution: {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Layer 5: Execution & Integration",
    description: "Takes action using tools, APIs, and automated workflows. Without action, intelligence stays theoretical.",
    isPartOf: { "@type": "WebPage", name: "Agentic OS 7-Layer Mission Control" },
    about: { "@type": "SoftwareApplication", name: "Hermes + OpenClaw", applicationCategory: "AI Execution Engine" },
  },
  memory: {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Layer 6: Memory, Learning & Context",
    description: "Stores context, preferences, and past interactions to improve future performance. Memory makes agents feel consistent and personal.",
    isPartOf: { "@type": "WebPage", name: "Agentic OS 7-Layer Mission Control" },
    about: { "@type": "SoftwareApplication", name: "Self Vault + OMI", applicationCategory: "Knowledge Base" },
  },
  governance: {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Layer 7: Deployment, Governance & Infrastructure",
    description: "Provides the secure, scalable foundation that keeps the system reliable. Trustworthy AI needs strong guardrails.",
    isPartOf: { "@type": "WebPage", name: "Agentic OS 7-Layer Mission Control" },
    about: { "@type": "SoftwareApplication", name: "OpenClaw Governance", applicationCategory: "AI Infrastructure & Governance" },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {Object.values(layerSchemas).map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
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
