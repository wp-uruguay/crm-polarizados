import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SCRAPP_TAG = { name: "Scrapp", color: "#f97316" }; // orange

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Find or create the "Scrapp" tag
    const tag = await prisma.tag.upsert({
      where: { name: SCRAPP_TAG.name },
      update: {},
      create: SCRAPP_TAG,
    });

    // Create the lead and link the tag in one transaction
    const lead = await prisma.contact.create({
      data: {
        ...body,
        type: "LEAD" as const,
        tags: {
          create: { tagId: tag.id },
        },
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Error adding scrapp lead:", error);
    return NextResponse.json({ error: "Error al agregar lead" }, { status: 500 });
  }
}
