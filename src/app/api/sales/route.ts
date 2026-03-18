import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
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
    const body = await request.json();
    const {
      contactId,
      userId,
      items,
      type = "REGULAR",
      discount = 0,
      tax = 0,
      notes,
    } = body;

    const subtotal = items.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0
    );
    const total = subtotal - discount + tax;

    const result = await prisma.$transaction(async (tx) => {
      // Create sale with items
      const sale = await tx.sale.create({
        data: {
          contactId,
          userId,
          type,
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

      // Auto-update stock
      for (const item of items as Array<{ productId: string; quantity: number }>) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
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
        contact: true,
        items: { include: { product: true } },
        remito: true,
        payments: true,
      },
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json(
      { error: "Error creating sale" },
      { status: 500 }
    );
  }
}
