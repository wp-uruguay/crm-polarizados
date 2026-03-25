import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  try {
    const body = await request.json();
    const visit = await prisma.visit.update({
      where: { id },
      data: {
        ...body,
        ...(body.scheduledDate && { scheduledDate: new Date(body.scheduledDate) }),
        ...(body.completedDate && { completedDate: new Date(body.completedDate) }),
        ...(body.completed === true && !body.completedDate && { completedDate: new Date() }),
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify creator when visit is completed by someone else
    if (body.completed === true && visit.createdBy && session?.user?.id !== visit.createdBy.id) {
      const contactName = `${visit.contact.firstName} ${visit.contact.lastName}`.trim();
      await sendNotification({
        userId: visit.createdBy.id,
        userEmail: visit.createdBy.email!,
        userName: visit.createdBy.name,
        type: "VISIT_COMPLETED",
        title: "Visita completada",
        message: `La visita con <strong>${contactName}</strong> fue completada por <strong>${visit.assignedTo.name}</strong>.`,
        link: "/calendar/visits",
      });
    }

    return NextResponse.json(visit);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al actualizar visita" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.visit.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al eliminar visita" }, { status: 500 });
  }
}
