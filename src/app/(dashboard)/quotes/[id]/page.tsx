"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/contexts/currency-context";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import Link from "next/link";

interface QuoteDetail {
  id: string;
  number: number;
  contact: { firstName: string; lastName: string; company: string | null };
  status: string;
  subtotal: string;
  discount: string;
  total: string;
  notes: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    product: { name: string; category: string };
    quantity: number;
    unitPrice: string;
    total: string;
  }>;
}

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador", SENT: "Enviado", ACCEPTED: "Aceptado", REJECTED: "Rechazado", CONVERTED: "Convertido",
};

export default function QuoteDetailPage() {
  const { format: formatCurrency } = useCurrency();
  const params = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => { fetchQuote(); }, [params.id]);

  async function fetchQuote() {
    try {
      const res = await fetch(`/api/quotes/${params.id}`);
      setQuote(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleConvert() {
    setConverting(true);
    try {
      const res = await fetch(`/api/quotes/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "convert" }),
      });
      if (res.ok) router.push("/sales");
    } catch (err) { console.error(err); }
    finally { setConverting(false); }
  }

  async function updateStatus(status: string) {
    try {
      await fetch(`/api/quotes/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchQuote();
    } catch (err) { console.error(err); }
  }

  if (loading) return <div className="p-8">Cargando...</div>;
  if (!quote) return <div className="p-8">Presupuesto no encontrado</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/quotes"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Presupuesto #{quote.number}</h1>
        <Badge>{statusLabels[quote.status]}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Información</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-gray-500">Cliente:</span> {quote.contact?.firstName} {quote.contact?.lastName}</p>
            <p><span className="text-gray-500">Empresa:</span> {quote.contact?.company || "-"}</p>
            <p><span className="text-gray-500">Fecha:</span> {formatDate(quote.createdAt)}</p>
            {quote.notes && <p><span className="text-gray-500">Notas:</span> {quote.notes}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Acciones</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {quote.status === "DRAFT" && (
              <Button className="w-full" variant="outline" onClick={() => updateStatus("SENT")}>Marcar como Enviado</Button>
            )}
            {quote.status === "SENT" && (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => updateStatus("ACCEPTED")}>Aceptar</Button>
                <Button className="flex-1" variant="destructive" onClick={() => updateStatus("REJECTED")}>Rechazar</Button>
              </div>
            )}
            {quote.status === "ACCEPTED" && (
              <Button className="w-full" onClick={handleConvert} disabled={converting}>
                <ShoppingCart className="h-4 w-4 mr-2" />{converting ? "Convirtiendo..." : "Convertir a Venta"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Precio Unit.</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product?.name}</TableCell>
                  <TableCell><Badge variant="outline">{item.product?.category}</Badge></TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell>{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 text-right space-y-1">
            <p>Subtotal: {formatCurrency(quote.subtotal)}</p>
            <p>Descuento: {formatCurrency(quote.discount)}</p>
            <p className="text-xl font-bold">Total: {formatCurrency(quote.total)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
