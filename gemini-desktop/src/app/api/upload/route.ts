import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadsDir = join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const uploadedFiles: any[] = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() || "bin";
      const uniqueName = `${randomUUID()}.${ext}`;
      const filePath = join(uploadsDir, uniqueName);

      await writeFile(filePath, buffer);

      uploadedFiles.push({
        id: randomUUID(),
        name: file.name,
        path: filePath,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      });
    }

    return NextResponse.json({ files: uploadedFiles }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
