import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Assign a unit to a user (or unassign with userId: null)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  try {
    const { unitId } = await params;
    const { userId, notes } = await request.json();

    const unit = await prisma.productUnit.update({
      where: { id: unitId },
      data: {
        assignedToId: userId ?? null,
        assignedAt: userId ? new Date() : null,
        notes: notes ?? undefined,
      },
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(unit);
  } catch {
    return NextResponse.json({ error: "Error al actualizar unidad" }, { status: 500 });
  }
}
