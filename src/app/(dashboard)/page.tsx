"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/contexts/currency-context";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  UserPlus, Users, ShoppingCart, TrendingUp, Clock, Trash2, Plus,
  CheckCircle2, Circle, ExternalLink, Loader2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface VisitSummary {
  id: string;
  scheduledDate: string;
  notes: string | null;
  contact: { id: string; firstName: string; lastName: string; company: string | null };
  assignedTo: { id: string; name: string };
}

interface ContactedLead {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  contactMethod: string | null;
  contactDate: string | null;
}

interface RecentSale {
  id: string;
  number: number;
  contact: { firstName: string; lastName: string; company: string | null };
  total: string;
  payments: Array<{ amount: string }>;
  createdAt: string;
}

interface ChartPoint {
  month?: string;
  week?: string;
  day?: string;
  revenue: number;
}

interface DashboardData {
  totalLeads: number;
  totalClients: number;
  monthlySales: number;
  monthlyRevenue: number;
  pendingPayments: number;
  lowStockProducts: number;
  recentSales: RecentSale[];
  monthlyData: ChartPoint[];
  weeklyData: ChartPoint[];
  dailyData: ChartPoint[];
  upcomingVisits: VisitSummary[];
  pendingVisits: VisitSummary[];
  contactedLeads: ContactedLead[];
}

interface CrmTask {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
  priority: string | null;
}

interface ClickUpTask {
  id: string;
  name: string;
  status: { status: string; color: string };
  due_date: string | null;
  url: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const contactMethodLabel: Record<string, string> = {
  PHONE: "Teléfono", WHATSAPP: "WhatsApp", EMAIL: "Email",
  IN_PERSON: "En Persona", VISIT: "Visita", OTHER: "Otro", NONE: "-",
};

const paymentStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PAID: "default", PARTIAL: "secondary", PENDING: "destructive",
};

