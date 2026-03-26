import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        sales: {
          include: {
            items: { include: { product: { select: { id: true, name: true } } } },
            payments: true,
          },
          orderBy: { createdAt: "desc" },
        },
        payments: {
          include: { sale: { select: { number: true } } },
          orderBy: { paidAt: "desc" },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    // Calculate balance: sum of (sale.total - payments per sale)
    let balance = 0;
    const purchases = contact.sales.map((sale) => {
      const paidAmount = sale.payments.reduce((s, p) => s + Number(p.amount), 0);
      const saleTotal = Number(sale.total);
      balance += saleTotal - paidAmount;

      let paymentStatus = "PENDING";
      if (paidAmount >= saleTotal) paymentStatus = "PAID";
      else if (paidAmount > 0) paymentStatus = "PARTIAL";

      return {
        id: sale.id,
        saleNumber: `#${sale.number}`,
        total: saleTotal,
        paymentStatus,
        createdAt: sale.createdAt.toISOString(),
        items: sale.items.map((item) => ({
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        })),
      };
    });

    const payments = contact.payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method || "OTHER",
      date: p.paidAt.toISOString(),
      saleNumber: p.sale ? `#${p.sale.number}` : "—",
    }));

    // Parse suppliers as JSON array or fallback
    let suppliers: string[] = [];
    if (contact.currentSupplier) {
      try {
        const parsed = JSON.parse(contact.currentSupplier);
        suppliers = Array.isArray(parsed) ? parsed : [contact.currentSupplier];
      } catch {
        suppliers = contact.currentSupplier ? [contact.currentSupplier] : [];
      }
    }

    return NextResponse.json({
      id: contact.id,
      name: `${contact.firstName} ${contact.lastName}`,
      company: contact.company,
      email: contact.email,
      phone: contact.phone,
      address: contact.address,
      rut: null,
      notes: contact.notes || "",
      suppliers,
      priceRange: contact.currentSupplierPrices || "",
      purchases,
      payments,
      balance,
    });
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json({ error: "Error al cargar cliente" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { notes, suppliers, priceRange } = body;

    const data: Record<string, unknown> = {};
    if (notes !== undefined) data.notes = notes;
    if (suppliers !== undefined) data.currentSupplier = JSON.stringify(suppliers);
    if (priceRange !== undefined) data.currentSupplierPrices = priceRange;

    await prisma.contact.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json({ error: "Error al actualizar cliente" }, { status: 500 });
  }
}
