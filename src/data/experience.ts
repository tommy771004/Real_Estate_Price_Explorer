import { CITIES, CITY_DISTRICTS } from "./locations";
import type { AssetMode } from "./transactions";
import type { Transaction } from "../types/real-estate";

export type SortKey = "date" | "totalPrice" | "unitPrice" | "buildingArea" | "area";
export type SortDirection = "asc" | "desc";
export type SortConfig = { key: SortKey; direction: SortDirection };

export type RecentSearch = {
  label: string;
  cityName: string;
  district: string;
  mode: AssetMode;
  keyword: string;
};

export const buildSearchLabel = (
  cityName: string,
  district: string,
  modeLabel: string,
  keyword: string,
) => `${cityName}${district === "全部" ? "" : district}${modeLabel}${keyword ? `：${keyword}` : ""}`;

const toNumber = (value: string | number | undefined) => {
  const parsed = Number(String(value ?? "").replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const upsertRecentSearch = (searches: RecentSearch[], next: RecentSearch) => {
  const withoutDuplicate = searches.filter((item) => item.label !== next.label);
  return [next, ...withoutDuplicate].slice(0, 6);
};

export const derivePopularDistricts = (records: Transaction[]) => {
  const counts = new Map<string, number>();
  for (const record of records) {
    if (!record.district) continue;
    counts.set(record.district, (counts.get(record.district) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([district, count]) => ({ query: district, count, type: "district" as const }));
};

export const buildSuggestions = (
  records: Transaction[],
  cityName: string,
  query: string,
) => {
  const normalized = query.trim();
  const candidates = new Set<string>();
  for (const district of CITY_DISTRICTS[cityName] ?? []) candidates.add(district.name);
  for (const city of CITIES) candidates.add(city.name);
  for (const record of records.slice(0, 120)) {
    if (record.address) candidates.add(record.address);
    if (record.buildCase) candidates.add(record.buildCase);
  }
  return [...candidates]
    .filter((item) => !normalized || item.includes(normalized))
    .slice(0, 8);
};

export const sortTransactions = (
  records: Transaction[],
  sortConfig: SortConfig | null,
) => {
  if (!sortConfig) return records;
  return [...records].sort((a, b) => {
    const aValue = ["totalPrice", "unitPrice", "buildingArea", "area"].includes(sortConfig.key)
      ? toNumber(a[sortConfig.key])
      : String(a[sortConfig.key] ?? "");
    const bValue = ["totalPrice", "unitPrice", "buildingArea", "area"].includes(sortConfig.key)
      ? toNumber(b[sortConfig.key])
      : String(b[sortConfig.key] ?? "");
    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });
};

export const paginateTransactions = (
  records: Transaction[],
  page: number,
  pageSize: number,
) => {
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    currentPage,
    totalPages,
    records: records.slice(start, start + pageSize),
  };
};

export const aggregatePresaleProjects = (records: Transaction[]) => {
  const groups = new Map<string, { count: number; total: number; unitTotal: number; unitCount: number }>();
  for (const record of records) {
    const name = record.buildCase || record.address || "未標示建案";
    const current = groups.get(name) ?? { count: 0, total: 0, unitTotal: 0, unitCount: 0 };
    current.count += 1;
    current.total += toNumber(record.totalPrice);
    const unitPrice = toNumber(record.unitPrice);
    if (unitPrice > 0) {
      current.unitTotal += unitPrice;
      current.unitCount += 1;
    }
    groups.set(name, current);
  }
  return [...groups.entries()]
    .map(([name, value]) => ({
      name,
      count: value.count,
      averageTotalPrice: Math.round(value.total / Math.max(value.count, 1)),
      averageUnitPrice: Math.round(value.unitTotal / Math.max(value.unitCount, 1)),
    }))
    .sort((a, b) => b.count - a.count);
};

export const buildCommunityTrend = (records: Transaction[], selectedRecord: Transaction | null) => {
  const communityKey = selectedRecord?.buildCase || selectedRecord?.address?.replace(/\d.*$/, "");
  const scoped = communityKey
    ? records.filter((record) => (record.buildCase || record.address).includes(communityKey))
    : records;
  const byMonth = new Map<string, { count: number; unitTotal: number }>();
  for (const record of scoped) {
    if (!record.date || !record.unitPrice) continue;
    const key = record.date.length >= 5 ? record.date.slice(0, record.date.length - 2) : record.date;
    const current = byMonth.get(key) ?? { count: 0, unitTotal: 0 };
    current.count += 1;
    current.unitTotal += toNumber(record.unitPrice) * 3.30578 / 10_000;
    byMonth.set(key, current);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([month, value]) => ({
      month,
      count: value.count,
      unitPrice: Number((value.unitTotal / Math.max(value.count, 1)).toFixed(1)),
    }));
};
