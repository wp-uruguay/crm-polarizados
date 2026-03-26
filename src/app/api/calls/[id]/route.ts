import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendNotification, escapeHtml } from "@/lib/notifications";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  try {
    const body = await request.json();
    const call = await prisma.call.update({
      where: { id },
      data: {
        ...body,
        ...(body.scheduledAt && { scheduledAt: new Date(body.scheduledAt) }),
        ...(body.completedAt && { completedAt: new Date(body.completedAt) }),
        ...(body.completed === true && !body.completedAt && { completedAt: new Date() }),
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify creator when call is completed by someone else
    if (body.completed === true && call.createdBy && session?.user?.id !== call.createdBy.id) {
      const contactName = `${call.contact.firstName} ${call.contact.lastName}`.trim();
      await sendNotification({
        userId: call.createdBy.id,
        userEmail: call.createdBy.email!,
        userName: call.createdBy.name,
        type: "CALL_COMPLETED",
        title: "Llamada completada",
        message: `La llamada con <strong>${escapeHtml(contactName)}</strong> fue completada por <strong>${escapeHtml(call.assignedTo.name)}</strong>.`,
        link: "/calendar/calls",
      });
    }

    return NextResponse.json(call);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al actualizar llamada" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.call.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al eliminar llamada" }, { status: 500 });
  }
}
