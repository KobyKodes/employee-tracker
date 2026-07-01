import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET() {
  const employees = await prisma.employee.findMany({
    include: {
      attendance: true,
      warnings: true,
      overtime: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(employees);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, role, age, nationality, phone } = body;

  if (!name || !role || !age || !nationality || !phone) {
    return Response.json({ error: "All fields are required" }, { status: 400 });
  }

  const employee = await prisma.employee.create({
    data: { name, role, age: Number(age), nationality, phone },
  });

  return Response.json(employee, { status: 201 });
}
