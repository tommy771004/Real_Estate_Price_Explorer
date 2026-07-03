import { CITIES } from "./locations";
import type { Transaction } from "../types/real-estate";

export const ASSET_MODES = ["building", "land", "presale", "rental"] as const;
export type AssetMode = (typeof ASSET_MODES)[number];

export type AssetDefinition = {
  mode: AssetMode;
  label: string;
  queryLabel: string;
  transactionName: "買賣" | "預售屋" | "租賃";
  transactionCode: "A" | "B" | "C";
  guidance: string[];
  accent: string;
};

export type SearchPayload = {
  cityCode: string;
  district: string;
  propertyTypes: string[];
  transactionType: "A" | "B" | "C";
  period: {
    startY: string;
    startM: string;
    endY: string;
    endM: string;
  };
  unitPrice: RangeFilter & { unit: "1" | "2" };
  area: RangeFilter & { unit: "1" | "2" };
  age: RangeFilter;
  keyword: string;
};

export type TransactionSummary = {
  count: number;
  metrics: Array<{ label: string; value: string; note: string }>;
};

export type RangeFilter = {
  min: string;
  max: string;
};

export type PeriodFilter = {
  startY: string;
  startM: string;
  endY: string;
  endM: string;
};

export type ClientFilters = {
  keyword: string;
  propertyTypes: string[];
  period: PeriodFilter;
  unitPrice: RangeFilter & { unit: "1" | "2" };
  area: RangeFilter & { unit: "1" | "2" };
  age: RangeFilter;
};

export const DEFAULT_FILTERS: ClientFilters = {
  keyword: "",
  propertyTypes: [],
  period: {
    startY: String(new Date().getFullYear() - 1911 - 2),
    startM: "1",
    endY: String(new Date().getFullYear() - 1911),
    endM: "12",
  },
  unitPrice: { min: "", max: "", unit: "1" },
  area: { min: "", max: "", unit: "2" },
  age: { min: "", max: "" },
};


