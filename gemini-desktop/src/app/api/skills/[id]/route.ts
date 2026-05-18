import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const skillsPath = path.join(process.cwd(), "skills");
    const skillDir = path.join(skillsPath, id);

    if (!fs.existsSync(skillDir)) {
      return new NextResponse("Skill not found", { status: 404 });
    }

    // Security check: ensure the path is within the skills directory
    if (!skillDir.startsWith(skillsPath)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    fs.rmSync(skillDir, { recursive: true, force: true });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[SKILL_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
