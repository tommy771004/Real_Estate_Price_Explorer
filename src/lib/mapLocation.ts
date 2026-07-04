import { CITIES, CITY_DISTRICTS, type District } from "../data/locations";

type CoordinateRecord = {
  district?: string;
  lat?: number | string;
  lng?: number | string;
};

type ReverseAddress = Record<string, unknown>;

export const toMapCoordinate = (value: number | string | undefined) => {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed !== 0
    ? parsed
    : null;
};

export const cleanTransactionAddress = (address: string) =>
  address.trim().replace(/(\d+)\s*[~～-]\s*\d+[號號]?/g, "$1號");

export const isTaiwanCoordinate = (lat: number, lng: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= 21.7 &&
  lat <= 26.5 &&
  lng >= 118 &&
  lng <= 122.2;

export const isPlausibleCoordinateForCity = (lat: number, lng: number, cityName: string) => {
  if (!isTaiwanCoordinate(lat, lng)) return false;
  const city = CITIES.find((item) => item.name === cityName);
  if (!city) return true;

  // The largest counties span well under two degrees. This rejects a valid
  // Taiwan result that belongs to a different selected city.
  return Math.hypot(lat - city.lat, lng - city.lng) <= 1.8;
};

export const buildDistrictMapCoordinates = (
  districts: Array<Pick<District, "name" | "lat" | "lng">>,
  records: CoordinateRecord[],
) => {
  const sums = new Map<string, { lat: number; lng: number; count: number }>();

  for (const record of records) {
    if (!record.district) continue;
    const lat = toMapCoordinate(record.lat);
    const lng = toMapCoordinate(record.lng);
    if (lat === null || lng === null || !isTaiwanCoordinate(lat, lng)) continue;
    const current = sums.get(record.district) ?? { lat: 0, lng: 0, count: 0 };
    current.lat += lat;
    current.lng += lng;
    current.count += 1;
    sums.set(record.district, current);
  }

  const result: Record<string, {
    lat: number;
    lng: number;
    source: "district" | "records";
  }> = {};

  for (const district of districts) {
    const lat = toMapCoordinate(district.lat);
    const lng = toMapCoordinate(district.lng);
    if (lat !== null && lng !== null && isTaiwanCoordinate(lat, lng)) {
      result[district.name] = { lat, lng, source: "district" };
      continue;
    }

    const sum = sums.get(district.name);
    if (!sum?.count) continue;
    result[district.name] = {
      lat: Number((sum.lat / sum.count).toFixed(6)),
      lng: Number((sum.lng / sum.count).toFixed(6)),
      source: "records",
    };
  }

  return result;
};

const normalizeTaiwanName = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replaceAll("台北", "臺北")
    .replaceAll("台中", "臺中")
    .replaceAll("台南", "臺南")
    .replaceAll("台東", "臺東");

export const matchTaiwanLocation = (address: ReverseAddress) => {
  const countyCandidates = [
    address.city,
    address.county,
    address.state,
    address.town,
    address.municipality,
  ].map(normalizeTaiwanName).filter(Boolean);
  const city = CITIES.find((candidate) =>
    countyCandidates.some((name) => name.includes(candidate.name) || candidate.name.includes(name)),
  );
  if (!city) return null;

  const districtCandidates = [
    address.city_district,
    address.suburb,
    address.town,
    address.district,
    address.village,
  ].map(normalizeTaiwanName).filter(Boolean);
  const district = (CITY_DISTRICTS[city.name] ?? []).find((candidate) =>
    districtCandidates.some((name) => name.includes(candidate.name) || candidate.name.includes(name)),
  );

  return { county: city.name, district: district?.name ?? "全部" };
};
