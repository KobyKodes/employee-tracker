import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const records = await prisma.attendance.findMany({
    where: { employeeId: id },
    orderBy: { date: "asc" },
  });
  return Response.json(records);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { date, status, lateTime } = body;

  const record = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: id, date: new Date(date) } },
    update: { status, lateTime: status === "LATE" ? (lateTime ?? null) : null },
    create: { employeeId: id, date: new Date(date), status, lateTime: status === "LATE" ? (lateTime ?? null) : null },
  });
  return Response.json(record);
}
