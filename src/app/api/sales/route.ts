import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendNotification, escapeHtml } from "@/lib/notifications";
import { calcTax } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (search) {
      where.contact = {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { company: { contains: search } },
        ],
      };
    }

    const sales = await prisma.sale.findMany({
      where,
      take: 200,
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, company: true },
        },
        user: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, category: true, sku: true },
            },
          },
        },
        payments: true,
        remito: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { error: "Error fetching sales" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      contactId,
      items,
      type = "REGULAR",
      discount = 0,
      notes,
      requiresFactura = false,
    } = body;

    const subtotal = items.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0
    );
    const tax = requiresFactura ? calcTax(subtotal) : 0;
    const total = subtotal - discount + tax;

    const result = await prisma.$transaction(async (tx) => {
      // Create sale with items
      const sale = await tx.sale.create({
        data: {
          contactId,
          userId: session.user.id,
          type,
          requiresFactura,
          subtotal,
          discount,
          tax,
          total,
          notes,
          items: {
            create: items.map(
              (item: { productId: string; quantity: number; unitPrice: number }) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.quantity * item.unitPrice,
              })
            ),
          },
        },
        include: {
          items: true,
          contact: true,
        },
      });

      // Auto-create remito
      await tx.remito.create({
        data: {
          saleId: sale.id,
        },
      });

      // Auto-update stock (validate before decrement) + create stock movements
      for (const item of items as Array<{ productId: string; quantity: number }>) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.stock < item.quantity) {
          throw new Error(`Stock insuficiente para ${product?.name ?? item.productId}`);
        }
        const stockBefore = product.stock;
        const stockAfter = stockBefore - item.quantity;
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: stockAfter },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "SALIDA",
            quantity: item.quantity,
            stockBefore,
            stockAfter,
            referenceId: sale.id,
            referenceType: "SALE",
            reason: `Venta #${sale.number}`,
            userId: session.user.id,
          },
        });
      }

      // Auto-convert lead to client
      if (sale.contact.type === "LEAD") {
        await tx.contact.update({
          where: { id: contactId },
          data: { type: "CLIENT" },
        });
      }

      return sale;
    });

    const sale = await prisma.sale.findUnique({
      where: { id: result.id },
      include: {
        contact: { include: { assignedTo: { select: { id: true, name: true, email: true } } } },
        user: { select: { id: true, name: true } },
        items: { include: { product: true } },
        remito: true,
        payments: true,
      },
    });

    // Notify the contact's assigned user if different from the sale creator
    if (sale?.contact.assignedTo && sale.contact.assignedTo.id !== session.user.id) {
      const contactName = sale.contact.company || `${sale.contact.firstName} ${sale.contact.lastName}`.trim();
      await sendNotification({
        userId: sale.contact.assignedTo.id,
        userEmail: sale.contact.assignedTo.email!,
        userName: sale.contact.assignedTo.name,
        type: "SALE_CREATED",
        title: "Nueva venta registrada",
        message: `Se registró una venta a <strong>${escapeHtml(contactName)}</strong> por $${sale.total}.`,
        link: "/sales",
      });
    }

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json(
      { error: "Error creating sale" },
      { status: 500 }
    );
  }
}