const toNumber = (value: string | number | undefined) => {
  const parsed = Number(String(value ?? "").replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const median = (values: number[]) => {
  const valid = values.filter((value) => value > 0).sort((a, b) => a - b);
  if (valid.length === 0) return 0;
  const middle = Math.floor(valid.length / 2);
  return valid.length % 2 === 0
    ? (valid[middle - 1] + valid[middle]) / 2
    : valid[middle];
};

const formatWan = (value: number, digits = 0) =>
  `${(value / 10_000).toLocaleString("zh-TW", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} 萬`;

const formatPing = (squareMeters: number) =>
  `${(squareMeters * 0.3025).toLocaleString("zh-TW", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} 坪`;

const periodValue = (year: string, month: string) =>
  (Number.parseInt(year || "0", 10) * 12) + Number.parseInt(month || "0", 10);

const transactionPeriodValue = (date: string) => {
  const raw = String(date || "");
  if (raw.length < 5) return 0;
  const year = raw.length >= 7 ? raw.slice(0, raw.length - 4) : raw.slice(0, 3);
  const month = raw.length >= 7 ? raw.slice(raw.length - 4, raw.length - 2) : raw.slice(3, 5);
  return periodValue(year, month);
};

const completionAge = (completionDate: string) => {
  const year = Number.parseInt(String(completionDate || "").slice(0, 3), 10);
  if (!Number.isFinite(year) || year <= 0) return null;
  return Math.max(0, new Date().getFullYear() - 1911 - year);
};

const inRange = (value: number, minRaw: string, maxRaw: string) => {
  if (!Number.isFinite(value)) return false;
  const min = Number.parseFloat(minRaw);
  const max = Number.parseFloat(maxRaw);
  if (Number.isFinite(min) && value < min) return false;
  if (Number.isFinite(max) && value > max) return false;
  return true;
};

export const mapOfficialRows = (
  rows: unknown[][],
  transactionName: "買賣" | "預售屋" | "租賃",
  cityName: string = ""
): Transaction[] => {
  const isRent = transactionName === "租賃";
  const isPresale = transactionName === "預售屋";

  return rows
    .filter((row) => Array.isArray(row) && row.length > 1)
    .map((row, index) => {
      const dist = String(row[0] ?? "");
      let rawAddress = String(row[2] ?? "");
      
      if (rawAddress && !rawAddress.startsWith(cityName)) {
        rawAddress = `${cityName}${dist}${rawAddress}`;
      }

      return {
        district: dist,
        transactionType: String(row[1] ?? ""),
        address: rawAddress,
      area: String(row[3] ?? ""),
      zoning: String(row[4] ?? row[5] ?? ""),
      date: String(row[7] ?? ""),
      content: String(row[8] ?? ""),
      floor: String(row[9] ?? ""),
      totalFloor: String(row[10] ?? ""),
      buildingType: String(row[11] ?? ""),
      mainUse: String(row[12] ?? ""),
      material: String(row[13] ?? ""),
      completionDate: String(row[14] ?? ""),
      buildingArea: String(row[15] ?? ""),
      rooms: String(row[16] ?? ""),
      halls: String(row[17] ?? ""),
      bathrooms: String(row[18] ?? ""),
      hasPartition: String(row[19] ?? ""),
      hasManagement: String(row[20] ?? ""),
      totalPrice: String(row[isRent ? 22 : 21] ?? ""),
      unitPrice: String(row[isRent ? 23 : 22] ?? ""),
      parkingType: String(row[isRent ? 24 : 23] ?? ""),
      parkingArea: String(row[isRent ? 25 : 24] ?? ""),
      parkingPrice: String(row[isRent ? 26 : 25] ?? ""),
      remarks: String(row[isRent ? 27 : 26] ?? ""),
      id: String(row[isRent ? 28 : 27] ?? `official-${index}`),
      buildCase: isPresale ? String(row[28] ?? "") : undefined,
    };
  });
};

export const filterTransactionsByAssetMode = (
  records: Transaction[],
  mode: AssetMode,
) => {
  if (mode === "land") {
    return records.filter((record) => record.transactionType === "土地");
  }

  if (mode === "building") {
    return records.filter((record) =>
      record.transactionType === "房地(土地+建物)" ||
      record.transactionType === "房地" ||
      record.transactionType === "房地(土地+建物)+車位" ||
      record.transactionType === "建物",
    );
  }

  return records;
};

export const defaultPropertyTypesForMode = (mode: AssetMode) => {
  if (mode === "land") return ["土地"];
  if (mode === "building") return ["房地", "房地(車)", "建物"];
  return [];
};

const matchesPropertyType = (record: Transaction, propertyType: string) => {
  if (propertyType === "房地") {
    return record.transactionType === "房地(土地+建物)" || record.transactionType === "房地";
  }
  if (propertyType === "房地(車)") {
    return record.transactionType === "房地(土地+建物)+車位" || record.transactionType.includes("車位");
  }
  return record.transactionType === propertyType;
};

export const applyClientFilters = (
  records: Transaction[],
  mode: AssetMode,
  filters: ClientFilters,
) => {
  const assetRecords = filterTransactionsByAssetMode(records, mode);
  const propertyTypes = filters.propertyTypes.length > 0
    ? filters.propertyTypes
    : defaultPropertyTypesForMode(mode);
  const start = periodValue(filters.period.startY, filters.period.startM);
  const end = periodValue(filters.period.endY, filters.period.endM);
  const keyword = filters.keyword.trim();

  return assetRecords.filter((record) => {
    if (keyword) {
      const searchText = [
        record.address,
        record.district,
        record.buildingType,
        record.buildCase,
        record.remarks,
      ].join(" ");
      if (!searchText.includes(keyword)) return false;
    }

    if (propertyTypes.length > 0 && !propertyTypes.some((type) => matchesPropertyType(record, type))) {
      return false;
    }

    const recordPeriod = transactionPeriodValue(record.date);
    if (recordPeriod > 0 && (recordPeriod < start || recordPeriod > end)) return false;

    if (filters.unitPrice.min || filters.unitPrice.max) {
      const rawUnitPrice = toNumber(record.unitPrice);
      const comparable = filters.unitPrice.unit === "1"
        ? (rawUnitPrice * 3.30578) / 10_000
        : rawUnitPrice;
      if (!inRange(comparable, filters.unitPrice.min, filters.unitPrice.max)) return false;
    }

    if (filters.area.min || filters.area.max) {
      const squareMeters = toNumber(mode === "land" ? record.area : record.buildingArea || record.area);
      const comparable = filters.area.unit === "2" ? squareMeters * 0.3025 : squareMeters;
      if (!inRange(comparable, filters.area.min, filters.area.max)) return false;
    }

    if (filters.age.min || filters.age.max) {
      const age = completionAge(record.completionDate);
      if (age === null || !inRange(age, filters.age.min, filters.age.max)) return false;
    }

    return true;
  });
};

export const buildSearchPayload = (
  cityName: string,
  district: string,
  mode: AssetMode,
  filters: ClientFilters = DEFAULT_FILTERS,
): SearchPayload => {
  const getTransactionCode = (m: AssetMode): "A" | "B" | "C" => {
    switch (m) {
      case "building": return "A";
      case "land": return "A";
      case "presale": return "B";
      case "rental": return "C";
    }
  };
  const currentRocYear = new Date().getFullYear() - 1911;
  const propertyTypes = filters.propertyTypes.length > 0
    ? filters.propertyTypes
    : defaultPropertyTypesForMode(mode);

  return {
    cityCode: CITIES.find((city) => city.name === cityName)?.code ?? "A",
    district,
    propertyTypes,
    transactionType: getTransactionCode(mode),
    period: {
      startY: filters.period.startY || String(currentRocYear - 2),
      startM: filters.period.startM || "1",
      endY: filters.period.endY || String(currentRocYear),
      endM: filters.period.endM || "12",
    },
    unitPrice: filters.unitPrice,
    area: filters.area,
    age: filters.age,
    keyword: filters.keyword.trim(),
  };
};

export const summarizeTransactions = (
  records: Transaction[],
  mode: AssetMode,
): TransactionSummary => {
  const unitPricePerPing = median(
    records.map((record) => toNumber(record.unitPrice) * 3.30578),
  );
  const totalPrice = median(records.map((record) => toNumber(record.totalPrice)));
  const area = median(
    records.map((record) =>
      toNumber(mode === "land" ? record.area : record.buildingArea),
    ),
  );

  if (mode === "rental") {
    return {
      count: records.length,
      metrics: [
        { label: "月租中位數", value: `${totalPrice.toLocaleString("zh-TW")} 元`, note: "每月" },
        { label: "每坪租金", value: `${Math.round(unitPricePerPing).toLocaleString("zh-TW")} 元`, note: "每坪/月" },
        { label: "中位面積", value: formatPing(area), note: "有效樣本" },
      ],
    };
  }

  if (mode === "land") {
    const zoningCount = new Map<string, number>();
    for (const record of records) {
      const zoning = record.zoning || "未標示";
      zoningCount.set(zoning, (zoningCount.get(zoning) ?? 0) + 1);
    }
    const primaryZoning = [...zoningCount.entries()]
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "無資料";

    return {
      count: records.length,
      metrics: [
        { label: "土地單價中位數", value: formatWan(unitPricePerPing, 1), note: "每坪" },
        { label: "成交面積中位數", value: formatPing(area), note: "土地移轉面積" },
        { label: "主要使用分區", value: primaryZoning.replace(/^都市：/, ""), note: "有效樣本" },
      ],
    };
  }

  return {
    count: records.length,
    metrics: [
      { label: "單價中位數", value: formatWan(unitPricePerPing, 1), note: "每坪" },
      { label: mode === "presale" ? "簽約總價中位數" : "成交總價中位數", value: formatWan(totalPrice), note: "有效樣本" },
      { label: "建物面積中位數", value: formatPing(area), note: "主建物與附屬面積口徑依原始資料" },
    ],
  };
};

export const formatTransactionPrice = (value: string, mode: AssetMode) => {
  const numeric = toNumber(value);
  if (numeric <= 0) return "未揭露";
  return mode === "rental"
    ? `${numeric.toLocaleString("zh-TW")} 元/月`
    : formatWan(numeric);
};

export const formatUnitPrice = (value: string, mode: AssetMode) => {
  const perPing = toNumber(value) * 3.30578;
  if (perPing <= 0) return "未揭露";
  return mode === "rental"
    ? `${Math.round(perPing).toLocaleString("zh-TW")} 元/坪`
    : `${(perPing / 10_000).toLocaleString("zh-TW", { maximumFractionDigits: 1 })} 萬/坪`;
};
