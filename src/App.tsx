import {
  BarChart3,
  ChevronUp,
  Info,
  LocateFixed,
  List,
  Map,
  MessageSquare,
  Moon,
  Save,
  Scale,
  SlidersHorizontal,
  Sun,
  Type,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";

import { FilterPanel } from "./components/FilterPanel";
import { MapCanvas } from "./components/MapCanvas";
import {
  ResultWorkspace,
  type WorkspaceView,
} from "./components/ResultWorkspace";
import { SiteChrome } from "./components/SiteChrome";
import { TrendComparisonChart } from "./components/TrendComparisonChart";
import { CITIES, CITY_DISTRICTS } from "./data/locations";
import {
  buildSearchLabel,
  buildSuggestions,
  derivePopularDistricts,
  upsertRecentSearch,
  type RecentSearch,
} from "./data/experience";
import {
  DEFAULT_FILTERS,
  applyClientFilters,
  defaultPropertyTypesForMode,
  summarizeTransactions,
  type AssetMode,
  type ClientFilters,
} from "./data/transactions";

const ASSET_DEFINITIONS: Record<AssetMode, {
  mode: AssetMode;
  label: string;
  queryLabel: string;
  transactionName: "買賣" | "預售屋" | "租賃";
  transactionCode: "A" | "B" | "C";
  guidance: string[];
  accent: string;
}> = {
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
import { useGeocoding } from "./hooks/useGeocoding";
import { useTransactions } from "./hooks/useTransactions";
import { isTaiwanCoordinate, matchTaiwanLocation } from "./lib/mapLocation";
import type { Transaction } from "./types/real-estate";

const ASSET_MODE_LABELS = ["房地", "土地", "預售屋", "租賃"] as const;

type SavedSearch = {
  id: string;
  name: string;
  cityName: string;
  district: string;
  assetMode: AssetMode;
  filters: ClientFilters;
  savedAt: number;
};

const readStoredJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
};

const storedFiltersKey = "explorer_lg_saved_searches";
const storedFavoritesKey = "explorer_lg_favorites";
const storedRecentSearchesKey = "explorer_lg_recent_searches";
const storedThemeKey = "explorer_lg_theme";
const storedFontSizeKey = "explorer_lg_font_size";
const storedCopyKey = "explorer_lg_copy";

export default function App() {
  const [assetMode, setAssetMode] = useState<AssetMode>("land");
  const [cityName, setCityName] = useState("臺北市");
  const [district, setDistrict] = useState("全部");
  const [view, setView] = useState<WorkspaceView>("list");
  const [filtersOpen, setFiltersOpen] = useState(() => window.innerWidth > 760);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [insightOpen, setInsightOpen] = useState(() => window.innerWidth > 760);
  const [reduceTransparency, setReduceTransparency] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState<ClientFilters>({
    ...DEFAULT_FILTERS,
    propertyTypes: defaultPropertyTypesForMode("land"),
  });
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() =>
    readStoredJson<SavedSearch[]>(storedFiltersKey, []),
  );
  const [favoriteRecords, setFavoriteRecords] = useState<Transaction[]>(() =>
    readStoredJson<Transaction[]>(storedFavoritesKey, []),
  );
  const [compareRecords, setCompareRecords] = useState<Transaction[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savedPanelOpen, setSavedPanelOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() =>
    readStoredJson<RecentSearch[]>(storedRecentSearchesKey, []),
  );
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState("功能建議");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackContact, setFeedbackContact] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [darkMode, setDarkMode] = useState(() => readStoredJson<"light" | "dark">(storedThemeKey, "light") === "dark");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">(() =>
    readStoredJson<"small" | "medium" | "large">(storedFontSizeKey, "medium"),
  );
  const [editableCopy, setEditableCopy] = useState(() =>
    readStoredJson(storedCopyKey, {
      title: "實價登錄查詢",
      empty: "目前條件沒有成交紀錄",
    }),
  );
  const [userLocation, setUserLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
    county: string | null;
    district: string | null;
    method: "gps" | "manual" | "unknown";
  }>({
    latitude: null,
    longitude: null,
    county: null,
    district: null,
    method: "unknown",
  });

  const definition = ASSET_DEFINITIONS[assetMode];
  const {
    data,
    setData,
    loading,
    error,
    source,
    refresh,
  } = useTransactions(cityName, district, assetMode, filters);

  const filteredData = useMemo(
    () => applyClientFilters(data, assetMode, filters),
    [assetMode, data, filters],
  );

  useEffect(() => {
    setSelectedRecord((current) =>
      filteredData.find((record) => record.id === current?.id) ?? filteredData[0] ?? null,
    );
  }, [filteredData]);

  useEffect(() => {
    setAdvancedOpen(false);
    setFilters((current) => ({
      ...current,
      propertyTypes: defaultPropertyTypesForMode(assetMode),
    }));
  }, [assetMode]);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(""), 2200);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  const summary = useMemo(
    () => summarizeTransactions(filteredData, assetMode),
    [assetMode, filteredData],
  );
  const popularDistricts = useMemo(() => derivePopularDistricts(filteredData), [filteredData]);
  const suggestions = useMemo(
    () => buildSuggestions(filteredData, cityName, filters.keyword),
    [cityName, filteredData, filters.keyword],
  );

  const {
    isGeocoding,
    geocodedCount,
    totalToGeocode,
  } = useGeocoding({
    cityName,
    filteredData,
    data,
    setData,
    selectedItem: selectedRecord,
    setSelectedItem: setSelectedRecord,
    search: filters.keyword,
    district,
  });

  const handleCityChange = (city: string) => {
    setCityName(city);
    setDistrict("全部");
  };

  const handleSearch = () => {
    const recent = {
      label: buildSearchLabel(cityName, district, definition.queryLabel, filters.keyword),
      cityName,
      district,
      mode: assetMode,
      keyword: filters.keyword,
    };
    setRecentSearches((current) => {
      const next = upsertRecentSearch(current, recent);
      window.localStorage.setItem(storedRecentSearchesKey, JSON.stringify(next));
      return next;
    });
    void sendAudit("search", { label: recent.label });
    refresh();
    setFiltersOpen(false);
  };

  const sendAudit = async (actionType: string, details?: unknown) => {
    try {
      await fetch("/api/audit-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: actionType,
          details,
          location: userLocation,
        }),
      });
    } catch {
      // Audit failure must not block user workflows.
    }
  };

  const updateFilters = (next: Partial<ClientFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
  };

  const resetFilters = () => {
    setFilters({
      ...DEFAULT_FILTERS,
      propertyTypes: defaultPropertyTypesForMode(assetMode),
    });
  };

  const saveCurrentSearch = () => {
    const name = `${cityName}${district === "全部" ? "" : district}${definition.queryLabel}`;
    const savedSearch: SavedSearch = {
      id: `${Date.now()}-${assetMode}-${cityName}-${district}`,
      name,
      cityName,
      district,
      assetMode,
      filters,
      savedAt: Date.now(),
    };

    setSavedSearches((current) => {
      const next = [savedSearch, ...current.filter((item) => item.name !== name)].slice(0, 12);
      window.localStorage.setItem(storedFiltersKey, JSON.stringify(next));
      return next;
    });
    setStatusMessage("已儲存目前查詢條件");
    setSavedPanelOpen(true);
  };

  const applySavedSearch = (savedSearch: SavedSearch) => {
    setAssetMode(savedSearch.assetMode);
    setCityName(savedSearch.cityName);
    setDistrict(savedSearch.district);
    setFilters(savedSearch.filters);
    setSavedPanelOpen(false);
    refresh();
  };

  const applyRecentSearch = (search: RecentSearch) => {
    setAssetMode(search.mode);
    setCityName(search.cityName);
    setDistrict(search.district);
    setFilters((current) => ({ ...current, keyword: search.keyword }));
    refresh();
  };

  const toggleFavoriteRecord = (record: Transaction | null) => {
    if (!record) return;
    setFavoriteRecords((current) => {
      const exists = current.some((item) => item.id === record.id);
      const next = exists
        ? current.filter((item) => item.id !== record.id)
        : [record, ...current].slice(0, 24);
      window.localStorage.setItem(storedFavoritesKey, JSON.stringify(next));
      return next;
    });
    setStatusMessage("已更新收藏成交紀錄");
  };

  const addToCompare = (record: Transaction | null) => {
    if (!record) {
      setView("compare");
      setStatusMessage("目前沒有可比較的成交紀錄");
      return;
    }
    setCompareRecords((current) =>
      [record, ...current.filter((item) => item.id !== record.id)].slice(0, 3),
    );
    setView("compare");
    setStatusMessage("已加入比較");
  };

  const closestLocation = (latitude: number, longitude: number) => {
    const city = CITIES.reduce((best, next) => {
      const distance = Math.hypot(latitude - (next.lat ?? latitude), longitude - (next.lng ?? longitude));
      return distance < best.distance ? { name: next.name, distance } : best;
    }, { name: cityName, distance: Number.POSITIVE_INFINITY });
    const districtsWithCoords = (CITY_DISTRICTS[city.name] ?? []).filter(
      (d) => d.lat !== undefined && d.lng !== undefined
    );
    if (districtsWithCoords.length === 0) {
      return { county: city.name, district: "全部" };
    }
    const districtMatch = districtsWithCoords.reduce((best, next) => {
      const distance = Math.hypot(latitude - (next.lat as number), longitude - (next.lng as number));
      return distance < best.distance ? { name: next.name, distance } : best;
    }, { name: "全部", distance: Number.POSITIVE_INFINITY });
    return { county: city.name, district: districtMatch.name };
  };

  const resolveCountyDistrict = async (latitude: number, longitude: number) => {
    if (!isTaiwanCoordinate(latitude, longitude)) {
      return { county: cityName, district: "全部" };
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=zh-TW`,
        {
          headers: { "User-Agent": "TaiwanRealEstate/1.0" },
        }
      );
      if (response.ok) {
        const result = await response.json();
        if (result && result.address) {
          const matched = matchTaiwanLocation(result.address);
          if (matched) return matched;
        }
      }
    } catch (e) {
      console.warn("Reverse geocoding failed, falling back to mathematical closest location:", e);
    }
    return closestLocation(latitude, longitude);
  };

  const requestUserLocation = async () => {
    const fallbackToIP = async () => {
      try {
        const res = await fetch("https://get.geojs.io/v1/ip/geo.json");
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
          const lat = parseFloat(data.latitude);
          const lng = parseFloat(data.longitude);
          const resolved = await resolveCountyDistrict(lat, lng);
          const nextLocation = {
            latitude: lat,
            longitude: lng,
            county: resolved.county,
            district: resolved.district,
            method: "manual" as const,
          };
          setUserLocation(nextLocation);
          setCityName(resolved.county);
          setDistrict(resolved.district);
          setStatusMessage(`已依基地台切換到 ${resolved.county}${resolved.district}`);
          void sendAudit("location_permission_ip_fallback", nextLocation);
        } else {
          setStatusMessage("無法取得基地台位置");
        }
      } catch (e) {
        setStatusMessage("無法取得基地台位置");
      }
    };

    if (!navigator.geolocation) {
      setStatusMessage("此瀏覽器不支援定位權限，嘗試基地台定位...");
      void fallbackToIP();
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const resolved = await resolveCountyDistrict(position.coords.latitude, position.coords.longitude);
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          county: resolved.county,
          district: resolved.district,
          method: "gps" as const,
        };
        setUserLocation(nextLocation);
        setCityName(resolved.county);
        setDistrict(resolved.district);
        setStatusMessage(`已切換到 ${resolved.county}${resolved.district}`);
        void sendAudit("location_permission_accept", nextLocation);
      },
      () => {
        setStatusMessage("未取得定位權限，嘗試基地台定位...");
        void sendAudit("location_permission_deny");
        void fallbackToIP();
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 },
    );
  };

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!feedbackContent.trim()) return;
    setFeedbackStatus("submitting");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: feedbackCategory,
          content: feedbackContent,
          contact: feedbackContact,
          location: userLocation,
        }),
      });
      if (!response.ok) throw new Error("feedback failed");
      setFeedbackStatus("success");
      setFeedbackContent("");
      void sendAudit("feedback_submit_success", feedbackCategory);
    } catch {
      setFeedbackStatus("error");
    }
  };

  const updateDarkMode = () => {
    setDarkMode((current) => {
      const next = !current;
      window.localStorage.setItem(storedThemeKey, next ? "dark" : "light");
      return next;
    });
  };

  const updateFontSize = (next: "small" | "medium" | "large") => {
    setFontSize(next);
    window.localStorage.setItem(storedFontSizeKey, JSON.stringify(next));
  };

  const updateEditableCopy = (next: typeof editableCopy) => {
    setEditableCopy(next);
    window.localStorage.setItem(storedCopyKey, JSON.stringify(next));
  };

  return (
    <div
      className={`app-shell ${reduceTransparency ? "reduce-transparency" : ""} ${darkMode ? "dark-mode" : ""} font-${fontSize}`}
      style={{ "--asset-accent": definition.accent } as CSSProperties}
    >
      <div className="map-atmosphere" aria-hidden="true" />
      <SiteChrome
        reduceTransparency={reduceTransparency}
        onTransparencyToggle={() => setReduceTransparency((value) => !value)}
        onFiltersOpen={() => setFiltersOpen(true)}
        onSettingsOpen={() => setSettingsOpen(true)}
        onFavoritesOpen={() => setSavedPanelOpen(true)}
        favoriteCount={favoriteRecords.length + savedSearches.length}
        activeMode={assetMode}
        onModeChange={setAssetMode}
        filtersOpen={filtersOpen}
      />

      <FilterPanel
        definition={definition}
        cityName={cityName}
        district={district}
        resultCount={summary.count}
        loading={loading}
        isOpen={filtersOpen}
        aria-expanded={filtersOpen}
        advancedOpen={advancedOpen}
        filters={filters}
        onCityChange={handleCityChange}
        onDistrictChange={setDistrict}
        onFiltersChange={updateFilters}
        onFiltersReset={resetFilters}
        onAdvancedToggle={() => setAdvancedOpen((value) => !value)}
        onClose={() => setFiltersOpen(false)}
        onSearch={handleSearch}
      />

      <main className="workspace">
        <section 
          className={`summary-strip glass-surface ${isSummaryExpanded ? "is-expanded" : "is-collapsed"}`} 
          key={`${assetMode}-${loading}`}
        >
          {/* Mobile touch indicator (handle) */}
          <button 
            className="summary-strip-handle" 
            type="button" 
            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
            aria-label={isSummaryExpanded ? "收合概況與熱門查詢" : "展開所有統計與熱門查詢"}
          >
            <span className="handle-bar"></span>
          </button>

          {/* Mobile Collapsed State: keeps only key overview data */}
          <div className="summary-mobile-collapsed" onClick={() => setIsSummaryExpanded(true)}>
            <div className="collapsed-left">
              <span className="collapsed-city">{cityName}{district === "全部" ? "整個縣市" : district}</span>
              <span className="collapsed-label">{summary.metrics[0]?.label}</span>
            </div>
            <div className="collapsed-right">
              <strong className="collapsed-value">{loading ? "讀取中" : summary.metrics[0]?.value}</strong>
              {summary.metrics[0]?.note && <small className="collapsed-note">{summary.metrics[0]?.note}</small>}
            </div>
          </div>

          <div className="summary-heading">
            <span className="ui-label">{cityName}{district === "全部" ? "" : district}</span>
            <strong>{definition.queryLabel}概況</strong>
          </div>

          <div className="summary-metrics-list">
            {summary.metrics.map((metric) => (
              <div className="summary-metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{loading ? "讀取中" : metric.value}</strong>
                <small>{metric.note}</small>
              </div>
            ))}
          </div>

          <TrendComparisonChart 
            data={data}
            district={district}
            cityName={cityName}
            assetMode={assetMode}
          />

          {/* Mobile Hot Queries (Popular Districts) Horizontal Chip List */}
          <div className="summary-hot-chips">
            <div className="hot-chips-title">熱門查詢</div>
            <div className="hot-chips-scroll">
              {popularDistricts.length === 0 ? (
                <span className="hot-chips-empty">依目前官方資料產生</span>
              ) : (
                popularDistricts.map((item) => (
                  <button 
                    key={item.query} 
                    type="button" 
                    className="hot-chip-btn pressable"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDistrict(item.query);
                      // Optionally collapse upon selecting a popular query to improve flow
                      setIsSummaryExpanded(false);
                    }}
                  >
                    <span className="chip-text">{item.query}</span>
                    <span className="chip-count">{item.count}筆</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <aside className="search-intelligence glass-surface" aria-label="搜尋輔助">
          <section>
            <strong>熱門查詢</strong>
            {popularDistricts.length === 0 ? <span>依目前官方資料產生</span> : popularDistricts.map((item) => (
              <button key={item.query} type="button" onClick={() => setDistrict(item.query)}>
                {item.query}<small>{item.count} 筆</small>
              </button>
            ))}
          </section>
          <section>
            <strong>最近搜尋</strong>
            {recentSearches.length === 0 ? <span>尚無最近搜尋</span> : recentSearches.slice(0, 3).map((item) => (
              <button key={item.label} type="button" onClick={() => applyRecentSearch(item)}>{item.label}</button>
            ))}
          </section>
          <section>
            <strong>建議</strong>
            {suggestions.slice(0, 3).map((item) => (
              <button key={item} type="button" onClick={() => updateFilters({ keyword: item })}>{item}</button>
            ))}
          </section>
        </aside>

        <MapCanvas
          cityName={cityName}
          district={district}
          mode={assetMode}
          records={filteredData}
          selectedRecord={selectedRecord}
          isGeocoding={isGeocoding}
          geocodedCount={geocodedCount}
          totalToGeocode={totalToGeocode}
          onSelectRecord={setSelectedRecord}
          onSelectDistrict={setDistrict}
        />



        <div id="results">
          <ResultWorkspace
            cityName={cityName}
            mode={assetMode}
            records={data}
            visibleRecords={filteredData}
            selectedRecord={selectedRecord}
            view={view}
            loading={loading}
            error={error}
            compareRecords={compareRecords}
            favoriteIds={favoriteRecords.map((record) => record.id)}
            onRetry={refresh}
            onSelectRecord={setSelectedRecord}
            onSaveSearch={saveCurrentSearch}
            onToggleFavorite={() => toggleFavoriteRecord(selectedRecord)}
            onAddToCompare={() => addToCompare(selectedRecord ?? filteredData[0] ?? null)}
            sortLabel={editableCopy.empty}
            onViewChange={setView}
          />
        </div>
      </main>

      <span className="sr-only">{ASSET_MODE_LABELS.join("、")}</span>
      {statusMessage ? <div className="toast glass-surface" role="status">{statusMessage}</div> : null}

      {settingsOpen ? (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <section className="settings-panel glass-surface">
            <div className="panel-heading">
              <div>
                <span className="ui-label">偏好設定</span>
                <h2 id="settings-title">顯示與資料來源</h2>
              </div>
              <button className="icon-button" type="button" aria-label="關閉設定" onClick={() => setSettingsOpen(false)}>
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <label className="toggle-row">
              <span>
                <strong>深色模式</strong>
                <small>切換低亮度玻璃背景。</small>
              </span>
              <button className="mini-action" type="button" onClick={updateDarkMode}>
                {darkMode ? <Sun aria-hidden="true" size={15} /> : <Moon aria-hidden="true" size={15} />}
                {darkMode ? "淺色" : "深色"}
              </button>
            </label>
            <div className="setting-group">
              <strong><Type aria-hidden="true" size={15} /> 字級</strong>
              {(["small", "medium", "large"] as const).map((size) => (
                <button key={size} type="button" className={fontSize === size ? "is-active" : ""} onClick={() => updateFontSize(size)}>
                  {size === "small" ? "小" : size === "medium" ? "中" : "大"}
                </button>
              ))}
            </div>
            <label className="toggle-row">
              <span>
                <strong>降低透明玻璃</strong>
                <small>減少模糊與透明疊層，提升可讀性。</small>
              </span>
              <input
                type="checkbox"
                checked={reduceTransparency}
                onChange={() => setReduceTransparency((value) => !value)}
              />
            </label>
            <label className="toggle-row">
              <span>
                <strong>資料判讀提示</strong>
                <small>顯示各資產類型的在地判讀提醒。</small>
              </span>
              <input
                type="checkbox"
                checked={insightOpen}
                onChange={() => setInsightOpen((value) => !value)}
              />
            </label>
            <label className="copy-field">
              <span>站名文案</span>
              <input
                value={editableCopy.title}
                onChange={(event) => updateEditableCopy({ ...editableCopy, title: event.target.value })}
              />
            </label>
            <label className="copy-field">
              <span>無資料文案</span>
              <input
                value={editableCopy.empty}
                onChange={(event) => updateEditableCopy({ ...editableCopy, empty: event.target.value })}
              />
            </label>
            <button className="panel-link button-link" type="button" onClick={requestUserLocation}>
              <LocateFixed aria-hidden="true" size={16} />
              使用目前位置切換行政區
            </button>
            <button className="panel-link button-link" type="button" onClick={() => setFeedbackOpen(true)}>
              <MessageSquare aria-hidden="true" size={16} />
              意見回饋
            </button>
            <a className="panel-link" href={source ?? "https://plvr.land.moi.gov.tw/"} target="_blank" rel="noreferrer">
              <Save aria-hidden="true" size={16} />
              內政部官方資料來源
            </a>
          </section>
        </div>
      ) : null}

      {savedPanelOpen ? (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="saved-title">
          <section className="saved-panel glass-surface">
            <div className="panel-heading">
              <div>
                <span className="ui-label">收藏與比較</span>
                <h2 id="saved-title">已儲存項目</h2>
              </div>
              <button className="icon-button" type="button" aria-label="關閉收藏" onClick={() => setSavedPanelOpen(false)}>
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <div className="saved-section">
              <strong>查詢條件</strong>
              {savedSearches.length === 0 ? <p>尚未儲存查詢條件。</p> : savedSearches.map((savedSearch) => (
                <button key={savedSearch.id} type="button" onClick={() => applySavedSearch(savedSearch)}>
                  <span>{savedSearch.name}</span>
                  <small>{new Date(savedSearch.savedAt).toLocaleDateString("zh-TW")}</small>
                </button>
              ))}
            </div>
            <div className="saved-section">
              <strong>收藏成交</strong>
              {favoriteRecords.length === 0 ? <p>尚未收藏成交紀錄。</p> : favoriteRecords.map((record) => (
                <button key={record.id} type="button" onClick={() => {
                  setSelectedRecord(record);
                  setSavedPanelOpen(false);
                }}>
                  <span>{record.address || record.district}</span>
                  <small>{record.transactionType} · {record.date || "日期未揭露"}</small>
                </button>
              ))}
            </div>
            <div className="saved-section">
              <strong>比較清單</strong>
              {compareRecords.length === 0 ? <p>可從結果列加入最多 3 筆真實成交比較。</p> : compareRecords.map((record) => (
                <button key={record.id} type="button" onClick={() => {
                  setSelectedRecord(record);
                  setView("compare");
                  setSavedPanelOpen(false);
                }}>
                  <span>{record.address || record.district}</span>
                  <small>{record.transactionType}</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {feedbackOpen ? (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
          <form className="feedback-panel glass-surface" onSubmit={submitFeedback}>
            <div className="panel-heading">
              <div>
                <span className="ui-label">Feedback</span>
                <h2 id="feedback-title">意見回饋</h2>
              </div>
              <button className="icon-button" type="button" aria-label="關閉回饋" onClick={() => setFeedbackOpen(false)}>
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <label className="copy-field">
              <span>分類</span>
              <select value={feedbackCategory} onChange={(event) => setFeedbackCategory(event.target.value)}>
                <option>系統錯誤</option>
                <option>功能建議</option>
                <option>介面優化</option>
                <option>其它</option>
              </select>
            </label>
            <label className="copy-field">
              <span>內容</span>
              <textarea value={feedbackContent} onChange={(event) => setFeedbackContent(event.target.value)} required />
            </label>
            <label className="copy-field">
              <span>聯絡方式</span>
              <input value={feedbackContact} onChange={(event) => setFeedbackContact(event.target.value)} />
            </label>
            {feedbackStatus === "error" ? <p>尚未設定資料寫入端點，部署後請設定 FEEDBACK_WEBHOOK_URL。</p> : null}
            {feedbackStatus === "success" ? <p>回饋已送出。</p> : null}
            <button className="primary-action" type="submit" disabled={feedbackStatus === "submitting"}>
              {feedbackStatus === "submitting" ? "送出中" : "送出回饋"}
            </button>
          </form>
        </div>
      ) : null}

      <section className="seo-content-zone" aria-label="SEO content">
        <h2>{cityName}{district === "全部" ? "" : district}{definition.queryLabel}與房價地圖</h2>
        <p>免費查詢{cityName}{district === "全部" ? "" : district}房地、土地、預售屋與租賃實價登錄，資料串接內政部公開資料，並保留地圖、篩選、比較與收藏工作流。</p>
        <h2>常見問題 FAQ</h2>
        <details open>
          <summary>資料來源是哪裡？</summary>
          <p>成交資料來自內政部不動產交易實價查詢服務網公開下載檔。</p>
        </details>
        <details>
          <summary>為什麼地圖定位可能不精準？</summary>
          <p>實價登錄地址會去識別化，地圖定位以公開地址與行政區近似定位。</p>
        </details>
        <nav className="site-footer-map" aria-label="網站地圖">
          {ASSET_MODE_LABELS.map((label) => <a key={label} href="#results">{label}實價登錄</a>)}
          <a href="#source">官方資料來源</a>
          <a href="#guidance">資料判讀指南</a>
        </nav>
      </section>
    </div>
  );
}
