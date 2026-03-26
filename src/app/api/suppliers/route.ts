import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const suppliers = await prisma.supplier.findMany({
      where: { active: true },
      include: {
        _count: { select: { purchaseOrders: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json({ error: "Error fetching suppliers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { name, country, contactName, contactEmail, contactPhone, currency, leadTimeDays, notes } = body;

    if (!name) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        country,
        contactName,
        contactEmail,
        contactPhone,
        currency: currency ?? "USD",
        leadTimeDays: leadTimeDays ? parseInt(leadTimeDays) : null,
        notes,
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("Error creating supplier:", error);
    return NextResponse.json({ error: "Error creating supplier" }, { status: 500 });
  }
}
