import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { hours, date, note } = await request.json();

  if (!hours || !date) {
    return Response.json({ error: "Hours and date are required" }, { status: 400 });
  }

  const entry = await prisma.overtime.create({
    data: { employeeId: id, hours: Number(hours), date, note: note?.trim() || null },
  });
  return Response.json(entry, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { overtimeId, clearAll } = await request.json();

  if (clearAll) {
    await prisma.overtime.deleteMany({ where: { employeeId: id } });
  } else {
    await prisma.overtime.delete({ where: { id: overtimeId } });
  }
  return Response.json({ success: true });
}
