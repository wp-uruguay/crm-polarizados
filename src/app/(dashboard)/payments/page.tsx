"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectOption } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Payment {
  id: string;
  date: string;
  clientName: string;
  saleNumber: string;
  amount: number;
  method: string;
}

interface Debt {
  id: string;
  clientName: string;
  saleNumber: string;
  saleId: string;
  total: number;
  paid: number;
  remaining: number;
}

const paymentMethodLabel: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CHECK: "Cheque",
  CREDIT_CARD: "Tarjeta de Credito",
  OTHER: "Otro",
};

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<"payments" | "debts">("payments");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    saleId: "",
    amount: "",
    method: "CASH",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  async function fetchPayments() {
    try {
      const res = await fetch("/api/payments");
      if (!res.ok) throw new Error("Error al cargar pagos");
      const json = await res.json();
      setPayments(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  async function fetchDebts() {
    try {
      const res = await fetch("/api/payments/debts");
      if (!res.ok) throw new Error("Error al cargar deudas");
      const json = await res.json();
      setDebts(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  useEffect(() => {
    async function loadData() {
      await Promise.all([fetchPayments(), fetchDebts()]);
      setLoading(false);
    }
    loadData();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
        }),
      });
      if (!res.ok) throw new Error("Error al registrar pago");
      setDialogOpen(false);
      setForm({
        saleId: "",
        amount: "",
        method: "CASH",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      fetchPayments();
      fetchDebts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al registrar pago"
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pagos</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button>Registrar Pago</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Pago</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Venta *</Label>
                <Select
                  value={form.saleId}
                  onChange={(e) =>
                    setForm({ ...form, saleId: e.target.value })
                  }
                  required
                >
                  <SelectOption value="">Seleccionar venta...</SelectOption>
                  {debts.map((debt) => (
                    <SelectOption key={debt.saleId} value={debt.saleId}>
                      {debt.saleNumber} - {debt.clientName} (Debe:{" "}
                      {formatCurrency(debt.remaining)})
                    </SelectOption>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Metodo de Pago *</Label>
                  <Select
                    value={form.method}
                    onChange={(e) =>
                      setForm({ ...form, method: e.target.value })
                    }
                  >
                    <SelectOption value="CASH">Efectivo</SelectOption>
                    <SelectOption value="TRANSFER">Transferencia</SelectOption>
                    <SelectOption value="CHECK">Cheque</SelectOption>
                    <SelectOption value="CREDIT_CARD">
                      Tarjeta de Credito
                    </SelectOption>
                    <SelectOption value="OTHER">Otro</SelectOption>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm({ ...form, date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Input
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating ? "Registrando..." : "Registrar Pago"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "payments"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("payments")}
        >
          Pagos Realizados
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "debts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("debts")}
        >
          Deudas Pendientes
        </button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">
          Cargando...
        </p>
      ) : error ? (
        <div className="rounded-md bg-red-50 p-4 text-red-600">{error}</div>
      ) : activeTab === "payments" ? (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Venta</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Metodo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell>{payment.clientName}</TableCell>
                    <TableCell>{payment.saleNumber}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>
                      {paymentMethodLabel[payment.method] || payment.method}
                    </TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
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
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Venta</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pagado</TableHead>
                  <TableHead>Restante</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debts.map((debt) => (
                  <TableRow key={debt.id}>
                    <TableCell className="font-medium">
                      {debt.clientName}
                    </TableCell>
                    <TableCell>{debt.saleNumber}</TableCell>
                    <TableCell>{formatCurrency(debt.total)}</TableCell>
                    <TableCell>{formatCurrency(debt.paid)}</TableCell>
                    <TableCell>
                      <span className="font-medium text-red-600">
                        {formatCurrency(debt.remaining)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => {
                          setForm({
                            ...form,
                            saleId: debt.saleId,
                            amount: debt.remaining.toString(),
                          });
                          setDialogOpen(true);
                        }}
                      >
                        Pagar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {debts.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      No hay deudas pendientes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
