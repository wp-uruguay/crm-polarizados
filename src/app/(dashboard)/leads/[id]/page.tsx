"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectOption } from "@/components/ui/select";
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
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

interface Visit {
  id: string;
  scheduledDate: string;
  notes: string | null;
  assignedTo: { name: string } | null;
}

interface Quote {
  id: string;
  quoteNumber: string;
  total: number;
  status: string;
  createdAt: string;
}

interface LeadDetail {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  contacted: boolean;
  contactMethod: string | null;
  contactDate: string | null;
  notes: string | null;
  vehicleFlowWeekly: number | null;
  architecturalFlowMonthly: number | null;
  currentSupplier: string | null;
  currentSupplierPrices: string | null;
  assignedTo: { id: string; name: string } | null;
  visits: Visit[];
  quotes: Quote[];
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    company: "",
    email: "",
    phone: "",
    whatsapp: "",
    city: "",
    notes: "",
    contacted: false,
    contactMethod: "",
    contactDate: "",
    vehicleFlowWeekly: "",
    architecturalFlowMonthly: "",
    currentSupplier: "",
    currentSupplierPrices: "",
  });

  const [visitForm, setVisitForm] = useState({
    assignedToId: "",
    scheduledDate: "",
    notes: "",
  });

  function populateForm(data: LeadDetail) {
    setForm({
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      company: data.company || "",
      email: data.email || "",
      phone: data.phone || "",
      whatsapp: data.whatsapp || "",
      city: data.city || "",
      notes: data.notes || "",
      contacted: data.contacted || false,
      contactMethod: data.contactMethod || "",
      contactDate: data.contactDate
        ? new Date(data.contactDate).toISOString().split("T")[0]
        : "",
      vehicleFlowWeekly: data.vehicleFlowWeekly?.toString() || "",
      architecturalFlowMonthly:
        data.architecturalFlowMonthly?.toString() || "",
      currentSupplier: data.currentSupplier || "",
      currentSupplierPrices: data.currentSupplierPrices || "",
    });
  }

  async function fetchLead() {
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (!res.ok) throw new Error("Error al cargar lead");
      const json = await res.json();
      setLead(json);
      populateForm(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const json = await res.json();
        setUsers(json);
      }
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    fetchLead();
    fetchUsers();
  }, [leadId]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const body = {
        firstName: form.firstName,
        lastName: form.lastName,
        company: form.company || null,
        email: form.email || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        city: form.city || null,
        notes: form.notes || null,
        contacted: form.contacted,
        contactMethod: form.contactMethod || null,
        contactDate: form.contactDate || null,
        vehicleFlowWeekly: form.vehicleFlowWeekly
          ? parseInt(form.vehicleFlowWeekly)
          : null,
        architecturalFlowMonthly: form.architecturalFlowMonthly
          ? parseInt(form.architecturalFlowMonthly)
          : null,
        currentSupplier: form.currentSupplier || null,
        currentSupplierPrices: form.currentSupplierPrices || null,
      };
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Error al guardar");
      fetchLead();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateVisit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visitForm),
      });
      if (!res.ok) throw new Error("Error al crear visita");
      setVisitDialogOpen(false);
      setVisitForm({ assignedToId: "", scheduledDate: "", notes: "" });
      fetchLead();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear visita");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error && !lead) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-600">{error}</div>
    );
  }

  if (!lead) return null;

  const contactMethodOptions = [
    { value: "", label: "Seleccionar..." },
    { value: "PHONE", label: "Telefono" },
    { value: "WHATSAPP", label: "WhatsApp" },
    { value: "EMAIL", label: "Email" },
    { value: "IN_PERSON", label: "En Persona" },
  ];

  const quoteStatusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    SENT: "bg-blue-100 text-blue-800",
    ACCEPTED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    CONVERTED: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {lead.firstName} {lead.lastName}
          </h1>
          {lead.company && (
            <p className="text-muted-foreground">{lead.company}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push(`/quotes?contactId=${lead.id}`)}
          >
            Crear Presupuesto
          </Button>
          <Button variant="outline" onClick={() => router.push("/leads")}>
            Volver
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informacion de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nombre</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Apellido</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Empresa</Label>
              <Input
                value={form.company}
                onChange={(e) =>
                  setForm({ ...form, company: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Telefono</Label>
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>WhatsApp</Label>
                <Input
                  value={form.whatsapp}
                  onChange={(e) =>
                    setForm({ ...form, whatsapp: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Ciudad</Label>
                <Input
                  value={form.city}
                  onChange={(e) =>
                    setForm({ ...form, city: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Tracking + Intel */}
        <Card>
          <CardHeader>
            <CardTitle>Seguimiento de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="contacted"
                checked={form.contacted}
                onChange={(e) =>
                  setForm({ ...form, contacted: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="contacted">Contactado</Label>
            </div>
            <div className="space-y-1">
              <Label>Metodo de Contacto</Label>
              <Select
                value={form.contactMethod}
                onChange={(e) =>
                  setForm({ ...form, contactMethod: e.target.value })
                }
              >
                {contactMethodOptions.map((opt) => (
                  <SelectOption key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectOption>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Fecha de Contacto</Label>
              <Input
                type="date"
                value={form.contactDate}
                onChange={(e) =>
                  setForm({ ...form, contactDate: e.target.value })
                }
              />
            </div>

            <Separator />

            <h3 className="font-semibold text-lg pt-2">
              Inteligencia del Lead
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Flujo Vehicular Semanal</Label>
                <Input
                  type="number"
                  value={form.vehicleFlowWeekly}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      vehicleFlowWeekly: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Flujo Arquitectonico Mensual</Label>
                <Input
                  type="number"
                  value={form.architecturalFlowMonthly}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      architecturalFlowMonthly: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Proveedor Actual</Label>
              <Input
                value={form.currentSupplier}
                onChange={(e) =>
                  setForm({ ...form, currentSupplier: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Precios del Proveedor Actual (JSON)</Label>
              <Textarea
                value={form.currentSupplierPrices}
                onChange={(e) =>
                  setForm({
                    ...form,
                    currentSupplierPrices: e.target.value,
                  })
                }
                placeholder='{"producto": "precio", ...}'
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save All button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? "Guardando..." : "Guardar Todos los Cambios"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Visits */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Visitas</CardTitle>
            <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
              <DialogTrigger>
                <Button size="sm">Agendar Visita</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agendar Nueva Visita</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateVisit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Asignar a</Label>
                    <Select
                      value={visitForm.assignedToId}
                      onChange={(e) =>
                        setVisitForm({
                          ...visitForm,
                          assignedToId: e.target.value,
                        })
                      }
                    >
                      <SelectOption value="">Seleccionar...</SelectOption>
                      {users.map((user) => (
                        <SelectOption key={user.id} value={user.id}>
                          {user.name}
                        </SelectOption>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Programada *</Label>
                    <Input
                      type="datetime-local"
                      value={visitForm.scheduledDate}
                      onChange={(e) =>
                        setVisitForm({
                          ...visitForm,
                          scheduledDate: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notas</Label>
                    <Textarea
                      value={visitForm.notes}
                      onChange={(e) =>
                        setVisitForm({
                          ...visitForm,
                          notes: e.target.value,
                        })
                      }
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Agendando..." : "Agendar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {lead.visits.length > 0 ? (
              <div className="space-y-3">
                {lead.visits.map((visit) => (
                  <div
                    key={visit.id}
                    className="rounded-md border p-3 text-sm"
                  >
                    <p className="font-medium">
                      {formatDateTime(visit.scheduledDate)}
                    </p>
                    {visit.assignedTo && (
                      <p className="text-muted-foreground">
                        Asignado a: {visit.assignedTo.name}
                      </p>
                    )}
                    {visit.notes && <p className="mt-1">{visit.notes}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay visitas agendadas
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quotes */}
        <Card>
          <CardHeader>
            <CardTitle>Presupuestos</CardTitle>
          </CardHeader>
          <CardContent>
            {lead.quotes && lead.quotes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lead.quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">
                        {quote.quoteNumber}
                      </TableCell>
                      <TableCell>{formatCurrency(quote.total)}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            quoteStatusColors[quote.status] || ""
                          }
                        >
                          {quote.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(quote.createdAt)}</TableCell>
                      <TableCell>
                        <Link href={`/quotes/${quote.id}`}>
                          <Button variant="outline" size="sm">
                            Ver
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay presupuestos para este lead
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
