import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json({ error: "Error fetching tags" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, color } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    const tag = await prisma.tag.create({ data: { name: name.trim(), color: color || "#6366f1" } });
    return NextResponse.json(tag, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002")
      return NextResponse.json({ error: "Ya existe una etiqueta con ese nombre" }, { status: 409 });
    return NextResponse.json({ error: "Error al crear etiqueta" }, { status: 500 });
  }
}
