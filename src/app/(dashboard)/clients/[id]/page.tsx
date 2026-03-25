"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/contexts/currency-context";
import { CallDialog } from "@/components/call-dialog";
import { UserSearchSelect } from "@/components/user-search-select";
import { Pencil, FileText, CalendarDays, Phone, ShoppingCart, CreditCard, ChevronLeft, MapPin } from "lucide-react";

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
  const { format: formatCurrency } = useCurrency();
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [visitSaving, setVisitSaving] = useState(false);
  const [visitForm, setVisitForm] = useState({ assignedToId: "", scheduledDate: "", notes: "" });

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
    fetch("/api/users").then((r) => r.json()).then((d) => setUsers(Array.isArray(d) ? d : [])).catch(() => {});
  }, [clientId]);

  async function handleCreateVisit(e: React.FormEvent) {
    e.preventDefault();
    setVisitSaving(true);
    try {
      await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: clientId, ...visitForm }),
      });
      setVisitDialogOpen(false);
      setVisitForm({ assignedToId: "", scheduledDate: "", notes: "" });
    } catch (err) { console.error(err); }
    finally { setVisitSaving(false); }
  }

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="p-0 h-auto text-muted-foreground hover:text-foreground mb-1" onClick={() => router.push("/clients")}>
            <ChevronLeft className="h-4 w-4" />Clientes
          </Button>
          <h1 className="text-3xl font-bold">{client.company || client.name}</h1>
          <p className="text-sm text-muted-foreground">{client.name}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/leads/${clientId}`}>
              <Pencil className="h-4 w-4 mr-1" />Editar
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/quotes?contactId=${clientId}`}>
              <FileText className="h-4 w-4 mr-1" />Presupuesto
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/sales?contactId=${clientId}`}>
              <ShoppingCart className="h-4 w-4 mr-1" />Crear Venta
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setVisitDialogOpen(true)}>
            <CalendarDays className="h-4 w-4 mr-1" />Visita
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCallDialogOpen(true)}>
            <Phone className="h-4 w-4 mr-1" />Llamada
          </Button>
          <Button variant="outline" size="sm" onClick={() => document.getElementById("payments-section")?.scrollIntoView({ behavior: "smooth" })}>
            <CreditCard className="h-4 w-4 mr-1" />Pagos
          </Button>
        </div>
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
      <Card id="payments-section">
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

      {/* Map */}
      {client.address && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Ubicación</CardTitle></CardHeader>
          <CardContent>
            <iframe
              className="w-full h-[300px] rounded-md border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(client.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
            />
          </CardContent>
        </Card>
      )}

      {/* Visit Dialog */}
      <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agendar Visita</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateVisit} className="space-y-4">
            <div className="space-y-2">
              <Label>Asignar a</Label>
              <UserSearchSelect
                users={users}
                value={visitForm.assignedToId || ""}
                onValueChange={(v) => setVisitForm({ ...visitForm, assignedToId: v })}
                placeholder="Seleccionar..."
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha y hora *</Label>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={visitForm.scheduledDate}
                onChange={(e) => setVisitForm({ ...visitForm, scheduledDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={visitForm.notes} onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setVisitDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={visitSaving}>{visitSaving ? "Agendando..." : "Agendar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CallDialog open={callDialogOpen} onOpenChange={setCallDialogOpen} contactId={clientId} />
    </div>
  );
}
