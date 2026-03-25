import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { ids, action } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "IDs requeridos" }, { status: 400 });
    }
    if (!["delete", "deactivate", "activate"].includes(action)) {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    if (action === "delete") {
      await prisma.product.deleteMany({ where: { id: { in: ids } } });
      return NextResponse.json({ message: `${ids.length} producto(s) eliminados` });
    }

    if (action === "deactivate") {
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { active: false },
      });
      return NextResponse.json({ message: `${ids.length} producto(s) desactivados` });
    }

    if (action === "activate") {
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { active: true },
      });
      return NextResponse.json({ message: `${ids.length} producto(s) activados` });
    }
  } catch (error) {
    console.error("Error en operación masiva:", error);
    return NextResponse.json({ error: "Error en operación" }, { status: 500 });
  }
}
