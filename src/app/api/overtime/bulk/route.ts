import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// POST: add overtime for specific or all employees
export async function POST(request: NextRequest) {
  const { employeeIds, hours, date, note } = await request.json();

  const ids: string[] =
    employeeIds === "all"
      ? (await prisma.employee.findMany({ select: { id: true } })).map((e) => e.id)
      : employeeIds;

  await prisma.overtime.createMany({
    data: ids.map((employeeId) => ({
      employeeId,
      hours: Number(hours),
      date,
      note: note?.trim() || null,
    })),
  });
  return Response.json({ success: true, count: ids.length }, { status: 201 });
}

// DELETE: remove all overtime for specific employees
export async function DELETE(request: NextRequest) {
  const { employeeIds } = await request.json();
  await prisma.overtime.deleteMany({ where: { employeeId: { in: employeeIds } } });
  return Response.json({ success: true });
}
