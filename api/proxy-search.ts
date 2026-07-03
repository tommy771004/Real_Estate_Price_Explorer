import { searchOfficialTransactions } from "../server/search";

export default async function handler(request: any, response: any) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const result = await searchOfficialTransactions(request.body ?? {});
    return response.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "無法取得官方資料";
    return response.status(500).json({ success: false, error: message });
  }
}
