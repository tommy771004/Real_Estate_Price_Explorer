let pool: { query: (text: string, params?: unknown[]) => Promise<{ rows: Array<{ id?: number }> }> } | null = null;

export class DatabaseUnavailableError extends Error {
  constructor(message = "DATABASE_URL 尚未設定") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

export const getDbPool = async () => {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new DatabaseUnavailableError();
  if (!pool) {
    const { Pool, neonConfig } = await import("@neondatabase/serverless");
    const wsModule = await import("ws");
    neonConfig.webSocketConstructor = (wsModule.default ?? wsModule) as unknown as typeof WebSocket;
    pool = new Pool({ connectionString });
  }
  return pool;
};

export const queryDatabase = async (text: string, params?: unknown[]) => {
  const database = await getDbPool();
  return database.query(text, params);
};
