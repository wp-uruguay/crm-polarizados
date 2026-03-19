"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/contexts/currency-context";
import { Plus, FileText, Trash2 } from "lucide-react";
import Link from "next/link";

interface Quote {
  id: string;
  number: number;
  contact: { id: string; firstName: string; lastName: string; company: string | null };
  total: string;
  status: string;
  createdAt: string;
  items: Array<{ product: { name: string }; quantity: number; total: string }>;
}

interface Product {
  id: string;
  name: string;
  price: string;
  stock: number;
  category: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  type: string;
}

const statusColors: Record<string, string> = {
  DRAFT: "secondary",
  SENT: "default",
  ACCEPTED: "default",
  REJECTED: "destructive",
  CONVERTED: "outline",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  ACCEPTED: "Aceptado",
  REJECTED: "Rechazado",
  CONVERTED: "Convertido",
};

export default function QuotesPage() {
  const { format: formatCurrency } = useCurrency();
  const searchParams = useSearchParams();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(!!searchParams.get("contactId"));
  const [form, setForm] = useState({
    contactId: searchParams.get("contactId") || "",
    items: [{ productId: "", quantity: 1, unitPrice: 0 }] as Array<{ productId: string; quantity: number; unitPrice: number }>,
    discount: 0,
    notes: "",
  });

  useEffect(() => {
    fetchQuotes();
    fetchProducts();
    fetchContacts();
  }, []);

  async function fetchQuotes() {
    try {
      const res = await fetch("/api/quotes");
      const data = await res.json();
      setQuotes(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {}
  }

  async function fetchContacts() {
    try {
      const [leadsRes, clientsRes] = await Promise.all([
        fetch("/api/leads"),
        fetch("/api/clients"),
      ]);
      const leads = await leadsRes.json();
      const clients = await clientsRes.json();
      setContacts([...(Array.isArray(leads) ? leads : []), ...(Array.isArray(clients) ? clients : [])]);
    } catch {}
  }

  function addItem() {
    setForm({ ...form, items: [...form.items, { productId: "", quantity: 1, unitPrice: 0 }] });
  }

  function removeItem(index: number) {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  }

  function updateItem(index: number, field: string, value: string | number) {
    const items = [...form.items];
    (items[index] as Record<string, string | number>)[field] = value;
    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      if (product) items[index].unitPrice = parseFloat(product.price);
    }
    setForm({ ...form, items });
  }

  async function handleCreate() {
    const subtotal = form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const total = subtotal - form.discount;
    try {
      await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: form.contactId,
          items: form.items.filter((i) => i.productId),
          discount: form.discount,
          subtotal,
          total,
          notes: form.notes,
          userId: "system",
        }),
      });
      setShowForm(false);
      setForm({ contactId: "", items: [{ productId: "", quantity: 1, unitPrice: 0 }], discount: 0, notes: "" });
      fetchQuotes();
    } catch (err) { console.error(err); }
  }

  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Presupuestos</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />Nuevo Presupuesto
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Crear Presupuesto</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Contacto</Label>
              <Select value={form.contactId || undefined} onValueChange={(v) => setForm({ ...form, contactId: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar contacto" /></SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.type === "CLIENT" ? "Cliente" : "Lead"})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Productos</Label>
              {form.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 mt-2">
                  <Select value={item.productId || undefined} onValueChange={(v) => updateItem(idx, "productId", v)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} - Stock: {p.stock} - {formatCurrency(p.price)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" className="w-20" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 0)} min={1} placeholder="Cant" />
                  <Input type="number" className="w-28" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} placeholder="Precio" />
                  <span className="flex items-center w-28 text-sm">{formatCurrency(item.quantity * item.unitPrice)}</span>
                  {form.items.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" className="mt-2" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Agregar Item</Button>
            </div>

            <div className="flex gap-4 items-end">
              <div>
                <Label>Descuento</Label>
                <Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} className="w-32" />
              </div>
              <div className="text-lg font-bold">Total: {formatCurrency(subtotal - form.discount)}</div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreate}>Crear Presupuesto</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {loading ? <p>Cargando...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell>#{quote.number}</TableCell>
                    <TableCell>{quote.contact?.firstName} {quote.contact?.lastName}</TableCell>
                    <TableCell>{quote.items?.length || 0} items</TableCell>
                    <TableCell>{formatCurrency(quote.total)}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[quote.status] as "default" | "secondary" | "destructive" | "outline"}>
                        {statusLabels[quote.status] || quote.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(quote.createdAt)}</TableCell>
                    <TableCell>
                      <Link href={`/quotes/${quote.id}`}>
                        <Button variant="ghost" size="sm"><FileText className="h-4 w-4" /></Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {quotes.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-gray-500">No hay presupuestos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
