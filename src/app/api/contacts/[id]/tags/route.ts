import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Add tag to contact
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: contactId } = await params;
    const { tagId } = await request.json();
    await prisma.contactTag.create({ data: { contactId, tagId } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002")
      return NextResponse.json({ error: "La etiqueta ya está asignada" }, { status: 409 });
    return NextResponse.json({ error: "Error al asignar etiqueta" }, { status: 500 });
  }
}

// Remove tag from contact
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: contactId } = await params;
    const { tagId } = await request.json();
    await prisma.contactTag.delete({ where: { contactId_tagId: { contactId, tagId } } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al quitar etiqueta" }, { status: 500 });
  }
}
