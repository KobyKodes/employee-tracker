import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      attendance: true,
      warnings: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!employee) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(employee);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, role, age, nationality, phone } = body;

  const employee = await prisma.employee.update({
    where: { id },
    data: { name, role, age: Number(age), nationality, phone },
  });
  return Response.json(employee);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.employee.delete({ where: { id } });
  return Response.json({ success: true });
}
