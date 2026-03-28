"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MapPin, Mail, Filter, Send, User, Plus,
  ChevronDown, ChevronRight, Headphones, Search, ArrowUpDown, ArrowUp, ArrowDown,
  CheckCircle2, DollarSign, Tag, X, Settings2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SoporteModal } from "@/components/soporte-modal";
import { useCurrency } from "@/contexts/currency-context";

// ── WhatsApp SVG ──────────────────────────────────────────────────────────────
function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ── Argentine provinces ───────────────────────────────────────────────────────
const AR_PROVINCES = [
  "Buenos Aires", "Ciudad Autónoma de Buenos Aires", "Catamarca", "Chaco", "Chubut",
  "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja",
  "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis",
  "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface TagDef {
  id: string;
  name: string;
  color: string;
}

interface Client {
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
  state: string | null;
  assignedTo: { id: string; name: string } | null;
  createdAt: string;
  totalPurchases: number;
  balance: number;
  tags: { tag: TagDef }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeWhatsApp(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("54")) return d;
  if (d.startsWith("0")) return "54" + d.slice(1);
  if (d.length <= 10) return "54" + d;
  return d;
}

const sectorLabel: Record<string, string> = {
  AUTO_TALLER: "Auto - Taller",
  AUTO_CONCESIONARIO: "Auto - Consecionario",
  AUTO_MAYORISTA: "Auto - Mayorista",
  ARQUITECTURA_CONSTRUCTORA: "Arquitectura - Constructora",
  ARQUITECTURA_VIDRIERIA: "Arquitectura - Vidrieria",
  ARQUITECTURA_MAYORISTA: "Arquitectura - MAyorista",
};

const sectorColors: Record<string, string> = {
  AUTO_TALLER: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  AUTO_CONCESIONARIO: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  AUTO_MAYORISTA: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  ARQUITECTURA_CONSTRUCTORA: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  ARQUITECTURA_VIDRIERIA: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  ARQUITECTURA_MAYORISTA: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
};


