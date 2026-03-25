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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useCurrency } from "@/contexts/currency-context";
import { CallDialog } from "@/components/call-dialog";
import { UserSearchSelect } from "@/components/user-search-select";
import {
  Pencil, FileText, CalendarDays, Phone, ChevronLeft, Check, X, Clock, User, MapPin,
} from "lucide-react";

interface CallItem {
  id: string;
  scheduledAt: string;
  durationMin: number | null;
  completed: boolean;
  notes: string | null;
  assignedTo: { name: string } | null;
}

interface Visit {
  id: string;
  scheduledDate: string;
  notes: string | null;
  completed: boolean;
  assignedTo: { name: string } | null;
}

interface Quote {
  id: string;
  number: number;
  total: number;
  status: string;
  createdAt: string;
}

interface LeadDetail {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  sector: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  contacted: boolean;
  contactMethod: string | null;
  contactDate: string | null;
  assignedToId: string | null;
  notes: string | null;
  vehicleFlowWeekly: number | null;
  architecturalFlowMonthly: number | null;
  currentSupplier: string | null;
  currentSupplierPrices: string | null;
  avatarUrl: string | null;
  assignedTo: { id: string; name: string } | null;
  visits: Visit[];
  calls: CallItem[];
  quotes: Quote[];
}

const quoteStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SENT: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CONVERTED: "bg-purple-100 text-purple-800",
};

const quoteStatusLabels: Record<string, string> = {
  DRAFT: "Borrador", SENT: "Enviado", ACCEPTED: "Aceptado",
  REJECTED: "Rechazado", CONVERTED: "Convertido",
};

const sectorLabels: Record<string, string> = {
  AUTOMOTRIZ: "Automotriz", ARQUITECTURA: "Arquitectura", SOFTWARE: "Software",
};

const contactMethodLabels: Record<string, string> = {
  PHONE: "Teléfono", WHATSAPP: "WhatsApp", EMAIL: "Email", IN_PERSON: "En Persona", NONE: "Sin definir",
};

