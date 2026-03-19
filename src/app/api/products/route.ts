import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const subcategory = searchParams.get("subcategory");

    const where: Record<string, unknown> = {};

    if (category) where.category = category;
    if (subcategory) where.subcategory = subcategory;

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { brand: { contains: search } },
        { sku: { contains: search } },
        { subcategory: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        discounts: true,
        _count: { select: { units: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Error fetching products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { discounts, ...productData } = body;

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data: productData });

      if (discounts && discounts.length > 0) {
        await tx.productDiscount.createMany({
          data: discounts.map((d: { type: string; value: number; label?: string }) => ({
            productId: created.id,
            type: d.type,
            value: d.value,
            label: d.label ?? null,
          })),
        });
      }

      return tx.product.findUnique({
        where: { id: created.id },
        include: { discounts: true, _count: { select: { units: true } } },
      });
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Error creating product" }, { status: 500 });
  }
}
