import { useCallback, useEffect, useState } from "react";

import {
  buildSearchPayload,
  type ClientFilters,
  mapOfficialRows,
  type AssetMode,
} from "../data/transactions";
import type { Transaction } from "../types/real-estate";

type SearchResponse = {
  success: boolean;
  source?: string;
  data?: unknown[][];
  error?: string;
};

export function useTransactions(
  cityName: string,
  district: string,
  mode: AssetMode,
  filters: ClientFilters,
) {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const refresh = useCallback(() => {
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const getTransactionName = (m: AssetMode): "買賣" | "預售屋" | "租賃" => {
      if (m === "presale") return "預售屋";
      if (m === "rental") return "租賃";
      return "買賣";
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/proxy-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify(buildSearchPayload(cityName, district, mode, filters)),
        });
        const result = await response.json() as SearchResponse;

        if (!response.ok || !result.success) {
          throw new Error(result.error || `官方資料服務錯誤 (${response.status})`);
        }

        const mapped = mapOfficialRows(result.data ?? [], getTransactionName(mode), cityName);
        setData(mapped);
        setSource(result.source ?? null);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setData([]);
        setSource(null);
        setError(loadError instanceof Error ? loadError.message : "無法取得官方資料");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [cityName, district, filters, mode, requestVersion]);

  return {
    data,
    setData,
    loading,
    error,
    source,
    refresh,
  };
}
