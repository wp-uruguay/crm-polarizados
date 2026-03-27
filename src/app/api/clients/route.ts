import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const city = searchParams.get("city");
    const state = searchParams.get("state");

    const where: Record<string, unknown> = { type: "CLIENT" as const };

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { company: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (city) where.city = { contains: city };
    if (state) where.state = state;

    const clients = await prisma.contact.findMany({
      where,
      take: 200,
      include: {
        assignedTo: {
          select: { id: true, name: true },
        },
        sales: { select: { total: true } },
        payments: { select: { amount: true } },
        tags: {
          include: { tag: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = clients.map(({ sales, payments, ...c }) => {
      const totalPurchases = sales.reduce((sum, s) => sum + Number(s.total), 0);
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        ...c,
        totalPurchases,
        balance: totalPurchases - totalPaid,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Error fetching clients" },
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

    const client = await prisma.contact.create({
      data: {
        ...body,
        type: "CLIENT" as const,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Error creating client" },
      { status: 500 }
    );
  }
}