function getSaleStatus(sale: RecentSale) {
  const paid = sale.payments?.reduce((s, p) => s + parseFloat(p.amount), 0) ?? 0;
  const total = parseFloat(sale.total);
  return paid >= total ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING";
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  HIGH:   { label: "Alta",  color: "text-red-500"    },
  MEDIUM: { label: "Media", color: "text-yellow-500" },
  LOW:    { label: "Baja",  color: "text-green-500"  },
};

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  title, value, icon: Icon, href, sub,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  href: string;
  sub?: string;
}) {
  return (
    <Link href={href} className="block group">
      <Card className="hover:shadow-lg transition-all border hover:border-orange-500/30 cursor-pointer">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </CardTitle>
          <div className="p-2 rounded-lg bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
            <Icon className="h-4 w-4 text-orange-500" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { format: formatCurrency } = useCurrency();
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartFilter, setChartFilter] = useState<"month" | "week" | "day">("month");

  // CRM Tasks
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const taskInputRef = useRef<HTMLInputElement>(null);

  // ClickUp Tasks
  const [clickupTasks, setClickupTasks] = useState<ClickUpTask[]>([]);
  const [clickupLoading, setClickupLoading] = useState(true);
  const [clickupError, setClickupError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    fetch("/api/tasks")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) ? setTasks(d) : setTasks([]))
      .finally(() => setTasksLoading(false));

    fetch("/api/clickup")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setClickupTasks(d);
        else setClickupError(d.error || "Sin datos");
      })
      .catch(() => setClickupError("Error al conectar"))
      .finally(() => setClickupLoading(false));
  }, []);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;
    setAddingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTask.trim() }),
      });
      const task = await res.json();
      setTasks((prev) => [task, ...prev]);
      setNewTask("");
    } finally {
      setAddingTask(false);
    }
  }

  async function toggleTask(task: CrmTask) {
    const updated = { ...task, done: !task.done };
    setTasks((prev) => prev.map((t) => t.id === task.id ? updated : t));
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) return <div className="rounded-md bg-red-50 p-4 text-red-600">{error}</div>;
  if (!data) return null;

  const chartData =
    chartFilter === "month"
      ? data.monthlyData.map((d) => ({ label: d.month, revenue: d.revenue }))
      : chartFilter === "week"
      ? data.weeklyData.map((d) => ({ label: d.week, revenue: d.revenue }))
      : data.dailyData.map((d) => ({ label: d.day, revenue: d.revenue }));

  const pendingTasks = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Panel de Control</h1>

      {/* ── Banner: próximas agendas ── */}
      {data.upcomingVisits.length > 0 && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 space-y-2">
          <p className="text-sm font-semibold text-yellow-800">
            Tenés {data.upcomingVisits.length} agenda{data.upcomingVisits.length > 1 ? "s" : ""} en las próximas 24 hs
          </p>
          <div className="flex flex-wrap gap-2">
            {data.upcomingVisits.map((v) => (
              <Link key={v.id} href={`/leads/${v.contact.id}`}
                className="flex items-center gap-2 rounded-md bg-yellow-100 px-3 py-1.5 text-sm hover:bg-yellow-200 transition-colors">
                <span className="font-medium">{v.contact.firstName} {v.contact.lastName}</span>
                {v.contact.company && <span className="text-yellow-700">— {v.contact.company}</span>}
                <span className="text-yellow-600">{formatDateTime(v.scheduledDate)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {data.upcomingVisits.length === 0 && session?.user && (
        <div className="rounded-lg border border-muted bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
          No tenés agendas en las próximas 24 hs
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard title="Leads" value={data.totalLeads} icon={UserPlus} href="/leads" sub="Prospectos activos" />
        <StatCard title="Clientes" value={data.totalClients} icon={Users} href="/clients" sub="Clientes totales" />
        <StatCard title="Ventas del Mes" value={data.monthlySales} icon={ShoppingCart} href="/sales" sub="Operaciones" />
        <StatCard title="Ingresos del Mes" value={formatCurrency(data.monthlyRevenue)} icon={TrendingUp} href="/sales" sub="Este mes" />
        <StatCard title="Pagos Pendientes" value={formatCurrency(data.pendingPayments)} icon={Clock} href="/payments" sub="Por cobrar" />
      </div>

      {/* ── Ventas recientes | Agendas + Leads ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ventas recientes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ventas Recientes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
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
                  {data.recentSales.slice(0, 5).map((sale) => {
                    const status = getSaleStatus(sale);
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">
                          <Link href="/sales" className="text-primary hover:underline">#{sale.number}</Link>
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate">
                          {sale.contact?.company || `${sale.contact?.firstName} ${sale.contact?.lastName}`}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatCurrency(sale.total)}</TableCell>
                        <TableCell>
                          <Badge variant={paymentStatusVariant[status] || "outline"} className="text-xs">
                            {status === "PAID" ? "Pagado" : status === "PARTIAL" ? "Parcial" : "Pendiente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{formatDate(sale.createdAt)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {data.recentSales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">
                        No hay ventas recientes
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Agendas + Leads contactados */}
        <div className="flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Agendas Asignadas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.pendingVisits.length === 0 ? (
                <p className="px-6 pb-4 text-sm text-muted-foreground">No hay agendas pendientes</p>
              ) : (
                <div className="divide-y max-h-48 overflow-y-auto">
                  {data.pendingVisits.map((v) => (
                    <div key={v.id} className="flex items-center justify-between px-6 py-2.5 text-sm hover:bg-muted/40 transition-colors">
                      <div className="min-w-0">
                        <Link href={`/leads/${v.contact.id}`} className="font-medium hover:underline truncate block">
                          {v.contact.company || `${v.contact.firstName} ${v.contact.lastName}`}
                        </Link>
                      </div>
                      <div className="text-right text-xs text-muted-foreground shrink-0 ml-2">
                        <div className="font-medium text-foreground">{v.assignedTo.name}</div>
                        <div>{formatDateTime(v.scheduledDate)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Leads Contactados</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.contactedLeads.length === 0 ? (
                <p className="px-6 pb-4 text-sm text-muted-foreground">No hay leads contactados</p>
              ) : (
                <div className="divide-y max-h-48 overflow-y-auto">
                  {data.contactedLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between px-6 py-2.5 text-sm hover:bg-muted/40 transition-colors">
                      <Link href={`/leads/${lead.id}`} className="font-medium hover:underline truncate">
                        {lead.company || `${lead.firstName} ${lead.lastName}`}
                      </Link>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge variant="secondary" className="text-xs">
                          {contactMethodLabel[lead.contactMethod ?? "NONE"] ?? lead.contactMethod}
                        </Badge>
                        {lead.contactDate && (
                          <span className="text-xs text-muted-foreground hidden sm:block">{formatDate(lead.contactDate)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Remitos + Gráfico ── */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Últimos Remitos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {data.recentSales.slice(0, 6).map((sale) => {
                const status = getSaleStatus(sale);
                return (
                  <div key={sale.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 transition-colors">
                    <div className="min-w-0">
                      <Link href="/sales" className="text-sm font-medium text-primary hover:underline">#{sale.number}</Link>
                      <p className="text-xs text-muted-foreground truncate">
                        {sale.contact?.company || `${sale.contact?.firstName} ${sale.contact?.lastName}`}
                      </p>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <p className="text-sm font-semibold">{formatCurrency(sale.total)}</p>
                      <Badge variant={paymentStatusVariant[status] || "outline"} className="text-xs">
                        {status === "PAID" ? "Pagado" : status === "PARTIAL" ? "Parcial" : "Pendiente"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {data.recentSales.length === 0 && (
                <p className="px-4 py-4 text-sm text-muted-foreground">Sin remitos</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base text-zinc-100">Ingresos</CardTitle>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {chartFilter === "month" ? "Últimos 6 meses" : chartFilter === "week" ? "Últimas 12 semanas" : "Últimos 30 días"}
                </p>
              </div>
              <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1 w-fit">
                {(["month", "week", "day"] as const).map((f) => (
                  <button key={f} onClick={() => setChartFilter(f)}
                    className={`h-6 px-2.5 text-xs rounded-md font-medium transition-all ${
                      chartFilter === f ? "bg-orange-500 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    }`}>
                    {f === "month" ? "Mes" : f === "week" ? "Sem" : "Día"}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barCategoryGap="35%">
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#ea580c" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false}
                    interval={chartFilter === "day" ? 4 : 0} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v === 0 ? "" : `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)", radius: 4 }}
                    contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#f4f4f5" }}
                    labelStyle={{ color: "#a1a1aa", marginBottom: 2 }}
                    formatter={(value) => [formatCurrency(Number(value)), "Ingresos"]} />
                  <Bar dataKey="revenue" fill="url(#barGradient)" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill="url(#barGradient)" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tareas ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tareas CRM */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 size={16} className="text-orange-500" />
                Tareas Pendientes CRM
              </CardTitle>
              {pendingTasks.length > 0 && (
                <Badge variant="secondary" className="text-xs">{pendingTasks.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Add task */}
            <form onSubmit={addTask} className="flex gap-2">
              <Input
                ref={taskInputRef}
                placeholder="Nueva tarea..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                className="flex-1 h-8 text-sm"
              />
              <Button type="submit" size="sm" disabled={addingTask || !newTask.trim()} className="h-8 px-2">
                {addingTask ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              </Button>
            </form>

            {/* Task list */}
            {tasksLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">Sin tareas. ¡Agregá una!</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 group rounded-md hover:bg-muted/40 px-2 py-1.5 transition-colors">
                    <button onClick={() => toggleTask(task)} className="shrink-0 text-muted-foreground hover:text-orange-500 transition-colors">
                      <Circle size={16} />
                    </button>
                    <span className="flex-1 text-sm truncate">{task.title}</span>
                    {task.priority && (
                      <span className={`text-xs shrink-0 ${priorityConfig[task.priority]?.color ?? ""}`}>
                        {priorityConfig[task.priority]?.label}
                      </span>
                    )}
                    <button onClick={() => deleteTask(task.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {doneTasks.length > 0 && (
                  <>
                    <div className="text-xs text-muted-foreground px-2 pt-2">Completadas</div>
                    {doneTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center gap-2 group rounded-md hover:bg-muted/40 px-2 py-1.5 transition-colors opacity-50">
                        <button onClick={() => toggleTask(task)} className="shrink-0 text-orange-500">
                          <CheckCircle2 size={16} />
                        </button>
                        <span className="flex-1 text-sm line-through truncate">{task.title}</span>
                        <button onClick={() => deleteTask(task.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ClickUp Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 32 32" fill="none">
                  <path d="M3.52 24.576L8.32 20.48a9.6 9.6 0 0016.64-3.84H16.96l-2.88 4.608-5.12-8.128L3.52 24.576z" fill="#7B68EE" />
                  <path d="M28.48 24.576l-4.8-4.096a9.6 9.6 0 01-16.64-3.84H9.04l2.88 4.608 5.12-8.128 5.44 11.456z" fill="#00C0F0" />
                </svg>
                Tareas ClickUp
              </CardTitle>
              {!clickupLoading && !clickupError && clickupTasks.length > 0 && (
                <Badge variant="secondary" className="text-xs">{clickupTasks.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {clickupLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            ) : clickupError ? (
              <div className="rounded-md bg-muted/40 border p-4 text-sm text-center space-y-2">
                <p className="text-muted-foreground">
                  {clickupError.includes("configurado")
                    ? "ClickUp no está configurado."
                    : clickupError}
                </p>
                {clickupError.includes("configurado") && (
                  <p className="text-xs text-muted-foreground">
                    Agregá <code className="bg-muted px-1 rounded">CLICKUP_API_KEY</code> y{" "}
                    <code className="bg-muted px-1 rounded">CLICKUP_LIST_ID</code> en tu <code className="bg-muted px-1 rounded">.env</code>
                  </p>
                )}
              </div>
            ) : clickupTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">Sin tareas pendientes en ClickUp</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {clickupTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 rounded-md hover:bg-muted/40 px-2 py-1.5 transition-colors group">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: task.status?.color ?? "#6366f1" }}
                    />
                    <span className="flex-1 text-sm truncate">{task.name}</span>
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(parseInt(task.due_date)).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                    <a
                      href={task.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
