import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

const INITIAL_PROMPTS = [
  {
    title: "Explain a concept",
    content: "Explain {concept} in simple terms, using analogies and examples.",
    description: "Educational explanation with analogies",
    category: "Education"
  },
  {
    title: "Write code",
    content: "Write a {language} script to {task}. Ensure the code is clean, efficient, and well-commented.",
    description: "Generic code generation prompt",
    category: "Development"
  },
  {
    title: "Code Review",
    content: "Review the following code for bugs, performance issues, and security vulnerabilities:\n\n{code}",
    description: "Thorough security and quality audit",
    category: "Development"
  },
  {
    title: "Brainstorm Ideas",
    content: "Brainstorm creative and innovative ideas for: {topic}. Provide diverse and practical suggestions.",
    description: "Ideation and creative thinking",
    category: "Creative"
  },
  {
    title: "Summarize Text",
    content: "Summarize the following text into a few concise bullet points, highlighting the key takeaways:\n\n{text}",
    description: "Concise text summarization",
    category: "Productivity"
  },
  {
    title: "Translate",
    content: "Translate the following text to {target_language}. Preserve the tone and nuance of the original:\n\n{text}",
    description: "Nuanced language translation",
    category: "Language"
  },
  {
    title: "Security Audit",
    content: "Perform a thorough security audit on this code. Identify vulnerabilities (SQL injection, XSS, CSRF, etc.), rate severity, and suggest fixes:\n\n{code}",
    description: "In-depth security vulnerability scan",
    category: "Security"
  },
  {
    title: "UI/UX Premium Design",
    content: "You are a senior UI/UX designer and frontend developer. Analyze the existing code and apply premium design improvements (spacing, typography, colors, interactions):\n\n{code}",
    description: "Visual and UX enhancement suggestions",
    category: "Design"
  }
];

export async function GET() {
  try {
    let prompts = await db.prompt.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Seed if empty
    if (prompts.length === 0) {
      for (const p of INITIAL_PROMPTS) {
        await db.prompt.create({ data: p });
      }
      prompts = await db.prompt.findMany({
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json(prompts);
  } catch (error) {
    console.error("[PROMPTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, content, description, category } = body;

    if (!title || !content) {
      return new NextResponse("Title and Content are required", { status: 400 });
    }

    const prompt = await db.prompt.create({
      data: {
        title,
        content,
        description,
        category,
      },
    });

    return NextResponse.json(prompt);
  } catch (error) {
    console.error("[PROMPTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
