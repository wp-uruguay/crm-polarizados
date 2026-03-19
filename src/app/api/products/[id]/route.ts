import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        discounts: true,
        units: {
          include: { assignedTo: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Error al obtener producto" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { discounts, ...productData } = body;

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data: productData });

      if (discounts !== undefined) {
        await tx.productDiscount.deleteMany({ where: { productId: id } });
        if (discounts.length > 0) {
          await tx.productDiscount.createMany({
            data: discounts.map((d: { type: string; value: number; label?: string }) => ({
              productId: id,
              type: d.type,
              value: d.value,
              label: d.label ?? null,
            })),
          });
        }
      }

      return updated;
    });

    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 });
  }
}
