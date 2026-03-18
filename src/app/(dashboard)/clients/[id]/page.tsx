"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatCurrency, formatDate } from "@/lib/utils";

interface ClientDetail {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  rut: string | null;
  purchases: Array<{
    id: string;
    saleNumber: string;
    total: number;
    paymentStatus: string;
    createdAt: string;
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
    }>;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    date: string;
    saleNumber: string;
  }>;
  balance: number;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchClient() {
      try {
        const res = await fetch(`/api/clients/${clientId}`);
        if (!res.ok) throw new Error("Error al cargar cliente");
        const json = await res.json();
        setClient(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    fetchClient();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Cargando cliente...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-600">{error}</div>
    );
  }

  if (!client) return null;

  const paymentStatusLabel: Record<string, string> = {
    PAID: "Pagado",
    PARTIAL: "Parcial",
    PENDING: "Pendiente",
  };

  const paymentStatusVariant: Record<string, "default" | "secondary" | "destructive"> = {
    PAID: "default",
    PARTIAL: "secondary",
    PENDING: "destructive",
  };

  const paymentMethodLabel: Record<string, string> = {
    CASH: "Efectivo",
    TRANSFER: "Transferencia",
    CHECK: "Cheque",
    CREDIT_CARD: "Tarjeta de Credito",
    OTHER: "Otro",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          {client.company && (
            <p className="text-muted-foreground">{client.company}</p>
          )}
        </div>
        <Button variant="outline" onClick={() => router.push("/clients")}>
          Volver
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informacion de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Email:</span>{" "}
              {client.email || "-"}
            </p>
            <p>
              <span className="font-medium">Telefono:</span>{" "}
              {client.phone || "-"}
            </p>
            <p>
              <span className="font-medium">Direccion:</span>{" "}
              {client.address || "-"}
            </p>
            <p>
              <span className="font-medium">RUT:</span> {client.rut || "-"}
            </p>
          </CardContent>
        </Card>

        {/* Outstanding Balance */}
        <Card>
          <CardHeader>
            <CardTitle>Saldo Pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold ${
                client.balance > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {formatCurrency(client.balance)}
            </p>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Total Compras:</span>{" "}
              {client.purchases.length}
            </p>
            <p>
              <span className="font-medium">Total Pagos:</span>{" "}
              {client.payments.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Purchase History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Compras</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N.ro Venta</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado Pago</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.purchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell className="font-medium">
                    {purchase.saleNumber}
                  </TableCell>
                  <TableCell>
                    {purchase.items
                      .map(
                        (item) =>
                          `${item.productName} x${item.quantity}`
                      )
                      .join(", ")}
                  </TableCell>
                  <TableCell>{formatCurrency(purchase.total)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        paymentStatusVariant[purchase.paymentStatus] || "outline"
                      }
                    >
                      {paymentStatusLabel[purchase.paymentStatus] ||
                        purchase.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(purchase.createdAt)}</TableCell>
                </TableRow>
              ))}
              {client.purchases.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    No hay compras registradas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Venta</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Metodo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(payment.date)}</TableCell>
                  <TableCell>{payment.saleNumber}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>
                    {paymentMethodLabel[payment.method] || payment.method}
                  </TableCell>
                </TableRow>
              ))}
              {client.payments.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    No hay pagos registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
