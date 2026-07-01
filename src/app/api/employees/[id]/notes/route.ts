import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content } = await request.json();

  if (!content?.trim()) {
    return Response.json({ error: "Content is required" }, { status: 400 });
  }

  const note = await prisma.note.create({
    data: { employeeId: id, content: content.trim() },
  });
  return Response.json(note, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  const { noteId } = await request.json();
  await prisma.note.delete({ where: { id: noteId } });
  return Response.json({ success: true });
}