export default function LeadDetailPage() {
  const { format: formatCurrency } = useCurrency();
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);

  const [form, setForm] = useState({
    firstName: "", lastName: "", company: "", sector: "", email: "",
    phone: "", whatsapp: "", address: "", city: "", notes: "",
    contacted: false, contactMethod: "", contactDate: "", assignedToId: "",
    vehicleFlowWeekly: "", architecturalFlowMonthly: "", currentSupplier: "",
    currentSupplierPrices: "", avatarUrl: "",
  });

  const [visitForm, setVisitForm] = useState({ assignedToId: "", scheduledDate: "", notes: "" });

  function populateForm(data: LeadDetail) {
    setForm({
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      company: data.company || "",
      sector: data.sector || "",
      email: data.email || "",
      phone: data.phone || "",
      whatsapp: data.whatsapp || "",
      address: data.address || "",
      city: data.city || "",
      notes: data.notes || "",
      contacted: data.contacted || false,
      contactMethod: data.contactMethod || "",
      contactDate: data.contactDate ? new Date(data.contactDate).toISOString().split("T")[0] : "",
      assignedToId: data.assignedTo?.id || "",
      vehicleFlowWeekly: data.vehicleFlowWeekly?.toString() || "",
      architecturalFlowMonthly: data.architecturalFlowMonthly?.toString() || "",
      currentSupplier: data.currentSupplier || "",
      currentSupplierPrices: data.currentSupplierPrices || "",
      avatarUrl: data.avatarUrl || "",
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

  useEffect(() => {
    fetchLead();
    fetch("/api/users").then((r) => r.json()).then((d) => setUsers(Array.isArray(d) ? d : [])).catch(() => {});
  }, [leadId]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName, lastName: form.lastName,
          company: form.company || null, sector: form.sector || null,
          email: form.email || null, phone: form.phone || null,
          whatsapp: form.whatsapp || null, address: form.address || null,
          city: form.city || null, notes: form.notes || null,
          contacted: form.contacted, contactMethod: form.contactMethod || null,
          contactDate: form.contactDate || null,
          assignedToId: form.assignedToId || null,
          vehicleFlowWeekly: form.vehicleFlowWeekly ? parseInt(form.vehicleFlowWeekly) : null,
          architecturalFlowMonthly: form.architecturalFlowMonthly ? parseInt(form.architecturalFlowMonthly) : null,
          currentSupplier: form.currentSupplier || null,
          currentSupplierPrices: form.currentSupplierPrices || null,
          avatarUrl: form.avatarUrl || null,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      await fetchLead();
      setEditMode(false);
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
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: leadId, ...visitForm }),
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

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, avatarUrl: ev.target?.result as string }));
    reader.readAsDataURL(file);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!lead) {
    return <div className="rounded-md bg-red-50 p-4 text-red-600">{error || "Lead no encontrado"}</div>;
  }

  const initials = ((lead.firstName?.[0] ?? "") + (lead.lastName?.[0] ?? "")).toUpperCase() || "?";

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          {editMode ? (
            <label className="relative cursor-pointer group shrink-0" title="Cambiar foto">
              <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} />
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt={lead.firstName} className="w-16 h-16 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground border-2 border-border">
                  {initials}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-[10px] font-medium">Cambiar</span>
              </div>
            </label>
          ) : (
            lead.avatarUrl ? (
              <img src={lead.avatarUrl} alt={lead.firstName} className="w-16 h-16 rounded-full object-cover border-2 border-border shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground border-2 border-border shrink-0">
                {initials}
              </div>
            )
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="sm" className="p-0 h-auto text-muted-foreground hover:text-foreground" onClick={() => router.push("/leads")}>
                <ChevronLeft className="h-4 w-4" />Leads
              </Button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
              {lead.company || `${lead.firstName} ${lead.lastName}`}
            </h1>
            <p className="text-sm text-muted-foreground">{lead.firstName} {lead.lastName}</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {editMode ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setEditMode(false); populateForm(lead); setError(""); }}>
                <X className="h-4 w-4 mr-1" />Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Check className="h-4 w-4 mr-1" />{saving ? "Guardando..." : "Guardar"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                <Pencil className="h-4 w-4 mr-1" />Editar
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/quotes?contactId=${lead.id}`}>
                  <FileText className="h-4 w-4 mr-1" />Presupuesto
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setVisitDialogOpen(true)}>
                <CalendarDays className="h-4 w-4 mr-1" />Visita
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCallDialogOpen(true)}>
                <Phone className="h-4 w-4 mr-1" />Llamada
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {editMode ? (
        /* ── EDIT MODE ── */
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Información de Contacto</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nombre</Label>
                  <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Apellido</Label>
                  <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Empresa</Label>
                  <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Rubro</Label>
                  <Select value={form.sector || undefined} onValueChange={(v) => setForm({ ...form, sector: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUTOMOTRIZ">Automotriz</SelectItem>
                      <SelectItem value="ARQUITECTURA">Arquitectura</SelectItem>
                      <SelectItem value="SOFTWARE">Software</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Dirección</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Av. Ejemplo 1234" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Teléfono</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+54 9 11 XXXX-XXXX" />
              </div>
              <div className="space-y-1">
                <Label>Notas</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Seguimiento</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Asignado a</Label>
                <UserSearchSelect
                  users={users}
                  value={form.assignedToId || ""}
                  onValueChange={(v) => setForm({ ...form, assignedToId: v })}
                  placeholder="Sin asignar"
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="contacted" checked={form.contacted} onChange={(e) => setForm({ ...form, contacted: e.target.checked })} className="h-4 w-4" />
                <Label htmlFor="contacted">Contactado</Label>
              </div>
              <div className="space-y-1">
                <Label>Vía de contacto</Label>
                <Select value={form.contactMethod || undefined} onValueChange={(v) => setForm({ ...form, contactMethod: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHONE">Teléfono</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="IN_PERSON">En Persona</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fecha de Contacto</Label>
                <Input type="date" value={form.contactDate} onChange={(e) => setForm({ ...form, contactDate: e.target.value })} />
              </div>
              <Separator />
              <h3 className="font-semibold">Inteligencia del Lead</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Flujo Vehicular Semanal</Label>
                  <Input type="number" value={form.vehicleFlowWeekly} onChange={(e) => setForm({ ...form, vehicleFlowWeekly: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Flujo Arquitectónico Mensual</Label>
                  <Input type="number" value={form.architecturalFlowMonthly} onChange={(e) => setForm({ ...form, architecturalFlowMonthly: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Proveedor Actual</Label>
                <Input value={form.currentSupplier} onChange={(e) => setForm({ ...form, currentSupplier: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Precios del Proveedor Actual</Label>
                <Textarea value={form.currentSupplierPrices} onChange={(e) => setForm({ ...form, currentSupplierPrices: e.target.value })} placeholder='{"producto": "precio", ...}' rows={3} />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ── VIEW MODE ── */
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Información de Contacto</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { label: "Empresa", value: lead.company },
                { label: "Rubro", value: lead.sector ? sectorLabels[lead.sector] : null },
                { label: "Email", value: lead.email },
                { label: "Teléfono", value: lead.phone },
                { label: "WhatsApp", value: lead.whatsapp },
                { label: "Dirección", value: lead.address },
                { label: "Ciudad", value: lead.city },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex justify-between gap-4 py-1.5 border-b last:border-0">
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <span className="text-right break-all">{value}</span>
                </div>
              ) : null)}
              {lead.notes && (
                <div className="pt-2">
                  <p className="text-muted-foreground text-xs mb-1">Notas</p>
                  <p className="whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Seguimiento</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { label: "Asignado a", value: lead.assignedTo?.name },
                { label: "Contactado", value: lead.contacted ? "Sí" : "No" },
                { label: "Vía de contacto", value: lead.contactMethod ? contactMethodLabels[lead.contactMethod] : null },
                { label: "Fecha de contacto", value: lead.contactDate ? formatDate(lead.contactDate) : null },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4 py-1.5 border-b last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span>{value ?? "—"}</span>
                </div>
              ))}
              {(lead.vehicleFlowWeekly || lead.architecturalFlowMonthly || lead.currentSupplier) && (
                <>
                  <Separator />
                  <h3 className="font-semibold text-sm pt-1">Inteligencia del Lead</h3>
                  {lead.vehicleFlowWeekly && (
                    <div className="flex justify-between gap-4 py-1.5 border-b">
                      <span className="text-muted-foreground">Flujo vehicular semanal</span>
                      <span>{lead.vehicleFlowWeekly} vehículos</span>
                    </div>
                  )}
                  {lead.architecturalFlowMonthly && (
                    <div className="flex justify-between gap-4 py-1.5 border-b">
                      <span className="text-muted-foreground">Flujo arquitectónico mensual</span>
                      <span>{lead.architecturalFlowMonthly} proyectos</span>
                    </div>
                  )}
                  {lead.currentSupplier && (
                    <div className="flex justify-between gap-4 py-1.5 border-b last:border-0">
                      <span className="text-muted-foreground">Proveedor actual</span>
                      <span>{lead.currentSupplier}</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Map */}
      {(lead.address || lead.city) && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Ubicación</CardTitle></CardHeader>
          <CardContent>
            <iframe
              className="w-full h-[300px] rounded-md border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${encodeURIComponent([lead.address, lead.city].filter(Boolean).join(", "))}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
            />
          </CardContent>
        </Card>
      )}

      {/* Quotes */}
      <Card>
        <CardHeader><CardTitle>Presupuestos</CardTitle></CardHeader>
        <CardContent>
          {lead.quotes && lead.quotes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lead.quotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.number}</TableCell>
                    <TableCell>{formatCurrency(q.total)}</TableCell>
                    <TableCell>
                      <Badge className={quoteStatusColors[q.status] || ""}>{quoteStatusLabels[q.status] || q.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(q.createdAt)}</TableCell>
                    <TableCell>
                      <Link href={`/quotes/${q.id}`}><Button variant="ghost" size="sm">Ver</Button></Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No hay presupuestos para este lead</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Visits */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Visitas</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setVisitDialogOpen(true)}>
              <CalendarDays className="h-4 w-4 mr-1" />Agendar
            </Button>
          </CardHeader>
          <CardContent>
            {lead.visits.length > 0 ? (
              <div className="space-y-2">
                {lead.visits.map((v) => (
                  <div key={v.id} className="rounded-md border p-3 text-sm flex items-start justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />{formatDateTime(v.scheduledDate)}
                      </p>
                      {v.assignedTo && <p className="text-muted-foreground flex items-center gap-1 mt-0.5"><User className="h-3 w-3" />{v.assignedTo.name}</p>}
                      {v.notes && <p className="mt-1 text-muted-foreground">{v.notes}</p>}
                    </div>
                    {v.completed && <Badge variant="secondary" className="shrink-0">Completada</Badge>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay visitas agendadas</p>
            )}
          </CardContent>
        </Card>

        {/* Calls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Llamadas</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setCallDialogOpen(true)}>
              <Phone className="h-4 w-4 mr-1" />Agendar
            </Button>
          </CardHeader>
          <CardContent>
            {lead.calls && lead.calls.length > 0 ? (
              <div className="space-y-2">
                {lead.calls.map((c) => (
                  <div key={c.id} className="rounded-md border p-3 text-sm flex items-start justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />{formatDateTime(c.scheduledAt)}
                        {c.durationMin && <span className="text-muted-foreground ml-1">({c.durationMin} min)</span>}
                      </p>
                      {c.assignedTo && <p className="text-muted-foreground flex items-center gap-1 mt-0.5"><User className="h-3 w-3" />{c.assignedTo.name}</p>}
                      {c.notes && <p className="mt-1 text-muted-foreground">{c.notes}</p>}
                    </div>
                    {c.completed && <Badge variant="secondary" className="shrink-0">Completada</Badge>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay llamadas agendadas</p>
            )}
          </CardContent>
        </Card>
      </div>

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
              <Button type="submit" disabled={saving}>{saving ? "Agendando..." : "Agendar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Call Dialog */}
      <CallDialog open={callDialogOpen} onOpenChange={setCallDialogOpen} contactId={leadId} onCreated={fetchLead} />
    </div>
  );
}
