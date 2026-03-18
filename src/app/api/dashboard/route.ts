import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Run all queries in parallel
    const [
      totalLeads,
      totalClients,
      salesThisMonth,
      allPayments,
      lowStockProducts,
      recentSales,
      monthlySalesRaw,
      allSales,
    ] = await Promise.all([
      // Total leads
      prisma.contact.count({ where: { type: "LEAD" } }),

      // Total clients
      prisma.contact.count({ where: { type: "CLIENT" } }),

      // Sales this month
      prisma.sale.findMany({
        where: {
          createdAt: { gte: startOfMonth },
        },
      }),

      // All payments for pending calculation
      prisma.payment.findMany(),

      // Placeholder for low stock (calculated via raw query below)
      Promise.resolve(0),

      // Recent sales (last 5)
      prisma.sale.findMany({
        take: 5,
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, company: true },
          },
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // Monthly sales for chart (last 6 months)
      prisma.sale.findMany({
        where: {
          createdAt: { gte: sixMonthsAgo },
        },
        select: {
          total: true,
          createdAt: true,
        },
      }),

      // All sales for pending payments calculation
      prisma.sale.findMany({
        include: { payments: true },
      }),
    ]);

    // Calculate totals for this month
    const totalSalesThisMonth = salesThisMonth.length;
    const totalRevenueThisMonth = salesThisMonth.reduce(
      (sum, sale) => sum + Number(sale.total),
      0
    );

    // Calculate pending payments
    const pendingPaymentsAmount = allSales.reduce((sum, sale) => {
      const totalPaid = sale.payments.reduce(
        (pSum, payment) => pSum + Number(payment.amount),
        0
      );
      const remaining = Number(sale.total) - totalPaid;
      return sum + (remaining > 0 ? remaining : 0);
    }, 0);

    // Low stock count using raw query since field comparison isn't directly supported
    const lowStockCount = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM products WHERE active = true AND stock <= minStock
    `;

    // Aggregate monthly sales data
    const monthlyData: Record<string, { month: string; sales: number; revenue: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthNames = [
        "Ene", "Feb", "Mar", "Abr", "May", "Jun",
        "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
      ];
      monthlyData[key] = {
        month: monthNames[date.getMonth()],
        sales: 0,
        revenue: 0,
      };
    }

    for (const sale of monthlySalesRaw) {
      const date = new Date(sale.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyData[key]) {
        monthlyData[key].sales += 1;
        monthlyData[key].revenue += Number(sale.total);
      }
    }

    return NextResponse.json({
      totalLeads,
      totalClients,
      monthlySales: totalSalesThisMonth,
      monthlyRevenue: totalRevenueThisMonth,
      pendingPayments: pendingPaymentsAmount,
      lowStockProducts: Number(lowStockCount[0].count),
      recentSales,
      monthlyData: Object.values(monthlyData),
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Error fetching dashboard data" },
      { status: 500 }
    );
  }
}
