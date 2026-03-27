import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAPS_KEY = () => process.env.GOOGLE_MAPS_API_KEY ?? "";

interface PlaceResult {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  geometry: { location: { lat: number; lng: number } };
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  types?: string[];
}

interface PlaceDetails {
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
}

async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "formatted_phone_number,international_phone_number,website");
    url.searchParams.set("language", "es");
    url.searchParams.set("key", MAPS_KEY());
    const res = await fetch(url.toString());
    const data = await res.json();
    return (data.result ?? {}) as PlaceDetails;
  } catch {
    return {};
  }
}

// Geocode city+province to lat/lng
async function geocode(city: string, province: string): Promise<{ lat: number; lng: number } | null> {
  const query = `${city}, ${province}, Argentina`;
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("components", "country:AR");
  url.searchParams.set("language", "es");
  url.searchParams.set("key", MAPS_KEY());

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.status !== "OK" || !data.results?.length) return null;
  return data.results[0].geometry.location;
}

// One Nearby Search call
async function nearbySearch(
  lat: number,
  lng: number,
  radiusM: number,
  keyword: string,
  type?: string
): Promise<PlaceResult[]> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", String(radiusM));
  url.searchParams.set("language", "es");
  url.searchParams.set("key", MAPS_KEY());
  if (keyword) url.searchParams.set("keyword", keyword);
  if (type) url.searchParams.set("type", type);

  const res = await fetch(url.toString());
  const data = await res.json();
  return (data.results ?? []) as PlaceResult[];
}

function inferType(types: string[] = [], name: string): string {
  const n = name.toLowerCase();
  if (types.includes("car_dealer") || n.includes("concesion")) return "Concesionarias";
  if (types.includes("car_wash") || n.includes("detailing") || n.includes("autodetailing")) return "Talleres/Autodetailing";
  if (n.includes("vidrier") || n.includes("glass") || n.includes("vidrio")) return "Vidriería/Glass";
  if (n.includes("arquitectura") || n.includes("construccion")) return "Arquitectura";
  return "Talleres/Autodetailing";
}

export async function POST(request: Request) {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY no configurada. Agregala en las variables de entorno." },
      { status: 500 }
    );
  }

  let body: { city: string; province: string; radiusKm: number; types?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { city, province, radiusKm = 3 } = body;

  if (!city?.trim() || !province?.trim()) {
    return NextResponse.json({ error: "Los campos ciudad y provincia son requeridos" }, { status: 400 });
  }

  const radiusM = Math.min(Math.max(radiusKm, 1), 10) * 1000;

  // Step 1: Geocode
  let coords: { lat: number; lng: number } | null;
  try {
    coords = await geocode(city.trim(), province.trim());
  } catch (err) {
    console.error("Geocode error:", err);
    return NextResponse.json({ error: "Error al geolocalizar la ciudad." }, { status: 502 });
  }

  if (!coords) {
    return NextResponse.json(
      { error: `No se encontró "${city}, ${province}" en Argentina. Verificá el nombre.` },
      { status: 404 }
    );
  }

  const { lat, lng } = coords;

  // Step 2: Parallel searches for different keywords/types
  const searches = await Promise.allSettled([
    nearbySearch(lat, lng, radiusM, "polarizado"),
    nearbySearch(lat, lng, radiusM, "film automotriz"),
    nearbySearch(lat, lng, radiusM, "PPF proteccion pintura"),
    nearbySearch(lat, lng, radiusM, "tintado autos"),
    nearbySearch(lat, lng, radiusM, "autodetailing"),
    nearbySearch(lat, lng, radiusM, "vidrieria automotriz"),
    nearbySearch(lat, lng, radiusM, "", "car_repair"),
    nearbySearch(lat, lng, radiusM, "", "car_wash"),
    nearbySearch(lat, lng, radiusM, "", "car_dealer"),
  ]);

  // Deduplicate by place_id
  const seen = new Set<string>();
  const allPlaces: PlaceResult[] = [];

  for (const result of searches) {
    if (result.status === "fulfilled") {
      for (const place of result.value) {
        if (!seen.has(place.place_id)) {
          seen.add(place.place_id);
          allPlaces.push(place);
        }
      }
    }
  }

  // Fetch Place Details for each result in parallel to get phone + website
  const topPlaces = allPlaces.slice(0, 40);
  const details = await Promise.all(
    topPlaces.map((p) => getPlaceDetails(p.place_id))
  );

  const businesses = topPlaces.map((p, i) => ({
    name: p.name,
    address: p.vicinity || p.formatted_address || "",
    phone: details[i].formatted_phone_number || details[i].international_phone_number || "",
    website: details[i].website || "",
    lat: p.geometry.location.lat,
    lng: p.geometry.location.lng,
    type: inferType(p.types, p.name),
  }));

  // Step 3: Check against existing leads
  const companyNames = businesses.map((b) => b.name);
  const existingLeads =
    companyNames.length > 0
      ? await prisma.contact.findMany({
          where: { type: "LEAD", company: { in: companyNames } },
          select: { id: true, company: true },
        })
      : [];

  const leadCompanies = new Set(
    existingLeads.map((l) => l.company?.toLowerCase().trim()).filter(Boolean)
  );

  const enriched = businesses.map((b) => ({
    ...b,
    isInLeads: leadCompanies.has(b.name.toLowerCase().trim()),
  }));

  return NextResponse.json({ businesses: enriched, center: { lat, lng } });
}
