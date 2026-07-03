import xlsx from "xlsx";

export type OfficialSearchPayload = {
  cityCode: string;
  district?: string;
  transactionType: string;
  period?: {
    startY?: string;
    startM?: string;
    endY?: string;
    endM?: string;
  };
};

const isValidCode = (value: string) => /^[a-z]$/i.test(value);

export async function searchOfficialTransactions(payload: OfficialSearchPayload) {
  const cityCode = String(payload.cityCode || "A");
  const transactionType = String(payload.transactionType || "A");
  if (!isValidCode(cityCode) || !isValidCode(transactionType)) {
    throw new Error("縣市或交易類型代碼格式不正確");
  }

  const fileName = `${cityCode.toLowerCase()}_lvr_land_${transactionType.toLowerCase()}.xls`;
  const url = `https://plvr.land.moi.gov.tw/Download?fileName=${fileName}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "RealEstateLiquidGlass/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`官方資料下載失敗 (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName =
    workbook.SheetNames.find((name) => name.includes("買賣") || name.includes("租賃")) ??
    workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

  let data = rows.slice(2).filter((row) => Array.isArray(row) && row.length > 1 && row[0]);

  if (payload.district && payload.district !== "全部") {
    data = data.filter((row) => String(row[0]) === payload.district);
  }

  if (payload.period) {
    const start = Number(payload.period.startY || 0) * 12 + Number(payload.period.startM || 1);
    const end = Number(payload.period.endY || 999) * 12 + Number(payload.period.endM || 12);
    data = data.filter((row) => {
      const rawDate = String(row[7] ?? "");
      if (rawDate.length < 6) return true;
      const year = Number(rawDate.slice(0, -4));
      const month = Number(rawDate.slice(-4, -2));
      const value = year * 12 + month;
      return value >= start && value <= end;
    });
  }

  return {
    success: true,
    source: url,
    data,
  };
}
