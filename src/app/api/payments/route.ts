import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pending = searchParams.get("pending");

    if (pending === "true") {
      // Find sales where total > sum of payments
      const sales = await prisma.sale.findMany({
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, company: true },
          },
          payments: true,
        },
      });

      const pendingPayments = sales
        .filter((sale) => {
          const totalPaid = sale.payments.reduce(
            (sum, payment) => sum + Number(payment.amount),
            0
          );
          return totalPaid < Number(sale.total);
        })
        .map((sale) => {
          const totalPaid = sale.payments.reduce(
            (sum, payment) => sum + Number(payment.amount),
            0
          );
          return {
            ...sale,
            totalPaid,
            remaining: Number(sale.total) - totalPaid,
          };
        });

      return NextResponse.json(pendingPayments);
    }

    const payments = await prisma.payment.findMany({
      include: {
        sale: { select: { number: true } },
        contact: { select: { firstName: true, lastName: true, company: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = payments.map((p) => ({
      id: p.id,
      date: p.createdAt.toISOString(),
      clientName: p.contact
        ? p.contact.company ||
          `${p.contact.firstName ?? ""} ${p.contact.lastName ?? ""}`.trim()
        : "—",
      saleNumber: p.sale?.number ?? "—",
      amount: Number(p.amount),
      method: p.method,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Error fetching payments" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { saleId, contactId, amount, method, reference, notes } = body;

    // Use provided contactId, or derive from sale if not provided
    let resolvedContactId = contactId;

    if (!resolvedContactId) {
      const sale = await prisma.sale.findUnique({
        where: { id: saleId },
      });

      if (!sale) {
        return NextResponse.json({ error: "Sale not found" }, { status: 404 });
      }

      resolvedContactId = sale.contactId;
    }

    const payment = await prisma.payment.create({
      data: {
        saleId,
        contactId: resolvedContactId,
        amount: new Prisma.Decimal(amount),
        method,
        reference,
        notes,
      },
      include: {
        sale: {
          select: { id: true, number: true, total: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true, company: true },
        },
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Error creating payment" },
      { status: 500 }
    );
  }
}
