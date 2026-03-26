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
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          include: { items: { include: { product: { select: { id: true, name: true, sku: true } } } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
    if (!supplier) {
      return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    }
    return NextResponse.json(supplier);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error fetching supplier" }, { status: 500 });
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
    const { name, country, contactName, contactEmail, contactPhone, currency, leadTimeDays, notes, active } = body;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        country,
        contactName,
        contactEmail,
        contactPhone,
        currency,
        leadTimeDays: leadTimeDays !== undefined ? parseInt(leadTimeDays) : undefined,
        notes,
        active,
      },
    });
    return NextResponse.json(supplier);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error updating supplier" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { id } = await params;
    await prisma.supplier.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error deleting supplier" }, { status: 500 });
  }
}
