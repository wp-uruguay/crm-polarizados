import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rows } = body as { rows: Record<string, string>[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No hay filas para importar" }, { status: 400 });
    }

    const SECTOR_MAP: Record<string, string> = {
      automotriz: "AUTOMOTRIZ", automotive: "AUTOMOTRIZ",
      arquitectura: "ARQUITECTURA", architecture: "ARQUITECTURA",
      software: "SOFTWARE",
    };

    const data = rows.map((row) => {
      const rawSector = (row.sector || row.rubro || "").trim().toLowerCase();
      const sector = SECTOR_MAP[rawSector] ?? (rawSector ? rawSector.toUpperCase() : null);

      return {
        type: "LEAD" as const,
        firstName: (row.firstName || row.nombre || "").trim(),
        lastName: (row.lastName || row.apellido || "").trim(),
        company: (row.company || row.empresa || "").trim() || null,
        sector: sector || null,
        email: (row.email || row.correo || "").trim() || null,
        phone: (row.phone || row.telefono || row.teléfono || "").trim() || null,
        whatsapp: (row.whatsapp || "").trim() || null,
        address: (row.address || row.direccion || row.dirección || "").trim() || null,
        notes: (row.notes || row.notas || "").trim() || null,
      };
    });

    // Filter rows that at minimum have a firstName or a company
    const valid = data.filter((r) => r.firstName || r.company);

    if (valid.length === 0) {
      return NextResponse.json({ error: "Ninguna fila tiene nombre o empresa válida" }, { status: 400 });
    }

    const result = await prisma.contact.createMany({ data: valid, skipDuplicates: false });

    return NextResponse.json({ imported: result.count });
  } catch (error) {
    console.error("Error importing leads:", error);
    return NextResponse.json({ error: "Error al importar leads" }, { status: 500 });
  }
}
