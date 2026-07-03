import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { searchOfficialTransactions } from "./server/search";

const officialDataDevApi = () => ({
  name: "official-data-dev-api",
  configureServer(server: { middlewares: { use: Function } }) {
    server.middlewares.use("/api/proxy-search", (request: any, response: any) => {
      if (request.method !== "POST") {
        response.statusCode = 405;
        response.end(JSON.stringify({ success: false, error: "Method not allowed" }));
        return;
      }

      let body = "";
      request.on("data", (chunk: { toString: () => string }) => {
        body += chunk.toString();
      });
      request.on("end", async () => {
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        try {
          const result = await searchOfficialTransactions(JSON.parse(body || "{}"));
          response.statusCode = 200;
          response.end(JSON.stringify(result));
        } catch (error) {
          response.statusCode = 500;
          response.end(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "無法取得官方資料",
          }));
        }
      });
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
