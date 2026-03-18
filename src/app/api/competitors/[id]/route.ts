import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductCategory } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const competitor = await prisma.competitor.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });

    if (!competitor) {
      return NextResponse.json(
        { error: "Competitor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(competitor);
  } catch (error) {
    console.error("Error fetching competitor:", error);
    return NextResponse.json(
      { error: "Error fetching competitor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { products, ...competitorData } = body;

    const competitor = await prisma.$transaction(async (tx) => {
      // Update competitor fields
      const updated = await tx.competitor.update({
        where: { id },
        data: competitorData,
      });

      // If products array is provided, replace all products
      if (products && Array.isArray(products)) {
        await tx.competitorProduct.deleteMany({
          where: { competitorId: id },
        });

        if (products.length > 0) {
          await tx.competitorProduct.createMany({
            data: products.map(
              (p: { name: string; category: string; brand?: string; shade?: string; price: number; notes?: string }) => ({
                competitorId: id,
                name: p.name,
                category: p.category as ProductCategory,
                brand: p.brand,
                shade: p.shade,
                price: p.price,
                notes: p.notes,
              })
            ),
          });
        }
      }

      return updated;
    });

    const result = await prisma.competitor.findUnique({
      where: { id: competitor.id },
      include: { products: true },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating competitor:", error);
    return NextResponse.json(
      { error: "Error updating competitor" },
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

    await prisma.competitor.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Competitor deleted successfully" });
  } catch (error) {
    console.error("Error deleting competitor:", error);
    return NextResponse.json(
      { error: "Error deleting competitor" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const competitor = await prisma.competitor.findUnique({
      where: { id },
    });

    if (!competitor) {
      return NextResponse.json(
        { error: "Competitor not found" },
        { status: 404 }
      );
    }

    const product = await prisma.competitorProduct.create({
      data: {
        competitorId: id,
        ...body,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error adding competitor product:", error);
    return NextResponse.json(
      { error: "Error adding competitor product" },
      { status: 500 }
    );
  }
}
