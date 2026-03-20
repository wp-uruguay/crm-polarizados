"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  name: string;
}

interface CallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  onCreated?: () => void;
}

export function CallDialog({ open, onOpenChange, contactId, onCreated }: CallDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({
    scheduledAt: "",
    durationMin: "",
    assignedToId: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/users")
        .then((r) => r.json())
        .then((data) => setUsers(Array.isArray(data) ? data : []))
        .catch(console.error);
    }
  }, [open]);

  async function handleSubmit() {
    if (!form.scheduledAt) {
      setError("La fecha y hora son requeridas");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          scheduledAt: form.scheduledAt,
          durationMin: form.durationMin ? Number(form.durationMin) : null,
          assignedToId: form.assignedToId || undefined,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear llamada");
      }
      setForm({ scheduledAt: "", durationMin: "", assignedToId: "", notes: "" });
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Llamada</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

          <div className="space-y-1">
            <Label>Fecha y hora *</Label>
            <input
              type="datetime-local"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label>Duración estimada</Label>
            <Select value={form.durationMin} onValueChange={(v) => setForm({ ...form, durationMin: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin definir</SelectItem>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="90">1.5 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Asignado a</Label>
            <Select value={form.assignedToId} onValueChange={(v) => setForm({ ...form, assignedToId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuario" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea
              placeholder="Motivo o detalles de la llamada..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
              {saving ? "Guardando..." : "Agendar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
