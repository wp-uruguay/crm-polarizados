import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
        assignedTo: { select: { id: true, name: true } },
      },
    });
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
