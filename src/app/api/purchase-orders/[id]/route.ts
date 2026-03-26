import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { id } = await params;
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { product: { select: { id: true, name: true, sku: true, category: true, stock: true } } } },
        importCosts: true,
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error fetching purchase order" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const { status, exchangeRate, expectedDate, notes, importCosts } = body;

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status,
          exchangeRate: exchangeRate ? parseFloat(String(exchangeRate)) : undefined,
          expectedDate: expectedDate ? new Date(expectedDate) : undefined,
          notes,
        },
      });

      // Replace import costs if provided
      if (importCosts !== undefined) {
        await tx.importCost.deleteMany({ where: { purchaseOrderId: id } });
        if (importCosts.length > 0) {
          await tx.importCost.createMany({
            data: importCosts.map((c: { type: string; description?: string; amountARS: number }) => ({
              purchaseOrderId: id,
              type: c.type,
              description: c.description,
              amountARS: parseFloat(String(c.amountARS)),
            })),
          });
        }
      }

      return updated;
    });

    const result = await prisma.purchaseOrder.findUnique({
      where: { id: order.id },
      include: {
        supplier: true,
        items: { include: { product: true } },
        importCosts: true,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error updating purchase order" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { id } = await params;
    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    if (order.status === "RECEIVED") {
      return NextResponse.json({ error: "No se puede eliminar una orden ya recibida" }, { status: 400 });
    }
    await prisma.purchaseOrder.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error deleting purchase order" }, { status: 500 });
  }
}
