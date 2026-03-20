"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, CheckCircle, User, Clock, Timer } from "lucide-react";

interface Call {
  id: string;
  scheduledAt: string;
  durationMin: number | null;
  completed: boolean;
  notes: string | null;
  contact: { id: string; firstName: string; lastName: string };
  assignedTo: { id: string; name: string };
}

function groupByDate(calls: Call[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);

  const groups: Record<string, Call[]> = {
    "Hoy": [],
    "Mañana": [],
    "Próxima semana": [],
    "Más adelante": [],
  };

  for (const c of calls) {
    const d = new Date(c.scheduledAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day.getTime() === today.getTime()) groups["Hoy"].push(c);
    else if (day.getTime() === tomorrow.getTime()) groups["Mañana"].push(c);
    else if (day < nextWeek) groups["Próxima semana"].push(c);
    else groups["Más adelante"].push(c);
  }

  return groups;
}

function formatDateTime(dt: string) {
  return new Date(dt).toLocaleString("es-AR", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function CallsCalendarPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchCalls() {
    try {
      const res = await fetch("/api/calls?upcoming=true");
      if (res.ok) setCalls(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchCalls(); }, []);

  async function markComplete(id: string) {
    await fetch(`/api/calls/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    fetchCalls();
  }

  const groups = groupByDate(calls);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Phone className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Calendario de Llamadas</h1>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : calls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Phone className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No hay llamadas pendientes</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groups).map(([label, items]) => {
          if (items.length === 0) return null;
          return (
            <div key={label} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{label}</h2>
              {items.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/leads/${c.contact.id}`}
                          className="font-semibold hover:underline"
                        >
                          {c.contact.firstName} {c.contact.lastName}
                        </Link>
                        <Badge variant="outline" className="text-xs">Llamada</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(c.scheduledAt)}
                        </span>
                        {c.durationMin && (
                          <span className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {c.durationMin} min
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {c.assignedTo.name}
                        </span>
                      </div>
                      {c.notes && <p className="text-sm text-muted-foreground line-clamp-1">{c.notes}</p>}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => markComplete(c.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Completar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
