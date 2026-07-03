import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { searchOfficialTransactions } from "./server/search";
import { forwardIntake, validateAuditPayload, validateFeedbackPayload } from "./server/intake";

const readJsonBody = (request: any) =>
  new Promise<Record<string, unknown>>((resolve, reject) => {
    let body = "";
    request.on("data", (chunk: { toString: () => string }) => {
      body += chunk.toString();
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(error);
      }
    });
  });

const writeJson = (response: any, statusCode: number, payload: unknown) => {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.statusCode = statusCode;
  response.end(JSON.stringify(payload));
};

const officialDataDevApi = () => ({
  name: "official-data-dev-api",
  configureServer(server: { middlewares: { use: Function } }) {
    server.middlewares.use("/api/proxy-search", async (request: any, response: any) => {
      if (request.method !== "POST") {
        writeJson(response, 405, { success: false, error: "Method not allowed" });
        return;
      }

      try {
        const result = await searchOfficialTransactions(await readJsonBody(request));
        writeJson(response, 200, result);
      } catch (error) {
        writeJson(response, 500, {
          success: false,
          error: error instanceof Error ? error.message : "無法取得官方資料",
        });
      }
    });
    server.middlewares.use("/api/feedback", async (request: any, response: any) => {
      if (request.method !== "POST") return writeJson(response, 405, { success: false, error: "Method not allowed" });
      try {
        const validated = validateFeedbackPayload(await readJsonBody(request));
        if (!validated.ok) return writeJson(response, 400, { success: false, error: validated.error });
        const result = await forwardIntake("feedback", validated.data);
        return writeJson(response, result.status, result);
      } catch (error) {
        return writeJson(response, 500, { success: false, error: error instanceof Error ? error.message : "送出失敗" });
      }
    });
    server.middlewares.use("/api/audit-log", async (request: any, response: any) => {
      if (request.method !== "POST") return writeJson(response, 405, { success: false, error: "Method not allowed" });
      try {
        const validated = validateAuditPayload(await readJsonBody(request));
        if (!validated.ok) return writeJson(response, 400, { success: false, error: validated.error });
        const result = await forwardIntake("audit", validated.data);
        return writeJson(response, result.status, result);
      } catch (error) {
        return writeJson(response, 500, { success: false, error: error instanceof Error ? error.message : "送出失敗" });
      }
    });
  },
});

export default defineConfig({
  plugins: [react(), officialDataDevApi()],
  server: {
    host: "0.0.0.0",
    port: 4174,
  },
});
