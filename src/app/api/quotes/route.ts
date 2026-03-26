import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calcTax } from "@/lib/utils";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const quotes = await prisma.quote.findMany({
      take: 200,
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, company: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, category: true, sku: true },
            },
          },
        },
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(quotes);
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json(
      { error: "Error fetching quotes" },
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
    const { contactId, items, validUntil, notes, requiresFactura } = body;

    // Calculate per-item totals accounting for per-item discounts
    const processedItems = items.map(
      (item: { productId: string; quantity: number; unitPrice: number; discount?: number; discountType?: string }) => {
        const lineTotal = item.quantity * item.unitPrice;
        let discountAmount = 0;
        if (item.discount && item.discount > 0) {
          discountAmount = item.discountType === "PERCENT"
            ? lineTotal * (item.discount / 100)
            : item.discount;
        }
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          discountType: item.discountType || "FIXED",
          total: lineTotal - discountAmount,
        };
      }
    );

    const subtotal = processedItems.reduce((sum: number, i: { total: number }) => sum + i.total, 0);
    const tax = requiresFactura ? calcTax(subtotal) : 0;
    const total = subtotal + tax;

    const quote = await prisma.quote.create({
      data: {
        contactId,
        userId: session.user.id,
        subtotal,
        discount: 0,
        tax,
        total,
        requiresFactura: requiresFactura || false,
        validUntil: validUntil ? new Date(validUntil) : null,
        notes,
        items: {
          create: processedItems.map(
            (item: { productId: string; quantity: number; unitPrice: number; discount: number; discountType: string; total: number }) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              discountType: item.discountType,
              total: item.total,
            })
          ),
        },
      },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, company: true, email: true },
        },
        items: {
          include: { product: true },
        },
      },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error("Error creating quote:", error);
    return NextResponse.json(
      { error: "Error creating quote" },
      { status: 500 }
    );
  }
}
