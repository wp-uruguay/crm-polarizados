"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/contexts/currency-context";
import { Plus, Trash2 } from "lucide-react";

interface Sale {
  id: string;
  number: number;
  contact: { firstName: string; lastName: string };
  type: string;
  status: string;
  total: string;
  createdAt: string;
  payments: Array<{ amount: string }>;
}

interface Product { id: string; name: string; price: string; stock: number; }
interface Contact { id: string; firstName: string; lastName: string; type: string; }

export default function SalesPage() {
  const { format: formatCurrency } = useCurrency();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    contactId: "", type: "REGULAR",
    items: [{ productId: "", quantity: 1, unitPrice: 0 }] as Array<{ productId: string; quantity: number; unitPrice: number }>,
    discount: 0, notes: "", requiresFactura: false,
  });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    try {
      const [salesRes, prodRes, leadsRes, clientsRes] = await Promise.all([
        fetch("/api/sales"), fetch("/api/products"), fetch("/api/leads"), fetch("/api/clients"),
      ]);
      setSales(await salesRes.json().then(d => Array.isArray(d) ? d : []));
      setProducts(await prodRes.json().then(d => Array.isArray(d) ? d : []));
      const leads = await leadsRes.json().then(d => Array.isArray(d) ? d : []);
      const clients = await clientsRes.json().then(d => Array.isArray(d) ? d : []);
      setContacts([...leads, ...clients]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function updateItem(idx: number, field: string, value: string | number) {
    const items = [...form.items];
    (items[idx] as Record<string, string | number>)[field] = value;
    if (field === "productId") {
      const p = products.find((p) => p.id === value);
      if (p) items[idx].unitPrice = parseFloat(p.price);
    }
    setForm({ ...form, items });
  }

  async function handleCreate() {
    const subtotal = form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    try {
      await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, subtotal, total: subtotal - form.discount, userId: "system" }),
      });
      setShowForm(false);
      setForm({ contactId: "", type: "REGULAR", items: [{ productId: "", quantity: 1, unitPrice: 0 }], discount: 0, notes: "", requiresFactura: false });
      fetchAll();
    } catch (err) { console.error(err); }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ventas</h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-2" />Nueva Venta</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Crear Venta</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contacto</Label>
                <Select value={form.contactId || undefined} onValueChange={(v) => setForm({ ...form, contactId: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REGULAR">Regular</SelectItem>
                    <SelectItem value="CONSIGNMENT">Consignación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Productos</Label>
              {form.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 mt-2">
                  <Select value={item.productId || undefined} onValueChange={(v) => updateItem(idx, "productId", v)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" className="w-20" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 0)} min={1} />
                  <Input type="number" className="w-28" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} />
                  <span className="flex items-center w-28 text-sm">{formatCurrency(item.quantity * item.unitPrice)}</span>
                  {form.items.length > 1 && <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              ))}
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setForm({ ...form, items: [...form.items, { productId: "", quantity: 1, unitPrice: 0 }] })}><Plus className="h-4 w-4 mr-1" />Item</Button>
            </div>
            <div className="flex gap-4 items-end">
              <div><Label>Descuento</Label><Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} className="w-32" /></div>
              <p className="text-lg font-bold">Total: {formatCurrency(form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) - form.discount)}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requiresFacturaSale"
                checked={form.requiresFactura}
                onChange={(e) => setForm({ ...form, requiresFactura: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="requiresFacturaSale">Requiere facturación</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Crear Venta</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {loading ? <p>Cargando...</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>#</TableHead><TableHead>Cliente</TableHead><TableHead>Tipo</TableHead><TableHead>Total</TableHead><TableHead>Pagado</TableHead><TableHead>Estado</TableHead><TableHead>Fecha</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {sales.map((sale) => {
                  const paid = sale.payments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;
                  const total = parseFloat(sale.total);
                  return (
                    <TableRow key={sale.id}>
                      <TableCell>#{sale.number}</TableCell>
                      <TableCell>{sale.contact?.firstName} {sale.contact?.lastName}</TableCell>
                      <TableCell><Badge variant={sale.type === "CONSIGNMENT" ? "outline" : "default"}>{sale.type === "CONSIGNMENT" ? "Consignación" : "Regular"}</Badge></TableCell>
                      <TableCell>{formatCurrency(sale.total)}</TableCell>
                      <TableCell>{formatCurrency(paid)}</TableCell>
                      <TableCell><Badge variant={paid >= total ? "default" : "destructive"}>{paid >= total ? "Pagado" : "Pendiente"}</Badge></TableCell>
                      <TableCell>{formatDate(sale.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
                {sales.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-gray-500">No hay ventas</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
