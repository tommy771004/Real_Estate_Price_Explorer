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
};

export type TransactionSummary = {
  count: number;
  metrics: Array<{ label: string; value: string; note: string }>;
};

export const ASSET_DEFINITIONS: Record<AssetMode, AssetDefinition> = {
  building: {
    mode: "building",
    label: "房地",
    queryLabel: "房地成交",
    transactionName: "買賣",
    transactionCode: "A",
    guidance: [
      "先確認交易是否包含車位與車位拆價。",
      "再對齊建物型態、屋齡、樓層與面積。",
      "最後查看特殊交易與備註。",
    ],
    accent: "#ef6c52",
  },
  land: {
    mode: "land",
    label: "土地",
    queryLabel: "土地成交",
    transactionName: "買賣",
    transactionCode: "A",
    guidance: [
      "先確認土地使用分區，不同分區不可直接混比。",
      "再對齊土地面積、形狀與臨路條件。",
      "最後查看持分、地上物與特殊交易備註。",
    ],
    accent: "#3e7662",
  },
  presale: {
    mode: "presale",
    label: "預售屋",
    queryLabel: "預售屋成交",
    transactionName: "預售屋",
    transactionCode: "B",
    guidance: [
      "以簽約月份比較，不以完工或揭露日期混用。",
      "確認車位價格、坪數與公設計算口徑。",
      "同建案不同棟別、樓層與付款條件要分開看。",
    ],
    accent: "#6f76c8",
  },
  rental: {
    mode: "rental",
    label: "租賃",
    queryLabel: "租賃成交",
    transactionName: "租賃",
    transactionCode: "C",
    guidance: [
      "確認租金是否包含管理費、車位與家具家電。",
      "整層、分租套房與獨立套房不可直接混比。",
      "租期、樓層與屋況都會影響實際租金。",
    ],
    accent: "#2f89a0",
  },
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

export const mapOfficialRows = (
  rows: unknown[][],
  transactionName: "買賣" | "預售屋" | "租賃",
): Transaction[] => {
  const isRent = transactionName === "租賃";
  const isPresale = transactionName === "預售屋";

  return rows
    .filter((row) => Array.isArray(row) && row.length > 1)
    .map((row, index) => ({
      district: String(row[0] ?? ""),
      transactionType: String(row[1] ?? ""),
      address: String(row[2] ?? ""),
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
    }));
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

export const buildSearchPayload = (
  cityName: string,
  district: string,
  mode: AssetMode,
): SearchPayload => {
  const definition = ASSET_DEFINITIONS[mode];
  const currentRocYear = new Date().getFullYear() - 1911;

  return {
    cityCode: CITIES.find((city) => city.name === cityName)?.code ?? "A",
    district,
    propertyTypes: mode === "land" ? ["土地"] : mode === "building" ? ["房地", "房地(車)", "建物"] : [],
    transactionType: definition.transactionCode,
    period: {
      startY: String(currentRocYear - 2),
      startM: "1",
      endY: String(currentRocYear),
      endM: "12",
    },
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
