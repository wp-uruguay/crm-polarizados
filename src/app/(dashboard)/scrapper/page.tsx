"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, Search, CheckCircle2, Plus, Globe, Phone } from "lucide-react";

// ── Argentine provinces ──────────────────────────────────────────────────────
const AR_PROVINCES = [
  "Buenos Aires",
  "Ciudad Autónoma de Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

type BusinessType =
  | "Talleres/Autodetailing"
  | "Vidriería/Glass"
  | "Arquitectura"
  | "Concesionarias"
  | "Todos";

interface ScrapedBusiness {
  name: string;
  address: string;
  phone: string;
  website: string;
  lat: number;
  lng: number;
  isInLeads: boolean;
  type?: string;
}

const BUSINESS_TYPES: BusinessType[] = [
  "Todos",
  "Talleres/Autodetailing",
  "Vidriería/Glass",
  "Arquitectura",
  "Concesionarias",
];

const SECTOR_MAP: Record<string, string> = {
  "Talleres/Autodetailing": "AUTOMOTRIZ",
  "Vidriería/Glass": "AUTOMOTRIZ",
  "Arquitectura": "ARQUITECTURA",
  "Concesionarias": "AUTOMOTRIZ",
  "Todos": "AUTOMOTRIZ",
};

// ── City Autocomplete ────────────────────────────────────────────────────────
interface Prediction {
  description: string;
  place_id: string;
}

function CityAutocomplete({
  value,
  onChange,
  province,
}: {
  value: string;
  onChange: (v: string) => void;
  province: string;
}) {
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(
    (input: string) => {
      if (input.length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      setFetching(true);
      const query = province ? `${input}, ${province}` : input;
      fetch(`/api/scrapper/autocomplete?input=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data) => {
          setSuggestions(data.predictions ?? []);
          setOpen((data.predictions ?? []).length > 0);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setFetching(false));
    },
    [province]
  );

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchSuggestions(val), 350);
  }

  function handleSelect(desc: string) {
    // Strip ", Argentina" suffix and province if present for cleaner city name
    const clean = desc
      .replace(/, Argentina$/, "")
      .replace(new RegExp(`,\\s*${province}`, "i"), "")
      .trim();
    onChange(clean || desc);
    setSuggestions([]);
    setOpen(false);
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Ej: Rosario, Córdoba, Mendoza..."
          value={value}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
          required
        />
        {fetching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-52 overflow-y-auto">
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s.description);
              }}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {s.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ScrapperPage() {
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState(3);
  const [bizTypes, setBizTypes] = useState<BusinessType[]>(["Todos"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScrapedBusiness[] | null>(null);
  const [addingIdx, setAddingIdx] = useState<number | null>(null);
  const [addedIdxs, setAddedIdxs] = useState<Set<number>>(new Set());

  function toggleType(t: BusinessType) {
    if (t === "Todos") {
      setBizTypes(["Todos"]);
      return;
    }
    setBizTypes((prev) => {
      const without = prev.filter((x) => x !== "Todos");
      const next = without.includes(t)
        ? without.filter((x) => x !== t)
        : [...without, t];
      return next.length === 0 ? ["Todos"] : next;
    });
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!city.trim() || !province) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setAddedIdxs(new Set());
    try {
      const res = await fetch("/api/scrapper/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: city.trim(),
          province,
          radiusKm: radius,
          types: bizTypes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al buscar negocios");
      setResults(data.businesses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToLeads(biz: ScrapedBusiness, idx: number) {
    setAddingIdx(idx);
    try {
      const sector = SECTOR_MAP[biz.type ?? "Todos"] ?? "AUTOMOTRIZ";
      const res = await fetch("/api/scrapper/add-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "—",
          lastName: "—",
          company: biz.name,
          phone: biz.phone || null,
          address: biz.address || null,
          city: city.trim() || null,
          state: province || null,
          sector,
          notes: `Importado desde DR Scrapp.${biz.address ? ` Dirección: ${biz.address}.` : ""}${biz.website ? ` Web: ${biz.website}` : ""}`,
        }),
      });
      if (!res.ok) throw new Error("Error al agregar lead");
      setAddedIdxs((prev) => new Set([...prev, idx]));
      setResults((prev) =>
        prev?.map((b, i) => (i === idx ? { ...b, isInLeads: true } : b)) ?? prev
      );
    } catch (err) {
      console.error(err);
    } finally {
      setAddingIdx(null);
    }
  }

  // Filter results by selected business types
  const filteredResults = results
    ? bizTypes.includes("Todos")
      ? results
      : results.filter((b) => bizTypes.includes((b.type ?? "Todos") as BusinessType))
    : null;

  const total = filteredResults?.length ?? 0;
  const alreadyIn = filteredResults?.filter((b) => b.isInLeads).length ?? 0;
  const newPotential = total - alreadyIn;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <MapPin className="h-7 w-7 text-orange-500" />
          DR Scrapp
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Encontrá negocios potenciales en Argentina por zona y agregalos como leads
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buscar negocios</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Province + City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Provincia *</Label>
                <Select
                  value={province}
                  onValueChange={(v) => {
                    setProvince(v);
                    setCity("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar provincia..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {AR_PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Ciudad / Localidad *</Label>
                <CityAutocomplete
                  value={city}
                  onChange={setCity}
                  province={province}
                />
              </div>
            </div>

            {/* Radius */}
            <div className="space-y-1.5">
              <Label>
                Radio:{" "}
                <span className="font-semibold text-orange-500">{radius} km</span>
              </Label>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full accent-orange-500 h-2 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 km</span>
                <span>10 km</span>
              </div>
            </div>

            {/* Business type pills */}
            <div className="space-y-1.5">
              <Label>Tipo de negocio</Label>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      bizTypes.includes(t)
                        ? "bg-orange-500 text-white border-orange-500"
                        : "border-zinc-600 text-muted-foreground hover:border-orange-500 hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={!city.trim() || !province || loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Search className="h-4 w-4 mr-2 animate-spin" />
                  Buscando negocios...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Buscar negocios
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="py-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-1/6" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {filteredResults && !loading && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
              <CardTitle className="text-base">Resultados</CardTitle>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline">{total} encontrados</Badge>
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/10">
                  {alreadyIn} ya en leads
                </Badge>
                <Badge className="bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/10">
                  {newPotential} nuevos potenciales
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredResults.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No se encontraron negocios en esa zona.</p>
                <p className="mt-1">Probá con un radio mayor o una ciudad diferente.</p>
              </div>
            ) : (
              <>
                {/* Mobile */}
                <div className="md:hidden divide-y">
                  {filteredResults.map((biz, idx) => {
                    const alreadyLead = biz.isInLeads || addedIdxs.has(idx);
                    return (
                      <div key={idx} className="p-4 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">{biz.name}</p>
                          <Badge
                            className={
                              alreadyLead
                                ? "bg-green-500/10 text-green-600 border-green-500/30 shrink-0 hover:bg-green-500/10"
                                : "shrink-0"
                            }
                            variant={alreadyLead ? "outline" : "secondary"}
                          >
                            {alreadyLead ? "Ya en leads" : "Nuevo"}
                          </Badge>
                        </div>
                        {biz.address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{biz.address}</span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(biz.name + " " + biz.address)}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Ver en Google Maps"
                              className="ml-0.5 text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Globe className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                        {biz.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" />
                            {biz.phone}
                          </p>
                        )}
                        {!alreadyLead && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-2 gap-2"
                            disabled={addingIdx === idx}
                            onClick={() => handleAddToLeads(biz, idx)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {addingIdx === idx ? "Agregando..." : "Agregar a Leads"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Web</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((biz, idx) => {
                        const alreadyLead = biz.isInLeads || addedIdxs.has(idx);
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium max-w-[160px]">
                              <span className="block truncate">{biz.name}</span>
                            </TableCell>
                            <TableCell className="max-w-[220px]">
                              <div className="flex items-center gap-1.5">
                                <span className="block truncate text-sm text-muted-foreground">
                                  {biz.address || "—"}
                                </span>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(biz.name + " " + biz.address)}&query_place_id=${encodeURIComponent(biz.lat + "," + biz.lng)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Ver en Google Maps"
                                  className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <MapPin className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {biz.phone ? (
                                <a href={`tel:${biz.phone}`} className="hover:text-primary">
                                  {biz.phone}
                                </a>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              {biz.website ? (
                                <a
                                  href={biz.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <Globe className="h-3.5 w-3.5" />
                                  Ver
                                </a>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                {biz.type ?? "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              {alreadyLead ? (
                                <Badge className="bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/10">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Ya en leads
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Nuevo</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {!alreadyLead ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={addingIdx === idx}
                                  onClick={() => handleAddToLeads(biz, idx)}
                                  className="gap-1.5"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  {addingIdx === idx ? "Agregando..." : "Agregar a Leads"}
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
