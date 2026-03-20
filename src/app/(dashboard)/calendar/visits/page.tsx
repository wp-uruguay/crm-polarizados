"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, CheckCircle, User, Clock } from "lucide-react";

interface Visit {
  id: string;
  scheduledDate: string;
  completed: boolean;
  notes: string | null;
  result: string | null;
  contact: { id: string; firstName: string; lastName: string };
  assignedTo: { id: string; name: string };
}

function groupByDate(visits: Visit[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);

  const groups: Record<string, Visit[]> = {
    "Hoy": [],
    "Mañana": [],
    "Próxima semana": [],
    "Más adelante": [],
  };

  for (const v of visits) {
    const d = new Date(v.scheduledDate);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day.getTime() === today.getTime()) groups["Hoy"].push(v);
    else if (day.getTime() === tomorrow.getTime()) groups["Mañana"].push(v);
    else if (day < nextWeek) groups["Próxima semana"].push(v);
    else groups["Más adelante"].push(v);
  }

  return groups;
}

function formatDateTime(dt: string) {
  return new Date(dt).toLocaleString("es-AR", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function VisitsCalendarPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchVisits() {
    try {
      const res = await fetch("/api/visits?upcoming=true");
      if (res.ok) setVisits(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchVisits(); }, []);

  async function markComplete(id: string) {
    await fetch(`/api/visits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    fetchVisits();
  }

  const groups = groupByDate(visits);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Calendario de Visitas</h1>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : visits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <CalendarDays className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No hay visitas pendientes</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groups).map(([label, items]) => {
          if (items.length === 0) return null;
          return (
            <div key={label} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{label}</h2>
              {items.map((v) => (
                <Card key={v.id}>
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/leads/${v.contact.id}`}
                          className="font-semibold hover:underline"
                        >
                          {v.contact.firstName} {v.contact.lastName}
                        </Link>
                        <Badge variant="outline" className="text-xs">Visita</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(v.scheduledDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {v.assignedTo.name}
                        </span>
                      </div>
                      {v.notes && <p className="text-sm text-muted-foreground line-clamp-1">{v.notes}</p>}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => markComplete(v.id)}
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
