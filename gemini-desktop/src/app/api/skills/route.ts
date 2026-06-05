import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const skillsPath = path.join(process.cwd(), "skills");
    if (!fs.existsSync(skillsPath)) {
      return NextResponse.json([]);
    }

    const skillDirs = fs.readdirSync(skillsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const skills = skillDirs.map(name => {
      const skillDir = path.join(skillsPath, name);
      let description = "";
      
      // Try to read SKILL.md for description
      const skillMdPath = path.join(skillDir, "SKILL.md");
      if (fs.existsSync(skillMdPath)) {
        const content = fs.readFileSync(skillMdPath, "utf-8");
        const descMatch = content.match(/description:\s*(.*)/);
        if (descMatch) {
          description = descMatch[1].replace(/['"]/g, "").trim();
        }
      }

      return {
        id: name,
        name: name.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" "),
        description: description || `Skill for ${name}`,
      };
    });

    return NextResponse.json(skills);
  } catch (error) {
    console.error("[SKILLS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const skillsPath = path.join(process.cwd(), "skills");
    if (!fs.existsSync(skillsPath)) {
      fs.mkdirSync(skillsPath, { recursive: true });
    }

    const skillId = name.toLowerCase().replace(/\s+/g, "-");
    const skillDir = path.join(skillsPath, skillId);

    if (fs.existsSync(skillDir)) {
      return new NextResponse("Skill already exists", { status: 400 });
    }

    fs.mkdirSync(skillDir, { recursive: true });

    // Create a basic SKILL.md
    const skillMdContent = `---
name: ${name}
description: ${description || `Skill for ${name}`}
---

# ${name}

${description || `Skill for ${name}`}
`;
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillMdContent);

    return NextResponse.json({
      id: skillId,
      name,
      description: description || `Skill for ${name}`,
    });
  } catch (error) {
    console.error("[SKILLS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

