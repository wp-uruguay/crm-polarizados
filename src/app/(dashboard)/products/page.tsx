"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Trash2, Sparkles, Filter, ChevronDown,
  Search, Package, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown,
  Ban, Power, Settings2,
} from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";

// ── Constants ─────────────────────────────────────────────────────────────────
const SUBCATEGORIES: Record<string, { value: string; label: string }[]> = {
  AUTOMOTIVE: [
    { value: "PREMIUM", label: "Premium" },
    { value: "NANOCERAMIC", label: "Nanoceramic" },
    { value: "NANOCARBON", label: "Nanocarbon" },
    { value: "SAFETY", label: "Safety" },
    { value: "PPF", label: "PPF" },
  ],
  ARCHITECTURAL: [
    { value: "SOLAR", label: "Solar" },
    { value: "DECORATIVE", label: "Decorativa" },
    { value: "SAFETY", label: "Safety" },
    { value: "FROSTED", label: "Esmerilada" },
  ],
  PPF: [
    { value: "GLOSS", label: "Gloss" },
    { value: "MATTE", label: "Matte" },
    { value: "SATIN", label: "Satin" },
  ],
};

const SHADE_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const val = String((i + 1) * 5).padStart(2, "0");
  return { value: val, label: `${val}%` };
});

const CATEGORY_LABEL: Record<string, string> = {
  AUTOMOTIVE: "Automotriz",
  ARCHITECTURAL: "Arquitectónica",
  PPF: "PPF",
};

