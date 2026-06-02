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
  title: "Agentic OS — Self-Contained AI Operating System",
  description:
    "Provider-independent AI Operating System with native Brain Layer, Agent Builder, Workflow Engine, Memory System, Knowledge Graph, and RAG. Use any LLM as an interchangeable execution engine.",
  keywords: [
    "Agentic OS",
    "AI Operating System",
    "AI Agent Builder",
    "Multi-Model AI",
    "Provider Independent AI",
    "Brain Layer",
    "Knowledge Graph",
    "RAG Engine",
    "Agent Orchestration",
    "Workflow Automation",
    "Memory Engine",
    "Model Abstraction",
    "Gemini CLI",
    "Self-Contained AI",
  ],
  authors: [{ name: "Agentic OS" }],
  creator: "Agentic OS",
  publisher: "Agentic OS",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://agentic-os.local",
    siteName: "Agentic OS",
    title: "Agentic OS — Self-Contained AI Operating System",
    description:
      "Provider-independent AI OS with native intelligence layer. Any LLM as interchangeable execution engine.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Agentic OS Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agentic OS — Self-Contained AI Operating System",
    description:
      "Provider-independent AI OS with native intelligence layer.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground overflow-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
