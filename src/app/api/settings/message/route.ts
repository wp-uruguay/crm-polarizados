import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const title = await prisma.setting.findUnique({ where: { key: "fixed_message_title" } });
    const body = await prisma.setting.findUnique({ where: { key: "fixed_message_body" } });
    return NextResponse.json({
      title: title?.value ?? "Mensaje fijo",
      body: body?.value ?? "Aquí podremos destacar mensajes importantes que solo veremos nosotros.",
    });
  } catch {
    return NextResponse.json({ error: "Error al obtener mensaje" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { title, body } = await request.json();

    await prisma.$transaction([
      prisma.setting.upsert({
        where: { key: "fixed_message_title" },
        update: { value: title },
        create: { key: "fixed_message_title", value: title },
      }),
      prisma.setting.upsert({
        where: { key: "fixed_message_body" },
        update: { value: body },
        create: { key: "fixed_message_body", value: body },
      }),
    ]);

    return NextResponse.json({ title, body });
  } catch {
    return NextResponse.json({ error: "Error al guardar mensaje" }, { status: 500 });
  }
}
