import { NextRequest, NextResponse } from "next/server";
import { GET as getMessages, POST as createMessage, DELETE as deleteMessages } from "../../conversations/[id]/messages/route";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return getMessages(req, { params });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return createMessage(req, { params });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return deleteMessages(req, { params });
}
