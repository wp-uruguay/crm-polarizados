"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

interface Remito {
  id: string;
  remitoNumber: string;
  saleNumber: string;
  clientName: string;
  date: string;
  items: Array<{
    productName: string;
    quantity: number;
  }>;
}

export default function RemitosPage() {
  const searchParams = useSearchParams();
  const saleIdFilter = searchParams.get("saleId");

  const [remitos, setRemitos] = useState<Remito[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printingId, setPrintingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRemitos() {
      try {
        const params = new URLSearchParams();
        if (saleIdFilter) params.set("saleId", saleIdFilter);
        const res = await fetch(`/api/remitos?${params}`);
        if (!res.ok) throw new Error("Error al cargar remitos");
        const json = await res.json();
        setRemitos(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    fetchRemitos();
  }, [saleIdFilter]);

  function handlePrint(remitoId: string) {
    setPrintingId(remitoId);
    const printWindow = window.open(`/api/remitos/${remitoId}/print`, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        setPrintingId(null);
      };
    } else {
      setPrintingId(null);
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
            <p className="text-center text-muted-foreground py-8">
              Cargando remitos...
            </p>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4 text-red-600">
              {error}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N.ro Remito</TableHead>
                  <TableHead>N.ro Venta</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remitos.map((remito) => (
                  <TableRow key={remito.id}>
                    <TableCell className="font-medium">
                      {remito.remitoNumber}
                    </TableCell>
                    <TableCell>{remito.saleNumber}</TableCell>
                    <TableCell>{remito.clientName}</TableCell>
                    <TableCell>{formatDate(remito.date)}</TableCell>
                    <TableCell>
                      {(remito.items ?? [])
                        .map((item) => `${item.productName} x${item.quantity}`)
                        .join(", ")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrint(remito.id)}
                        disabled={printingId === remito.id}
                      >
                        {printingId === remito.id ? "Imprimiendo..." : "Imprimir"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {remitos.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
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
