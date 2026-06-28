import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { description } = body;

  if (!description) {
    return Response.json({ error: "Description is required" }, { status: 400 });
  }

  const warning = await prisma.warning.create({
    data: { employeeId: id, description },
  });
  return Response.json(warning, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  const { warningId } = await request.json();
  await prisma.warning.delete({ where: { id: warningId } });
  return Response.json({ success: true });
}
