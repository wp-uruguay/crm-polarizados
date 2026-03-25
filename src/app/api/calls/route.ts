import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId");
  const upcoming = searchParams.get("upcoming") === "true";
  const month = searchParams.get("month"); // 1-12
  const year = searchParams.get("year");

  const where: Record<string, unknown> = {};
  if (contactId) where.contactId = contactId;
  if (upcoming) where.scheduledAt = { gte: new Date() };
  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 1);
    where.scheduledAt = { gte: start, lt: end };
  }

  try {
    const calls = await prisma.call.findMany({
      where,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
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

    const finalAssignedId = assignedToId || session.user.id;

    const call = await prisma.call.create({
      data: {
        contactId,
        assignedToId: finalAssignedId,
        createdById: session.user.id,
        scheduledAt: new Date(scheduledAt),
        durationMin: durationMin ? Number(durationMin) : null,
        notes: notes || null,
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Send notification only if assigned to someone else
    if (finalAssignedId !== session.user.id && call.assignedTo) {
      const contactName = call.contact.company || `${call.contact.firstName} ${call.contact.lastName}`.trim();
      const date = new Date(scheduledAt).toLocaleString("es-AR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
      const duration = durationMin ? ` (${durationMin} min)` : "";
      await sendNotification({
        userId: call.assignedTo.id,
        userEmail: call.assignedTo.email,
        userName: call.assignedTo.name,
        type: "CALL_ASSIGNED",
        title: "Nueva llamada asignada",
        message: `Se te asignó una llamada con <strong>${contactName}</strong> para el ${date}${duration}.${notes ? `<br>Notas: ${notes}` : ""}`,
        link: "/calendar/calls",
      });
    }

    return NextResponse.json(call, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear llamada" }, { status: 500 });
  }
}
