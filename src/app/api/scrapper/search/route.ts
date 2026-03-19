import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

function buildOverpassQuery(lat: number, lng: number, radiusM: number): string {
  return `[out:json][timeout:20];
(
  node["shop"~"car_repair|glass|tyres|car_wash"](around:${radiusM},${lat},${lng});
  way["shop"~"car_repair|glass|tyres|car_wash"](around:${radiusM},${lat},${lng});
  node["craft"~"glazier|car_repair"](around:${radiusM},${lat},${lng});
  way["craft"~"glazier|car_repair"](around:${radiusM},${lat},${lng});
  node["amenity"~"car_wash|car_rental"](around:${radiusM},${lat},${lng});
  way["amenity"~"car_wash|car_rental"](around:${radiusM},${lat},${lng});
  node["name"~"polarizado|film|ppf|vidrio|laminado|tintado|autodetailing|detailing",i](around:${radiusM},${lat},${lng});
  way["name"~"polarizado|film|ppf|vidrio|laminado|tintado|autodetailing|detailing",i](around:${radiusM},${lat},${lng});
  node["shop"="car"]["name"](around:${radiusM},${lat},${lng});
  way["shop"="car"]["name"](around:${radiusM},${lat},${lng});
);
out center tags;`;
}

interface OsmTags {
  name?: string;
  "addr:street"?: string;
  "addr:housenumber"?: string;
  "addr:city"?: string;
  "addr:suburb"?: string;
  "contact:phone"?: string;
  phone?: string;
  "contact:website"?: string;
  website?: string;
  shop?: string;
  craft?: string;
  amenity?: string;
  office?: string;
}

interface OsmElement {
  type: "node" | "way";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OsmTags;
}

function extractAddress(tags: OsmTags): string {
  const parts = [
    tags["addr:street"],
    tags["addr:housenumber"],
    tags["addr:suburb"],
    tags["addr:city"],
  ].filter(Boolean);
  return parts.join(" ").trim();
}

function extractPhone(tags: OsmTags): string {
  return (tags["contact:phone"] || tags["phone"] || "").trim();
}

function extractWebsite(tags: OsmTags): string {
  return (tags["contact:website"] || tags["website"] || "").trim();
}

function inferType(tags: OsmTags): string {
  const shop = tags.shop ?? "";
  const craft = tags.craft ?? "";
  const amenity = tags.amenity ?? "";
  const name = (tags.name ?? "").toLowerCase();

  if (shop === "car" || name.includes("concesion")) return "Concesionarias";
  if (shop === "glass" || craft === "glazier" || name.includes("vidrier")) return "Vidriería/Glass";
  if (amenity === "car_wash" || name.includes("detailing") || name.includes("autodetailing")) return "Talleres/Autodetailing";
  if (name.includes("arquitectura") || name.includes("construccion")) return "Arquitectura";
  return "Talleres/Autodetailing";
}

export async function POST(request: Request) {
  let body: { zone: string; radiusKm: number; types?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { zone, radiusKm = 3 } = body;

  if (!zone?.trim()) {
    return NextResponse.json({ error: "El campo 'zone' es requerido" }, { status: 400 });
  }

  const radiusM = Math.min(Math.max(radiusKm, 1), 10) * 1000;

  // Step 1: Geocode via Nominatim
  let lat: number, lng: number;
  try {
    const geoUrl = `${NOMINATIM_URL}?q=${encodeURIComponent(zone + ", Argentina")}&format=json&limit=1&countrycodes=ar`;
    const geoRes = await fetch(geoUrl, {
      headers: { "User-Agent": "CRM-Polarizados/1.0 (crm@polarizados.com)" },
    });
    if (!geoRes.ok) throw new Error("Nominatim error");
    const geoData = await geoRes.json();
    if (!geoData.length) {
      return NextResponse.json(
        { error: `No se encontró la zona "${zone}" en Argentina. Intentá con un nombre de barrio o ciudad más preciso.` },
        { status: 404 }
      );
    }
    lat = parseFloat(geoData[0].lat);
    lng = parseFloat(geoData[0].lon);
  } catch (err) {
    console.error("Nominatim error:", err);
    return NextResponse.json(
      { error: "No se pudo geocodificar la dirección. Verificá la zona ingresada." },
      { status: 502 }
    );
  }

  // Step 2: Query Overpass
  let osmElements: OsmElement[] = [];
  try {
    const query = buildOverpassQuery(lat, lng, radiusM);
    const overpassRes = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!overpassRes.ok) throw new Error(`Overpass HTTP ${overpassRes.status}`);
    const overpassData = await overpassRes.json();
    osmElements = (overpassData.elements as OsmElement[]) ?? [];
  } catch (err) {
    console.error("Overpass error:", err);
    return NextResponse.json(
      { error: "Error al consultar la base de datos de negocios. Intentá de nuevo en unos segundos." },
      { status: 502 }
    );
  }

  // Step 3: Deduplicate by name and build list
  const seen = new Set<string>();
  const businesses = osmElements
    .filter((el) => el.tags?.name)
    .filter((el) => {
      const key = (el.tags!.name ?? "").toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 50)
    .map((el) => {
      const tags = el.tags!;
      const elLat = el.lat ?? el.center?.lat ?? lat;
      const elLng = el.lon ?? el.center?.lon ?? lng;
      return {
        name: tags.name ?? "",
        address: extractAddress(tags),
        phone: extractPhone(tags),
        website: extractWebsite(tags),
        lat: elLat,
        lng: elLng,
        type: inferType(tags),
      };
    });

  // Step 4: Check which are already leads
  const phoneNumbers = businesses.map((b) => b.phone).filter(Boolean);
  const companyNames = businesses.map((b) => b.name);

  const orConditions: object[] = [];
  if (phoneNumbers.length > 0) orConditions.push({ phone: { in: phoneNumbers } });
  if (companyNames.length > 0) orConditions.push({ company: { in: companyNames } });

  const existingLeads = orConditions.length > 0
    ? await prisma.contact.findMany({
        where: { type: "LEAD", OR: orConditions },
        select: { id: true, phone: true, company: true },
      })
    : [];

  const leadPhones = new Set(existingLeads.map((l) => l.phone?.trim()).filter(Boolean));
  const leadCompanies = new Set(
    existingLeads.map((l) => l.company?.toLowerCase().trim()).filter(Boolean)
  );

  const enriched = businesses.map((b) => ({
    ...b,
    isInLeads: !!(
      (b.phone && leadPhones.has(b.phone.trim())) ||
      leadCompanies.has(b.name.toLowerCase().trim())
    ),
  }));

  return NextResponse.json({ businesses: enriched });
}
