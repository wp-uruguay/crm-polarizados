"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, User, ShieldOff, AlertTriangle, Pencil, Save, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "OPERATOR" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fixed message
  const [msgTitle, setMsgTitle] = useState("Mensaje fijo");
  const [msgBody, setMsgBody] = useState("Aquí podremos destacar mensajes importantes que solo veremos nosotros.");
  const [editMsgTitle, setEditMsgTitle] = useState("");
  const [editMsgBody, setEditMsgBody] = useState("");
  const [editingMsg, setEditingMsg] = useState(false);
  const [savingMsg, setSavingMsg] = useState(false);

  useEffect(() => {
    if (session?.user?.role === "ADMIN") fetchUsers();
    fetchMessage();
  }, [session]);

  async function fetchMessage() {
    try {
      const res = await fetch("/api/settings/message");
      if (res.ok) {
        const data = await res.json();
        setMsgTitle(data.title);
        setMsgBody(data.body);
      }
    } catch { /* silent */ }
  }

  function startEditMsg() {
    setEditMsgTitle(msgTitle);
    setEditMsgBody(msgBody);
    setEditingMsg(true);
  }

  async function saveMessage() {
    if (!confirm("¿Guardar los cambios en el mensaje fijo?")) return;
    setSavingMsg(true);
    try {
      const res = await fetch("/api/settings/message", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editMsgTitle, body: editMsgBody }),
      });
      if (res.ok) {
        const data = await res.json();
        setMsgTitle(data.title);
        setMsgBody(data.body);
        setEditingMsg(false);
      }
    } catch { /* silent */ }
    finally { setSavingMsg(false); }
  }

  async function fetchUsers() {
    try {
      const res = await fetch("/api/settings/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!form.name || !form.email || !form.password) {
      setError("Nombre, email y contraseña son requeridos");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear usuario");
      }
      setSuccess("Usuario creado exitosamente");
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "OPERATOR" });
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return null;

  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[60vh]">
        <ShieldOff className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acceso restringido</h2>
        <p className="text-muted-foreground text-sm">Solo los administradores pueden acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />Gestión de Usuarios
          </CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />Nuevo Usuario
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="mb-6 rounded-lg border bg-muted/30 p-5 space-y-4">
              <h3 className="font-semibold text-sm">Crear nuevo usuario</h3>
              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nombre</Label>
                  <Input
                    placeholder="Juan Pérez"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="juan@empresa.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Contraseña</Label>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Rol</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPERATOR">Operador</SelectItem>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
                <Button variant="outline" onClick={() => { setShowForm(false); setError(""); }}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? "Guardando..." : "Crear usuario"}
                </Button>
              </div>
            </div>
          )}

          {success && <p className="text-green-600 text-sm mb-4">{success}</p>}

          {loading ? <p>Cargando usuarios...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                        {u.role === "ADMIN" ? "Admin" : "Operador"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(u.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-gray-500">No hay usuarios</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Información del Sistema</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-500">Versión</span><span>1.0.0</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-500">Framework</span><span>Next.js + Prisma + MySQL</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-500">AI</span><span>Claude (Anthropic)</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Notificaciones</span>
            <span>{process.env.RESEND_API_KEY ? "✓ Email activo" : "Sin configurar"}</span>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 space-y-3">
        {editingMsg ? (
          <>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Título del mensaje</Label>
                <Input
                  value={editMsgTitle}
                  onChange={(e) => setEditMsgTitle(e.target.value)}
                  placeholder="Título del mensaje..."
                  className="bg-zinc-900 border-zinc-700"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Cuerpo del mensaje</Label>
                <Input
                  value={editMsgBody}
                  onChange={(e) => setEditMsgBody(e.target.value)}
                  placeholder="Texto del mensaje..."
                  className="bg-zinc-900 border-zinc-700"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={saveMessage} disabled={savingMsg} className="gap-1.5">
                <Save size={14} />
                {savingMsg ? "Guardando..." : "Guardar"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingMsg(false)} disabled={savingMsg} className="gap-1.5">
                <X size={14} />
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-sm">
                <AlertTriangle size={16} className="text-red-800" />
                {msgTitle}
              </h3>
              {(session?.user as { role?: string })?.role === "ADMIN" && (
                <button
                  onClick={startEditMsg}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Editar mensaje"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{msgBody}</p>
          </>
        )}
      </div>
    </div>
  );
}
