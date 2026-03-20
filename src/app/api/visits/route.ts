import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId");
  const upcoming = searchParams.get("upcoming") === "true";

  const where: Record<string, unknown> = {};
  if (contactId) where.contactId = contactId;
  if (upcoming) where.scheduledDate = { gte: new Date() };

  try {
    const visits = await prisma.visit.findMany({
      where,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { scheduledDate: "asc" },
    });
    return NextResponse.json(visits);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al obtener visitas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { contactId, assignedToId, scheduledDate, notes } = body;

    if (!contactId || !scheduledDate) {
      return NextResponse.json({ error: "contactId y scheduledDate son requeridos" }, { status: 400 });
    }

    const visit = await prisma.visit.create({
      data: {
        contactId,
        assignedToId: assignedToId || session.user.id,
        createdById: session.user.id,
        scheduledDate: new Date(scheduledDate),
        notes: notes || null,
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear visita" }, { status: 500 });
  }
}
