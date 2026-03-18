"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardData {
  totalLeads: number;
  totalClients: number;
  monthlySales: number;
  monthlyRevenue: number;
  pendingPayments: number;
  lowStockProducts: number;
  recentSales: Array<{
    id: string;
    number: number;
    contact: { firstName: string; lastName: string };
    total: string;
    payments: Array<{ amount: string }>;
    createdAt: string;
  }>;
  monthlyData: Array<{
    month: string;
    revenue: number;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error("Error al cargar datos");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-600">{error}</div>
    );
  }

  if (!data) return null;

  const statCards = [
    { title: "Leads", value: data.totalLeads },
    { title: "Clientes", value: data.totalClients },
    { title: "Ventas del Mes", value: data.monthlySales },
    { title: "Ingresos del Mes", value: formatCurrency(data.monthlyRevenue) },
    { title: "Pagos Pendientes", value: formatCurrency(data.pendingPayments) },
    { title: "Stock Bajo", value: data.lowStockProducts },
  ];

  const paymentStatusLabel: Record<string, string> = {
    PAID: "Pagado",
    PARTIAL: "Parcial",
    PENDING: "Pendiente",
  };

  const paymentStatusVariant: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    PAID: "default",
    PARTIAL: "secondary",
    PENDING: "destructive",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Panel de Control</h1>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Sales Table */}
        <Card>
          <CardHeader>
            <CardTitle>Ventas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentSales.map((sale) => {
                  const paid = sale.payments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;
                  const total = parseFloat(sale.total);
                  const status = paid >= total ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING";
                  return (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">
                        <Link href={`/sales`} className="text-primary hover:underline">
                          #{sale.number}
                        </Link>
                      </TableCell>
                      <TableCell>{sale.contact?.firstName} {sale.contact?.lastName}</TableCell>
                      <TableCell>{formatCurrency(sale.total)}</TableCell>
                      <TableCell>
                        <Badge variant={paymentStatusVariant[status] || "outline"}>
                          {paymentStatusLabel[status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(sale.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
                {data.recentSales.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      No hay ventas recientes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Monthly Revenue Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos Mensuales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(Number(value)),
                      "Ingresos",
                    ]}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
