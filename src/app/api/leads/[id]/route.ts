import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendNotification, escapeHtml } from "@/lib/notifications";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lead = await prisma.contact.findUnique({
      where: { id, type: "LEAD" },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        visits: {
          include: {
            assignedTo: { select: { id: true, name: true } },
          },
          orderBy: { scheduledDate: "desc" },
        },
        calls: {
          include: {
            assignedTo: { select: { id: true, name: true } },
          },
          orderBy: { scheduledAt: "desc" },
        },
        quotes: {
          include: {
            items: { include: { product: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error fetching lead:", error);
    return NextResponse.json(
      { error: "Error fetching lead" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;
    const body = await request.json();

    // Check if assignedToId is changing
    const previousLead = body.assignedToId
      ? await prisma.contact.findUnique({ where: { id }, select: { assignedToId: true, firstName: true, lastName: true, company: true } })
      : null;

    const lead = await prisma.contact.update({
      where: { id },
      data: body,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Notify if assigned to a different user
    if (
      body.assignedToId &&
      previousLead &&
      previousLead.assignedToId !== body.assignedToId &&
      lead.assignedTo &&
      session?.user?.id !== body.assignedToId
    ) {
      const contactName = lead.company || `${lead.firstName} ${lead.lastName}`.trim();
      await sendNotification({
        userId: lead.assignedTo.id,
        userEmail: lead.assignedTo.email!,
        userName: lead.assignedTo.name,
        type: "LEAD_ASSIGNED",
        title: "Lead asignado",
        message: `Se te asignó el lead <strong>${escapeHtml(contactName)}</strong>.`,
        link: `/leads/${id}`,
      });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json(
      { error: "Error updating lead" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.contact.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      { error: "Error deleting lead" },
      { status: 500 }
    );
  }
}
