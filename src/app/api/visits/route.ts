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
  if (upcoming) where.scheduledDate = { gte: new Date() };
  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 1);
    where.scheduledDate = { gte: start, lt: end };
  }

  try {
    const visits = await prisma.visit.findMany({
      where,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
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

    const finalAssignedId = assignedToId || session.user.id;

    const visit = await prisma.visit.create({
      data: {
        contactId,
        assignedToId: finalAssignedId,
        createdById: session.user.id,
        scheduledDate: new Date(scheduledDate),
        notes: notes || null,
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Send notification only if assigned to someone else
    if (finalAssignedId !== session.user.id && visit.assignedTo) {
      const contactName = visit.contact.company || `${visit.contact.firstName} ${visit.contact.lastName}`.trim();
      const date = new Date(scheduledDate).toLocaleString("es-AR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
      await sendNotification({
        userId: visit.assignedTo.id,
        userEmail: visit.assignedTo.email,
        userName: visit.assignedTo.name,
        type: "VISIT_ASSIGNED",
        title: "Nueva visita asignada",
        message: `Se te asignó una visita con <strong>${contactName}</strong> para el ${date}.${notes ? `<br>Notas: ${notes}` : ""}`,
        link: "/calendar/visits",
      });
    }

    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear visita" }, { status: 500 });
  }
}
