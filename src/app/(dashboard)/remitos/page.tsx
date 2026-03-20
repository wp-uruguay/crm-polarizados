"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { downloadRemitoPDF } from "@/components/remito-pdf";
import { Download } from "lucide-react";

interface RemitoRaw {
  id: string;
  number: number;
  issuedAt: string;
  notes: string | null;
  facturaInfo: string | null;
  sale: {
    number: number;
    total: number;
    subtotal: number;
    discount: number;
    tax: number;
    requiresFactura: boolean;
    contact: {
      firstName: string;
      lastName: string;
      company: string | null;
      email: string | null;
      phone: string | null;
      address: string | null;
    };
    items: Array<{
      quantity: number;
      unitPrice: number;
      total: number;
      product: { name: string; category: string };
    }>;
  };
}

function RemitosPageInner() {
  const searchParams = useSearchParams();
  const saleIdFilter = searchParams.get("saleId");

  const [remitos, setRemitos] = useState<RemitoRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRemitos() {
      try {
        const params = new URLSearchParams();
        if (saleIdFilter) params.set("saleId", saleIdFilter);
        const res = await fetch(`/api/remitos?${params}`);
        if (!res.ok) throw new Error("Error al cargar remitos");
        setRemitos(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    fetchRemitos();
  }, [saleIdFilter]);

  function handleDownloadPDF(remito: RemitoRaw) {
    setDownloadingId(remito.id);
    try {
      downloadRemitoPDF(remito);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Remitos</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando remitos...</p>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4 text-red-600">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#Remito</TableHead>
                  <TableHead>#Venta</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remitos.map((remito) => (
                  <TableRow key={remito.id}>
                    <TableCell className="font-medium">{remito.number}</TableCell>
                    <TableCell>{remito.sale?.number}</TableCell>
                    <TableCell>
                      {remito.sale?.contact
                        ? `${remito.sale.contact.firstName} ${remito.sale.contact.lastName}${remito.sale.contact.company ? ` (${remito.sale.contact.company})` : ""}`
                        : "—"}
                    </TableCell>
                    <TableCell>{formatDate(remito.issuedAt)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {(remito.sale?.items ?? []).map((i) => `${i.product.name} x${i.quantity}`).join(", ")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(remito)}
                        disabled={downloadingId === remito.id}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        {downloadingId === remito.id ? "Generando..." : "PDF"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {remitos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No hay remitos registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function RemitosPage() {
  return (
    <Suspense>
      <RemitosPageInner />
    </Suspense>
  );
}