// ── Page ──────────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const { format: formatCurrency } = useCurrency();
  const { data: session } = useSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search — separate typed vs applied to support Enter-to-search
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Filters
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [filterHasAddress, setFilterHasAddress] = useState(false);
  const [filterWithBalance, setFilterWithBalance] = useState(false);
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<string | null>(null);
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [sortDate, setSortDate] = useState<"asc" | "desc" | null>(null);
  const [myClients, setMyClients] = useState(false);

  // Tags
  const [allTags, setAllTags] = useState<TagDef[]>([]);
  const [openTagMenuId, setOpenTagMenuId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [tagManagerOpen, setTagManagerOpen] = useState(false);

  const activeFilterCount = [
    filterSector !== null,
    filterHasAddress,
    filterWithBalance,
    filterTagId !== null,
    filterState !== null,
    filterCity !== null,
    sortDate !== null,
    myClients,
  ].filter(Boolean).length;

  // Modals
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", company: "", sector: "",
    email: "", phone: "", whatsapp: "", address: "", city: "", state: "", notes: "",
  });

  const [mapClient, setMapClient] = useState<Client | null>(null);

  const [emailClient, setEmailClient] = useState<Client | null>(null);
  const [emailForm, setEmailForm] = useState({ subject: "", body: "" });
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Campaign de mail
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ subject: "", body: "" });
  const [campaignSending, setCampaignSending] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState({ sent: 0, total: 0, errors: 0 });
  const [campaignDone, setCampaignDone] = useState(false);

  // Soporte técnico
  const [soporteOpen, setSoporteOpen] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function fetchClients() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/clients?${params}`);
      if (!res.ok) throw new Error("Error al cargar clientes");
      setClients(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchClients(); }, [search]);

  async function fetchTags() {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) setAllTags(await res.json());
    } catch { /* silent */ }
  }
  useEffect(() => { fetchTags(); }, []);

  // ── Client-side filter + sort ──────────────────────────────────────────────
  const allStates = useMemo(() => {
    const states = [...new Set(clients.map((c) => c.state).filter(Boolean) as string[])];
    return states.sort();
  }, [clients]);

  const allCities = useMemo(() => {
    let cities = clients.map((c) => c.city).filter(Boolean) as string[];
    if (filterState) {
      cities = clients.filter((c) => c.state?.toLowerCase() === filterState.toLowerCase()).map((c) => c.city).filter(Boolean) as string[];
    }
    return [...new Set(cities)].sort();
  }, [clients, filterState]);

  const visibleClients = useMemo(() => {
    let result = [...clients];
    if (filterSector) result = result.filter((c) => c.sector === filterSector);
    if (filterHasAddress) result = result.filter((c) => !!c.address);
    if (filterWithBalance) result = result.filter((c) => (c.balance ?? 0) > 0);
    if (filterTagId) result = result.filter((c) => c.tags?.some((t) => t.tag.id === filterTagId));
    if (filterState) result = result.filter((c) => c.state === filterState);
    if (filterCity) result = result.filter((c) => c.city?.toLowerCase().includes(filterCity.toLowerCase()));
    if (myClients && session?.user?.id)
      result = result.filter((c) => c.assignedTo?.id === session.user.id);
    if (sortDate === "asc")
      result = [...result].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (sortDate === "desc")
      result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }, [clients, filterSector, filterHasAddress, filterWithBalance, filterTagId, filterState, filterCity, myClients, sortDate, session];

  const clientsWithEmail = visibleClients.filter((c) => !!c.email);

  function clearFilters() {
    setFilterSector(null);
    setFilterHasAddress(false);
    setFilterWithBalance(false);
    setFilterTagId(null);
    setFilterState(null);
    setFilterCity(null);
    setSortDate(null);
    setMyClients(false);
  }

  async function addTagToClient(clientId: string, tagId: string) {
    await fetch(`/api/contacts/${clientId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    fetchClients();
    setOpenTagMenuId(null);
  }

  async function removeTagFromClient(clientId: string, tagId: string) {
    await fetch(`/api/contacts/${clientId}/tags`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    fetchClients();
  }

  async function createTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
    });
    if (res.ok) {
      setNewTagName("");
      setNewTagColor("#6366f1");
      fetchTags();
    }
  }

  async function deleteTag(tagId: string) {
    await fetch(`/api/tags/${tagId}`, { method: "DELETE" });
    fetchTags();
    fetchClients();
    if (filterTagId === tagId) setFilterTagId(null);
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  function applySearch() { setSearch(searchInput); }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sector: form.sector || null, type: "CLIENT" }),
      });
      if (!res.ok) throw new Error("Error al crear cliente");
      setDialogOpen(false);
      setForm({ firstName: "", lastName: "", company: "", sector: "", email: "", phone: "", whatsapp: "", address: "", city: "", state: "", notes: "" });
      fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear cliente");
    } finally {
      setCreating(false);
    }
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!emailClient?.email) return;
    setEmailSending(true);
    setEmailResult(null);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailClient.email, subject: emailForm.subject, body: emailForm.body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al enviar");
      setEmailResult({ ok: true, msg: "Email enviado correctamente" });
      setEmailForm({ subject: "", body: "" });
    } catch (err) {
      setEmailResult({ ok: false, msg: err instanceof Error ? err.message : "Error al enviar" });
    } finally {
      setEmailSending(false);
    }
  }

  async function handleCampaign(e: React.FormEvent) {
    e.preventDefault();
    setCampaignSending(true);
    setCampaignDone(false);
    const targets = clientsWithEmail;
    setCampaignProgress({ sent: 0, total: targets.length, errors: 0 });
    let sent = 0;
    let errors = 0;
    for (const client of targets) {
      try {
        const res = await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: client.email, subject: campaignForm.subject, body: campaignForm.body }),
        });
        if (res.ok) sent++;
        else errors++;
      } catch {
        errors++;
      }
      setCampaignProgress({ sent, total: targets.length, errors });
    }
    setCampaignSending(false);
    setCampaignDone(true);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Clientes</h1>
      </div>

      {/* ── Tag Manager Modal ── */}
      <Dialog open={tagManagerOpen} onOpenChange={setTagManagerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag size={16} className="text-primary" />
              Gestionar Etiquetas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <form onSubmit={createTag} className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label>Nueva etiqueta</Label>
                <Input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Nombre..." required />
              </div>
              <div className="space-y-1">
                <Label>Color</Label>
                <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)}
                  className="h-9 w-12 rounded border border-zinc-700 bg-transparent cursor-pointer p-1" />
              </div>
              <Button type="submit" size="sm">Crear</Button>
            </form>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {allTags.length === 0 && <p className="text-sm text-muted-foreground">Sin etiquetas creadas.</p>}
              {allTags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                    <span className="text-sm font-medium">{tag.name}</span>
                  </div>
                  <button onClick={() => deleteTag(tag.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Soporte Técnico Modal ── */}
      <SoporteModal open={soporteOpen} onOpenChange={setSoporteOpen} />

      {/* ── Map Modal ── */}
      <Dialog open={!!mapClient} onOpenChange={(open) => { if (!open) setMapClient(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin size={16} className="text-primary" />
              {mapClient?.company || `${mapClient?.firstName} ${mapClient?.lastName}`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">{mapClient?.address}</p>
          {mapClient?.address && (
            <div className="rounded-lg overflow-hidden border h-72">
              <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(mapClient.address)}&output=embed`}
              />
            </div>
          )}
          <div className="flex justify-end mt-2">
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapClient?.address || "")}`}
              target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">Abrir en Google Maps</Button>
            </a>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Email individual Modal ── */}
      <Dialog open={!!emailClient} onOpenChange={(open) => { if (!open) { setEmailClient(null); setEmailForm({ subject: "", body: "" }); setEmailResult(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail size={16} className="text-primary" />
              Enviar email a {emailClient?.company || `${emailClient?.firstName} ${emailClient?.lastName}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendEmail} className="space-y-3">
            <div className="space-y-1">
              <Label>Para</Label>
              <Input value={emailClient?.email || ""} disabled className="opacity-70" />
            </div>
            <div className="space-y-1">
              <Label>Asunto *</Label>
              <Input value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Mensaje *</Label>
              <Textarea value={emailForm.body} onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })} rows={6} required />
            </div>
            {emailResult && (
              <div className={`rounded-md p-3 text-sm ${emailResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {emailResult.msg}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEmailClient(null)}>Cancelar</Button>
              <Button type="submit" disabled={emailSending}>{emailSending ? "Enviando..." : "Enviar Email"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Campaña de Mail Modal ── */}
      <Dialog open={campaignOpen} onOpenChange={(open) => { setCampaignOpen(open); if (!open) { setCampaignForm({ subject: "", body: "" }); setCampaignDone(false); setCampaignProgress({ sent: 0, total: 0, errors: 0 }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send size={16} className="text-primary" />
              Campaña de Email
            </DialogTitle>
          </DialogHeader>
          {campaignDone ? (
            <div className="py-4 space-y-3 text-center">
              <CheckCircle2 className="mx-auto text-green-500" size={40} />
              <p className="font-medium">Campaña finalizada</p>
              <p className="text-sm text-muted-foreground">
                {campaignProgress.sent} enviados · {campaignProgress.errors} errores
              </p>
              <Button onClick={() => { setCampaignOpen(false); setCampaignDone(false); }}>Cerrar</Button>
            </div>
          ) : (
            <form onSubmit={handleCampaign} className="space-y-3">
              <div className="rounded-md bg-muted/40 border px-4 py-2.5 text-sm">
                Se enviará a <strong>{clientsWithEmail.length}</strong> cliente{clientsWithEmail.length !== 1 ? "s" : ""} con email
                {activeFilterCount > 0 && <span className="text-muted-foreground"> (con filtros activos)</span>}
              </div>
              {clientsWithEmail.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay clientes con email en la vista actual.</p>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label>Asunto *</Label>
                    <Input value={campaignForm.subject} onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Mensaje *</Label>
                    <Textarea value={campaignForm.body} onChange={(e) => setCampaignForm({ ...campaignForm, body: e.target.value })} rows={6} required />
                  </div>
                  {campaignSending && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Enviando...</span>
                        <span>{campaignProgress.sent}/{campaignProgress.total}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary transition-all rounded-full"
                          style={{ width: `${campaignProgress.total ? (campaignProgress.sent / campaignProgress.total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => setCampaignOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={campaignSending || clientsWithEmail.length === 0}>
                      {campaignSending ? `Enviando ${campaignProgress.sent}/${campaignProgress.total}...` : `Enviar a ${clientsWithEmail.length} clientes`}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Nuevo Cliente Modal ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Crear Nuevo Cliente</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nombre *</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>Apellido *</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Empresa</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Rubro</Label>
                <Select value={form.sector || undefined} onValueChange={(v) => setForm({ ...form, sector: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO_TALLER">Auto - Taller</SelectItem>
                    <SelectItem value="AUTO_CONCESIONARIO">Auto - Consecionario</SelectItem>
                    <SelectItem value="AUTO_MAYORISTA">Auto - Mayorista</SelectItem>
                    <SelectItem value="ARQUITECTURA_CONSTRUCTORA">Arquitectura - Constructora</SelectItem>
                    <SelectItem value="ARQUITECTURA_VIDRIERIA">Arquitectura - Vidrieria</SelectItem>
                    <SelectItem value="ARQUITECTURA_MAYORISTA">Arquitectura - MAyorista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Dirección</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Av. Ejemplo 1234" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Ciudad</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Rosario" />
              </div>
              <div className="space-y-1">
                <Label>Provincia</Label>
                <Select value={form.state || undefined} onValueChange={(v) => setForm({ ...form, state: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {AR_PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={creating}>{creating ? "Creando..." : "Crear Cliente"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Table Card ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">

            {/* Search con Enter simulator */}
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar clientes..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applySearch(); }}
                className="pl-9 pr-10 w-56"
              />
              <button
                type="button"
                onClick={applySearch}
                title="Buscar (Enter)"
                className="absolute right-2 flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <kbd className="text-[10px] font-mono leading-none">↵</kbd>
              </button>
            </div>

            {/* ── Desktop: Inline buttons ── */}
            <div className="hidden md:flex items-center gap-2">
              {/* Filtrar button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 h-9">
                    <Filter size={14} />
                    Filtrar
                    {activeFilterCount > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2"><ArrowUpDown size={13} />Por fecha</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setSortDate("desc")} className="gap-2">
                        <ArrowDown size={13} /> Más recientes {sortDate === "desc" && "✓"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortDate("asc")} className="gap-2">
                        <ArrowUp size={13} /> Más antiguos {sortDate === "asc" && "✓"}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem onClick={() => setFilterHasAddress(!filterHasAddress)} className="gap-2">
                    <MapPin size={13} /> Con dirección {filterHasAddress && "✓"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterWithBalance(!filterWithBalance)} className="gap-2">
                    <DollarSign size={13} /> Con saldo pendiente {filterWithBalance && "✓"}
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2"><Filter size={13} />Por rubro</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {Object.entries(sectorLabel).map(([val, label]) => (
                        <DropdownMenuItem key={val} onClick={() => setFilterSector(filterSector === val ? null : val)} className="gap-2">
                          {label} {filterSector === val && "✓"}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2"><Tag size={13} />Por etiqueta</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {allTags.length === 0 && <DropdownMenuItem disabled className="text-xs text-muted-foreground">Sin etiquetas</DropdownMenuItem>}
                      {allTags.map((tag) => (
                        <DropdownMenuItem key={tag.id} onClick={() => setFilterTagId(filterTagId === tag.id ? null : tag.id)} className="gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                          {tag.name} {filterTagId === tag.id && "✓"}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setTagManagerOpen(true)} className="gap-2 text-xs">
                        <Plus size={12} /> Gestionar etiquetas
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2"><MapPin size={13} />Por provincia</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {allStates.length === 0 && <DropdownMenuItem disabled className="text-xs text-muted-foreground">Sin provincias registradas</DropdownMenuItem>}
                      {allStates.map((state) => (
                        <DropdownMenuItem key={state} onClick={() => { setFilterState(filterState === state ? null : state); setFilterCity(null); }} className="gap-2">
                          {state} {filterState === state && "✓"}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!filterState}>
                      <MapPin size={13} />Por ciudad
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {!filterState && <DropdownMenuItem disabled className="text-xs text-muted-foreground">Selecciona una provincia primero</DropdownMenuItem>}
                      {filterState && allCities.length === 0 && <DropdownMenuItem disabled className="text-xs text-muted-foreground">Sin ciudades en esta provincia</DropdownMenuItem>}
                      {filterState && allCities.map((city) => (
                        <DropdownMenuItem key={city} onClick={() => setFilterCity(filterCity === city ? null : city)} className="gap-2">
                          {city} {filterCity === city && "✓"}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  {activeFilterCount > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={clearFilters} className="text-destructive gap-2">Limpiar filtros</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" className="gap-2 h-9" onClick={() => setCampaignOpen(true)}>
                <Send size={14} /> Campaña
              </Button>
              <Button variant="outline" className="gap-2 h-9" onClick={() => setMyClients(!myClients)}>
                <User size={14} /> {myClients ? "Todos" : "Mis clientes"}
              </Button>
              <Button className="gap-2 h-9" onClick={() => setDialogOpen(true)}>
                <Plus size={14} /> Nuevo Cliente
              </Button>
            </div>

            {/* ── Mobile: Dropdown menu ── */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 h-9 md:hidden">
                  <Settings2 size={14} />
                  Acciones
                  {activeFilterCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                  <ChevronDown size={12} className="opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {/* ── Filtros ── */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    <Filter size={13} />
                    Filtrar
                    {activeFilterCount > 0 && <span className="ml-auto text-xs text-muted-foreground">{activeFilterCount}</span>}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-52">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2"><ArrowUpDown size={13} />Por fecha</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => setSortDate("desc")} className="gap-2">
                          <ArrowDown size={13} /> Más recientes {sortDate === "desc" && "✓"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortDate("asc")} className="gap-2">
                          <ArrowUp size={13} /> Más antiguos {sortDate === "asc" && "✓"}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem onClick={() => setFilterHasAddress(!filterHasAddress)} className="gap-2">
                      <MapPin size={13} /> Con dirección {filterHasAddress && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterWithBalance(!filterWithBalance)} className="gap-2">
                      <DollarSign size={13} /> Con saldo pendiente {filterWithBalance && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2"><MapPin size={13} />Por provincia {filterState && `(${filterState.split(" ")[0]})`}</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                        {AR_PROVINCES.map((prov) => (
                          <DropdownMenuItem key={prov} onClick={() => setFilterState(filterState === prov ? null : prov)} className="gap-2">
                            {prov} {filterState === prov && "✓"}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2"><Filter size={13} />Por rubro</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {Object.entries(sectorLabel).map(([val, label]) => (
                          <DropdownMenuItem key={val} onClick={() => setFilterSector(filterSector === val ? null : val)} className="gap-2">
                            {label} {filterSector === val && "✓"}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2"><Tag size={13} />Por etiqueta</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {allTags.length === 0 && <DropdownMenuItem disabled className="text-xs text-muted-foreground">Sin etiquetas</DropdownMenuItem>}
                        {allTags.map((tag) => (
                          <DropdownMenuItem key={tag.id} onClick={() => setFilterTagId(filterTagId === tag.id ? null : tag.id)} className="gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                            {tag.name} {filterTagId === tag.id && "✓"}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setTagManagerOpen(true)} className="gap-2 text-xs">
                          <Plus size={12} /> Gestionar etiquetas
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2"><MapPin size={13} />Por provincia</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {allStates.length === 0 && <DropdownMenuItem disabled className="text-xs text-muted-foreground">Sin provincias registradas</DropdownMenuItem>}
                        {allStates.map((state) => (
                          <DropdownMenuItem key={state} onClick={() => { setFilterState(filterState === state ? null : state); setFilterCity(null); }} className="gap-2">
                            {state} {filterState === state && "✓"}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!filterState}>
                        <MapPin size={13} />Por ciudad
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {!filterState && <DropdownMenuItem disabled className="text-xs text-muted-foreground">Selecciona una provincia primero</DropdownMenuItem>}
                        {filterState && allCities.length === 0 && <DropdownMenuItem disabled className="text-xs text-muted-foreground">Sin ciudades en esta provincia</DropdownMenuItem>}
                        {filterState && allCities.map((city) => (
                          <DropdownMenuItem key={city} onClick={() => setFilterCity(filterCity === city ? null : city)} className="gap-2">
                            {city} {filterCity === city && "✓"}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    {activeFilterCount > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={clearFilters} className="text-destructive gap-2">Limpiar filtros</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                {/* ── Acciones ── */}
                <DropdownMenuItem onClick={() => setCampaignOpen(true)} className="gap-2">
                  <Send size={13} /> Campaña de Mail
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMyClients(!myClients)} className="gap-2">
                  <User size={13} /> Mis clientes {myClients && "✓"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDialogOpen(true)} className="gap-2 font-medium">
                  <Plus size={13} /> Nuevo Cliente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSoporteOpen(true)} className="gap-2 text-muted-foreground">
                  <Headphones size={13} /> Soporte Técnico
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-1.5 py-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-md" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4 text-red-600">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-9 p-1"></TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Rubro</TableHead>
                    <TableHead>Etiquetas</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead>Provincia</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Total Compras</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Asignado a</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleClients.map((client) => {
                    const waNum = client.whatsapp ? normalizeWhatsApp(client.whatsapp) : null;
                    return (
                      <TableRow key={client.id}>
                        <TableCell className="p-1 w-9">
                          <Link href={`/clients/${client.id}`}>
                            <Button size="icon" className="h-8 w-8 bg-zinc-900 text-white shadow-md hover:bg-zinc-700 active:shadow-none active:translate-y-px transition-all border border-zinc-700">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{client.company || "-"}</TableCell>
                        <TableCell>
                          {client.sector ? (
                            <Badge className={`text-xs px-2 py-0.5 font-medium border-0 ${sectorColors[client.sector] ?? "bg-zinc-100 text-zinc-700"}`}>
                              {sectorLabel[client.sector] ?? client.sector}
                            </Badge>
                          ) : "-"}
                        </TableCell>
                        {/* Tags cell */}
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1 max-w-[180px]">
                            {(client.tags ?? []).map(({ tag }) => (
                              <span key={tag.id}
                                className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium cursor-pointer select-none"
                                style={{ backgroundColor: tag.color + "33", color: tag.color, border: `1px solid ${tag.color}55` }}
                                onClick={() => removeTagFromClient(client.id, tag.id)}
                                title={`Quitar "${tag.name}"`}
                              >
                                {tag.name}
                                <X size={10} className="opacity-60" />
                              </span>
                            ))}
                            <div className="relative">
                              <button
                                onClick={() => setOpenTagMenuId(openTagMenuId === client.id ? null : client.id)}
                                className="flex items-center justify-center w-5 h-5 rounded-full border border-dashed border-zinc-500 text-zinc-500 hover:border-primary hover:text-primary transition-colors"
                                title="Agregar etiqueta"
                              >
                                <Plus size={10} />
                              </button>
                              {openTagMenuId === client.id && (
                                <div className="absolute left-0 top-6 z-50 bg-popover border rounded-md shadow-lg p-1 min-w-[140px]">
                                  {allTags.filter((t) => !(client.tags ?? []).some((lt) => lt.tag.id === t.id)).map((tag) => (
                                    <button key={tag.id}
                                      className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors text-left"
                                      onClick={() => addTagToClient(client.id, tag.id)}
                                    >
                                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                                      {tag.name}
                                    </button>
                                  ))}
                                  {allTags.filter((t) => !(client.tags ?? []).some((lt) => lt.tag.id === t.id)).length === 0 && (
                                    <p className="px-2 py-1.5 text-xs text-muted-foreground">Sin más etiquetas</p>
                                  )}
                                  <div className="border-t mt-1 pt-1">
                                    <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors"
                                      onClick={() => { setOpenTagMenuId(null); setTagManagerOpen(true); }}>
                                      <Plus size={10} /> Nueva etiqueta
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(client.address || client.city || client.state) ? (
                            <button
                              onClick={() => setMapClient(client)}
                              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors max-w-[180px]"
                              title={[client.address, client.city, client.state].filter(Boolean).join(", ")}
                            >
                              <MapPin size={13} className="shrink-0 text-primary" />
                              <span className="truncate">{[client.address, client.city, client.state].filter(Boolean).join(", ")}</span>
                            </button>
                          ) : <span className="text-xs">-</span>}
                        </TableCell>
                        <TableCell>
                          {client.email ? (
                            <button
                              onClick={() => { setEmailClient(client); setEmailForm({ subject: "", body: "" }); setEmailResult(null); }}
                              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                              title={`Enviar email a ${client.email}`}
                            >
                              <Mail size={13} className="text-primary shrink-0" />
                              <span className="max-w-[120px] truncate">{client.email}</span>
                            </button>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {client.phone ? (
                            <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                              <span>{client.phone}</span>
                            </a>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {waNum ? (
                            <a
                              href={`https://wa.me/${waNum}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-500 transition-colors whitespace-nowrap"
                              title="Abrir WhatsApp"
                            >
                              <WhatsAppIcon size={13} />
                              <span>{client.whatsapp}</span>
                            </a>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                          {client.totalPurchases != null ? formatCurrency(client.totalPurchases) : "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {client.balance != null ? (
                            <span className={client.balance > 0 ? "font-medium text-red-500" : "text-green-500"}>
                              {formatCurrency(client.balance)}
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {client.assignedTo?.name || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {visibleClients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        No se encontraron clientes
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