const CATEGORY_COLORS: Record<string, string> = {
  AUTOMOTIVE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  ARCHITECTURAL: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  PPF: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface Discount {
  id?: string;
  type: "FIXED" | "PERCENTAGE";
  value: number;
  label: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  shade: string | null;
  stock: number;
  minStock: number;
  price: number;
  cost: number | null;
  description: string | null;
  imageUrl: string | null;
  active: boolean;
  createdAt: string;
  discounts: Discount[];
  _count: { units: number };
}

// ── Button group classes ───────────────────────────────────────────────────────
const btnBase =
  "h-9 px-3 text-sm font-medium border border-zinc-700 bg-zinc-900 text-zinc-100 " +
  "hover:bg-zinc-800 hover:border-zinc-600 transition-colors flex items-center gap-1.5 " +
  "disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer select-none";
const btnFirst = btnBase + " rounded-l-md border-r-0";
const btnMiddle = btnBase + " border-r-0";
const btnLast = btnBase + " rounded-r-md";

const EMPTY_FORM = {
  name: "",
  category: "AUTOMOTIVE",
  subcategory: "",
  brand: "",
  shade: "",
  stock: "0",
  minStock: "0",
  price: "",
  cost: "",
  description: "",
  imageUrl: "",
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const { format: formatCurrency } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Filters
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterSubcategory, setFilterSubcategory] = useState<string | null>(null);
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [sortDate, setSortDate] = useState<"asc" | "desc" | null>(null);

  const activeFilterCount = [
    filterCategory !== null,
    filterSubcategory !== null,
    filterLowStock,
    sortDate !== null,
  ].filter(Boolean).length;

  // Create/Edit modal
  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [improvingDesc, setImprovingDesc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function fetchProducts() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error("Error al cargar productos");
      setProducts(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProducts(); }, [search]);

  // ── Client-side filter ────────────────────────────────────────────────────
  const visibleProducts = useMemo(() => {
    let result = [...products];
    if (filterCategory) result = result.filter((p) => p.category === filterCategory);
    if (filterSubcategory) result = result.filter((p) => p.subcategory === filterSubcategory);
    if (filterLowStock) result = result.filter((p) => p.stock <= p.minStock);
    if (sortDate === "asc")
      result = [...result].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (sortDate === "desc")
      result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }, [products, filterCategory, filterSubcategory, filterLowStock, sortDate]);

  function clearFilters() {
    setFilterCategory(null);
    setFilterSubcategory(null);
    setFilterLowStock(false);
    setSortDate(null);
  }

  // ── Selection helpers ─────────────────────────────────────────────────────
  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === visibleProducts.length
        ? new Set()
        : new Set(visibleProducts.map((p) => p.id))
    );
  }, [visibleProducts]);

  // ── Bulk operations ───────────────────────────────────────────────────────
  async function bulkDeactivate() {
    if (!confirm(`¿Desactivar ${selected.size} producto(s)?`)) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], action: "deactivate" }),
      });
      if (!res.ok) throw new Error();
      setSelected(new Set());
      fetchProducts();
    } catch { setError("Error al desactivar productos"); }
    finally { setBulkLoading(false); }
  }

  async function bulkDelete() {
    if (!confirm(`¿Eliminar ${selected.size} producto(s) permanentemente? Esta acción no se puede deshacer.`)) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], action: "delete" }),
      });
      if (!res.ok) throw new Error();
      setSelected(new Set());
      fetchProducts();
    } catch { setError("Error al eliminar productos"); }
    finally { setBulkLoading(false); }
  }

  // ── Image handling ────────────────────────────────────────────────────────
  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen no puede superar 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      setForm((f) => ({ ...f, imageUrl: b64 }));
      setImagePreview(b64);
    };
    reader.readAsDataURL(file);
  }

  // ── AI description ─────────────────────────────────────────────────────────
  async function improveDescription() {
    setImprovingDesc(true);
    try {
      const res = await fetch("/api/ai/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description,
          productName: form.name,
          category: CATEGORY_LABEL[form.category] ?? form.category,
          subcategory: form.subcategory,
          shade: form.shade,
          brand: form.brand,
        }),
      });
      const json = await res.json();
      if (res.ok && json.description) {
        setForm((f) => ({ ...f, description: json.description }));
      }
    } catch { /* silent */ }
    finally { setImprovingDesc(false); }
  }

  // ── Discounts ─────────────────────────────────────────────────────────────
  function addDiscount() {
    setDiscounts((d) => [...d, { type: "PERCENTAGE", value: 0, label: "" }]);
  }

  function removeDiscount(idx: number) {
    setDiscounts((d) => d.filter((_, i) => i !== idx));
  }

  function updateDiscount(idx: number, patch: Partial<Discount>) {
    setDiscounts((d) => d.map((item, i) => i === idx ? { ...item, ...patch } : item));
  }

  // ── Create product ────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          subcategory: form.subcategory || null,
          brand: form.brand || null,
          shade: form.shade || null,
          stock: parseInt(form.stock) || 0,
          minStock: parseInt(form.minStock) || 0,
          price: parseFloat(form.price) || 0,
          cost: form.cost ? parseFloat(form.cost) : null,
          description: form.description || null,
          imageUrl: form.imageUrl || null,
          discounts: discounts.filter((d) => d.value > 0),
        }),
      });
      if (!res.ok) throw new Error("Error al crear producto");
      setDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear producto");
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setForm({ ...EMPTY_FORM });
    setDiscounts([]);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function applySearch() { setSearch(searchInput); }

  // ── Shade options (PPF = manual input) ───────────────────────────────────
  const isPPF = form.category === "AUTOMOTIVE" && form.subcategory === "PPF";

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Productos / Stock</h1>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2">
          <Plus size={16} />
          Nuevo Producto
        </Button>
      </div>

      {/* ── Create Product Modal ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Producto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">

            {/* Nombre */}
            <div className="space-y-1">
              <Label>Nombre del producto *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Ej: Lámina Premium Negro" />
            </div>

            {/* Categoría + Subcategoría */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Categoría *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v, subcategory: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTOMOTIVE">Automotriz</SelectItem>
                    <SelectItem value="ARCHITECTURAL">Arquitectónica</SelectItem>
                    <SelectItem value="PPF">PPF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Subcategoría</Label>
                <Select value={form.subcategory || undefined} onValueChange={(v) => setForm({ ...form, subcategory: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {(SUBCATEGORIES[form.category] ?? []).map((sub) => (
                      <SelectItem key={sub.value} value={sub.value}>{sub.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tonalidad + Marca */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tonalidad {isPPF && <span className="text-muted-foreground text-xs">(manual)</span>}</Label>
                {isPPF ? (
                  <Input value={form.shade} onChange={(e) => setForm({ ...form, shade: e.target.value })} placeholder="Ej: Gloss, Matte..." />
                ) : (
                  <Select value={form.shade || undefined} onValueChange={(v) => setForm({ ...form, shade: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {SHADE_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1">
                <Label>Marca</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Ej: 3M, Llumar..." />
              </div>
            </div>

            {/* Stock + Min Stock */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Stock inicial</Label>
                <Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Stock mínimo</Label>
                <Input type="number" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
              </div>
            </div>

            {/* Precio + Costo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Precio de venta *</Label>
                <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>Costo</Label>
                <Input type="number" step="0.01" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="Opcional" />
              </div>
            </div>

            {/* Imagen */}
            <div className="space-y-1">
              <Label>Foto del producto</Label>
              <div className="flex items-center gap-3">
                <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageFile} className="flex-1" />
                {(imagePreview || form.imageUrl) && (
                  <div className="w-16 h-16 rounded-md border overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview ?? form.imageUrl ?? ""} alt="preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Máximo 2MB. Se almacena como imagen embebida.</p>
            </div>

            {/* Descripción + IA */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>Descripción</Label>
                <Button type="button" variant="outline" size="sm" onClick={improveDescription} disabled={improvingDesc} className="gap-1.5 h-7 text-xs">
                  <Sparkles size={13} className="text-primary" />
                  {improvingDesc ? "Procesando..." : "Mejorar con IA"}
                </Button>
              </div>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Descripción técnica del producto..."
              />
            </div>

            {/* Descuentos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Descuentos</Label>
                <Button type="button" variant="outline" size="sm" onClick={addDiscount} className="gap-1.5 h-7 text-xs">
                  <Plus size={12} /> Agregar descuento
                </Button>
              </div>
              {discounts.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin descuentos configurados.</p>
              )}
              {discounts.map((discount, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <div className="flex-1 space-y-0">
                    <Input
                      placeholder="Etiqueta (ej: Mayorista)"
                      value={discount.label}
                      onChange={(e) => updateDiscount(idx, { label: e.target.value })}
                      className="h-7 text-xs border-0 px-0 focus-visible:ring-0 bg-transparent"
                    />
                  </div>
                  <Select value={discount.type} onValueChange={(v) => updateDiscount(idx, { type: v as "FIXED" | "PERCENTAGE" })}>
                    <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">%</SelectItem>
                      <SelectItem value="FIXED">$ Fijo</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" step="0.01" min="0"
                    value={discount.value}
                    onChange={(e) => updateDiscount(idx, { value: parseFloat(e.target.value) || 0 })}
                    className="h-7 w-20 text-xs"
                  />
                  <button type="button" onClick={() => removeDiscount(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={creating}>{creating ? "Creando..." : "Crear Producto"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Table Card ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">

            {/* Search */}
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar productos..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applySearch(); }}
                className="pl-9 pr-10 w-56"
              />
              <button
                type="button"
                onClick={applySearch}
                className="absolute right-2 flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <kbd className="text-[10px] font-mono leading-none">↵</kbd>
              </button>
            </div>

            {/* Desktop: Inline Button Group */}
            <div className="hidden md:flex items-center">

              {/* Filtrar */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={btnFirst}>
                    <Filter size={14} />
                    Filtrar
                    {activeFilterCount > 0 && (
                      <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                    <ChevronDown size={12} className="ml-0.5 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">

                  {/* Por fecha */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2">
                      <ArrowUpDown size={13} /> Por fecha
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setSortDate("desc")} className="gap-2">
                        <ArrowDown size={13} /> Más recientes {sortDate === "desc" && "✓"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortDate("asc")} className="gap-2">
                        <ArrowUp size={13} /> Más antiguos {sortDate === "asc" && "✓"}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Por categoría */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2">
                      <Package size={13} /> Por categoría {filterCategory && `(${CATEGORY_LABEL[filterCategory] ?? filterCategory})`}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {Object.entries(CATEGORY_LABEL).map(([val, label]) => (
                        <DropdownMenuItem key={val} onClick={() => { setFilterCategory(filterCategory === val ? null : val); setFilterSubcategory(null); }} className="gap-2">
                          {label} {filterCategory === val && "✓"}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Por subcategoría */}
                  {filterCategory && (SUBCATEGORIES[filterCategory] ?? []).length > 0 && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2">
                        <Filter size={13} /> Por subcategoría
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {(SUBCATEGORIES[filterCategory] ?? []).map((sub) => (
                          <DropdownMenuItem key={sub.value} onClick={() => setFilterSubcategory(filterSubcategory === sub.value ? null : sub.value)} className="gap-2">
                            {sub.label} {filterSubcategory === sub.value && "✓"}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}

                  {/* Stock bajo */}
                  <DropdownMenuItem onClick={() => setFilterLowStock(!filterLowStock)} className="gap-2">
                    <AlertTriangle size={13} className="text-amber-500" />
                    Stock bajo {filterLowStock && "✓"}
                  </DropdownMenuItem>

                  {activeFilterCount > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={clearFilters} className="text-destructive gap-2">
                        Limpiar filtros
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Stock bajo rápido */}
              <button
                className={btnMiddle + (filterLowStock ? " !bg-zinc-700 !text-amber-400" : "")}
                onClick={() => setFilterLowStock(!filterLowStock)}
              >
                <AlertTriangle size={14} />
                Stock bajo
              </button>

              {/* Desactivados */}
              <Link href="/products/deactivated">
                <button className={btnLast}>
                  <Ban size={14} />
                  Desactivados
                </button>
              </Link>
            </div>

            {/* Mobile: Single Dropdown */}
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
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2"><Package size={13} />Por categoría</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {Object.entries(CATEGORY_LABEL).map(([val, label]) => (
                          <DropdownMenuItem key={val} onClick={() => { setFilterCategory(filterCategory === val ? null : val); setFilterSubcategory(null); }} className="gap-2">
                            {label} {filterCategory === val && "✓"}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    {filterCategory && (SUBCATEGORIES[filterCategory] ?? []).length > 0 && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="gap-2"><Filter size={13} />Por subcategoría</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {(SUBCATEGORIES[filterCategory] ?? []).map((sub) => (
                            <DropdownMenuItem key={sub.value} onClick={() => setFilterSubcategory(filterSubcategory === sub.value ? null : sub.value)} className="gap-2">
                              {sub.label} {filterSubcategory === sub.value && "✓"}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )}
                    <DropdownMenuItem onClick={() => setFilterLowStock(!filterLowStock)} className="gap-2">
                      <AlertTriangle size={13} className="text-amber-500" /> Stock bajo {filterLowStock && "✓"}
                    </DropdownMenuItem>
                    {activeFilterCount > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={clearFilters} className="text-destructive gap-2">Limpiar filtros</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterLowStock(!filterLowStock)} className="gap-2">
                  <AlertTriangle size={13} className={filterLowStock ? "text-amber-400" : "text-amber-500"} />
                  Stock bajo {filterLowStock && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/products/deactivated" className="gap-2">
                    <Ban size={13} /> Desactivados
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bulk actions - shown when products selected */}
            {selected.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">{selected.size} seleccionado{selected.size > 1 ? "s" : ""}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={bulkDeactivate}
                  disabled={bulkLoading}
                  className="gap-1.5 text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                >
                  <Power size={14} />
                  Desactivar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={bulkDelete}
                  disabled={bulkLoading}
                  className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <Trash2 size={14} />
                  Eliminar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4 text-red-600">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={visibleProducts.length > 0 && selected.size === visibleProducts.length}
                        onCheckedChange={toggleAll}
                        aria-label="Seleccionar todos"
                      />
                    </TableHead>
                    <TableHead>Foto</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Subcategoría</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Tonalidad</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Descuentos</TableHead>
                    <TableHead>Unidades</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Ver</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleProducts.map((product) => (
                    <TableRow key={product.id} className={selected.has(product.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(product.id)}
                          onCheckedChange={() => toggleOne(product.id)}
                          aria-label={`Seleccionar ${product.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.imageUrl} alt={product.name}
                            className="w-10 h-10 rounded-md object-cover border" />
                        ) : (
                          <div className="w-10 h-10 rounded-md border bg-muted flex items-center justify-center">
                            <Package size={16} className="text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs border-0 ${CATEGORY_COLORS[product.category] ?? "bg-zinc-100 text-zinc-700"}`}>
                          {CATEGORY_LABEL[product.category] ?? product.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {product.subcategory ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm">{product.brand ?? "-"}</TableCell>
                      <TableCell className="text-sm">
                        {product.shade ? `${product.shade}%` : "-"}
                      </TableCell>
                      <TableCell>
                        <span className={product.stock <= product.minStock ? "font-bold text-red-500" : "font-medium"}>
                          {product.stock}
                        </span>
                        <span className="text-muted-foreground text-xs ml-1">/ {product.minStock}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-medium">{formatCurrency(product.price)}</TableCell>
                      <TableCell>
                        {product.discounts.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {product.discounts.map((d, i) => (
                              <span key={i} className="text-xs text-muted-foreground whitespace-nowrap">
                                {d.label && <span className="font-medium text-foreground">{d.label}: </span>}
                                {d.type === "PERCENTAGE" ? `${d.value}%` : formatCurrency(d.value)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{product._count.units}</span>
                        <span className="text-xs text-muted-foreground ml-1">unidades</span>
                      </TableCell>
                      <TableCell>
                        {product.stock <= product.minStock ? (
                          <Badge variant="destructive" className="whitespace-nowrap">Stock Bajo</Badge>
                        ) : (
                          <Badge variant="default" className="whitespace-nowrap bg-green-600">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/products/${product.id}`}>
                          <Button variant="outline" size="sm">Ver</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visibleProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                        No se encontraron productos
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
