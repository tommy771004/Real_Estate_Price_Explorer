/**
 * 可設定的 API base URL。
 * - Web 開發 / Vercel 部署：相對路徑 `/api/...` 會自動命中同站端點。
 * - 原生 App (Capacitor)，要打遠端後端時：透過本模組的 setApiBaseUrl() 切換。
 *   預設讀取 localStorage 的 `app:apiBaseUrl`，冦回空字串視為同源相對路徑。
 */

const STORAGE_KEY = "app:apiBaseUrl";
const ENV_URL = (import.meta.env.VITE_APP_API_BASE_URL as string | undefined) ?? "";

let runtimeBaseUrl: string | null = null;

const normalize = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.endsWith("/")) return trimmed.slice(0, -1);
  return trimmed;
};

const readPersisted = (): string => {
  if (typeof window === "undefined") return normalize(ENV_URL);
  if (runtimeBaseUrl !== null) return runtimeBaseUrl;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return normalize(stored || ENV_URL);
  } catch {
    return normalize(ENV_URL);
  }
};

export const getApiBaseUrl = (): string => readPersisted();

export const setApiBaseUrl = (url: string): void => {
  const normalized = normalize(url);
  runtimeBaseUrl = normalized;
  try {
    if (normalized) {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore persistence failure
  }
};

export const buildApiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  const safePath = path.startsWith("/") ? path : `/${path}`;
  if (!base) return safePath;
  return `${base}${safePath}`;
};
