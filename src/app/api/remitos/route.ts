import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const remitos = await prisma.remito.findMany({
      include: {
        sale: {
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true, company: true },
            },
            items: {
              include: {
                product: {
                  select: { id: true, name: true, category: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(remitos);
  } catch (error) {
    console.error("Error fetching remitos:", error);
    return NextResponse.json(
      { error: "Error fetching remitos" },
      { status: 500 }
    );
  }
}
