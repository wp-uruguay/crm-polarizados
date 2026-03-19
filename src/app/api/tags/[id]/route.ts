import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar etiqueta" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, color } = await request.json();
    const tag = await prisma.tag.update({ where: { id }, data: { name, color } });
    return NextResponse.json(tag);
  } catch {
    return NextResponse.json({ error: "Error al actualizar etiqueta" }, { status: 500 });
  }
}
