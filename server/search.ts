import xlsx from "xlsx";

type SearchRequest = {
  cityCode?: string;
  district?: string;
  transactionType?: "A" | "B" | "C" | string;
  period?: {
    startY?: string;
    startM?: string;
    endY?: string;
    endM?: string;
  };
  keyword?: string;
};

const downloadWorkbook = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下載失敗，狀態碼: ${response.status}`);
  }
  const data = await response.arrayBuffer();
  return xlsx.read(data, { type: "array" });
};

const parsePeriod = (value: string) => {
  if (value.length < 5) return null;
  const year = Number.parseInt(value.slice(0, value.length - 4), 10);
  const month = Number.parseInt(value.slice(value.length - 4, value.length - 2), 10);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return year * 12 + month;
};

export async function searchOfficialTransactions(request: SearchRequest) {
  const cityCode = String(request.cityCode || "A").toLowerCase();
  const transactionType = String(request.transactionType || "A").toLowerCase();
  const fileName = `${cityCode}_lvr_land_${transactionType}.xls`;
  const source = `https://plvr.land.moi.gov.tw/Download?fileName=${fileName}`;

  const workbook = await downloadWorkbook(source);
  const sheetName = workbook.SheetNames.find((name) => name.includes("買賣") || name.includes("租賃"))
    ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  let data = rows.slice(2).filter((row) => Array.isArray(row) && row.length > 1 && row[0]);

  if (request.district && request.district !== "全部") {
    data = data.filter((row) => String(row[0] ?? "") === request.district);
  }

  const keyword = String(request.keyword || "").trim();
  if (keyword) {
    data = data.filter((row) => {
      const address = String(row[2] ?? "");
      const remarks = String(row[26] ?? "");
      const buildCase = String(row[28] ?? "");
      return address.includes(keyword) || remarks.includes(keyword) || buildCase.includes(keyword);
    });
  }

  if (request.period) {
    const start = (Number.parseInt(request.period.startY || "0", 10) * 12)
      + Number.parseInt(request.period.startM || "1", 10);
    const end = (Number.parseInt(request.period.endY || "999", 10) * 12)
      + Number.parseInt(request.period.endM || "12", 10);

    data = data.filter((row) => {
      const value = parsePeriod(String(row[7] ?? ""));
      return value === null || (value >= start && value <= end);
    });
  }

  return { success: true, source, data };
}
