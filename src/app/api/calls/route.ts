import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId");
  const upcoming = searchParams.get("upcoming") === "true";

  const where: Record<string, unknown> = {};
  if (contactId) where.contactId = contactId;
  if (upcoming) where.scheduledAt = { gte: new Date() };

  try {
    const calls = await prisma.call.findMany({
      where,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });
    return NextResponse.json(calls);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al obtener llamadas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { contactId, assignedToId, scheduledAt, durationMin, notes } = body;

    if (!contactId || !scheduledAt) {
      return NextResponse.json({ error: "contactId y scheduledAt son requeridos" }, { status: 400 });
    }

    const call = await prisma.call.create({
      data: {
        contactId,
        assignedToId: assignedToId || session.user.id,
        createdById: session.user.id,
        scheduledAt: new Date(scheduledAt),
        durationMin: durationMin ? Number(durationMin) : null,
        notes: notes || null,
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(call, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear llamada" }, { status: 500 });
  }
}
