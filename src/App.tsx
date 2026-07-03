import {
  BarChart3,
  ChevronUp,
  Info,
  List,
  Map,
  Save,
  Scale,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AssetDock } from "./components/AssetDock";
import { FilterPanel } from "./components/FilterPanel";
import { MapCanvas } from "./components/MapCanvas";
import {
  ResultWorkspace,
  type WorkspaceView,
} from "./components/ResultWorkspace";
import { SiteChrome } from "./components/SiteChrome";
import {
  ASSET_DEFINITIONS,
  DEFAULT_FILTERS,
  applyClientFilters,
  defaultPropertyTypesForMode,
  summarizeTransactions,
  type AssetMode,
  type ClientFilters,
} from "./data/transactions";
import { useGeocoding } from "./hooks/useGeocoding";
import { useTransactions } from "./hooks/useTransactions";
import type { Transaction } from "./types/real-estate";

const ASSET_MODE_LABELS = ["房地", "土地", "預售屋", "租賃"] as const;

const WORKSPACE_VIEWS: Array<{
  value: WorkspaceView;
  label: string;
  icon: typeof Map;
}> = [
  { value: "map", label: "地圖", icon: Map },
  { value: "list", label: "列表", icon: List },
  { value: "trend", label: "分布", icon: BarChart3 },
  { value: "compare", label: "比較", icon: Scale },
];

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

export default function App() {
  const [assetMode, setAssetMode] = useState<AssetMode>("land");
  const [cityName, setCityName] = useState("臺北市");
  const [district, setDistrict] = useState("全部");
  const [view, setView] = useState<WorkspaceView>("map");
  const [filtersOpen, setFiltersOpen] = useState(() => window.innerWidth > 760);
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
    refresh();
    setFiltersOpen(false);
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

  return (
    <div
      className={`app-shell ${reduceTransparency ? "reduce-transparency" : ""}`}
      style={{ "--asset-accent": definition.accent } as React.CSSProperties}
    >
      <div className="map-atmosphere" aria-hidden="true" />
      <SiteChrome
        reduceTransparency={reduceTransparency}
        onTransparencyToggle={() => setReduceTransparency((value) => !value)}
        onFiltersOpen={() => setFiltersOpen(true)}
        onSettingsOpen={() => setSettingsOpen(true)}
        onFavoritesOpen={() => setSavedPanelOpen(true)}
        favoriteCount={favoriteRecords.length + savedSearches.length}
      />

      <AssetDock activeMode={assetMode} onChange={setAssetMode} />

      <button
        className="floating-filter-button glass-surface pressable"
        type="button"
        aria-label="開啟查詢條件"
        aria-expanded={filtersOpen}
        onClick={() => setFiltersOpen(true)}
      >
        <SlidersHorizontal aria-hidden="true" size={18} />
      </button>

      <FilterPanel
        definition={definition}
        cityName={cityName}
        district={district}
        resultCount={summary.count}
        loading={loading}
        isOpen={filtersOpen}
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
        <section className="summary-strip glass-surface" key={`${assetMode}-${loading}`}>
          <div className="summary-heading">
            <span className="ui-label">{cityName}{district === "全部" ? "" : district}</span>
            <strong>{definition.queryLabel}概況</strong>
          </div>
          {summary.metrics.map((metric) => (
            <div className="summary-metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{loading ? "讀取中" : metric.value}</strong>
              <small>{metric.note}</small>
            </div>
          ))}
        </section>

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
        />

        <aside
          id="guidance"
          className={`insight-panel glass-surface-dark ${insightOpen ? "is-open" : ""}`}
        >
          <button
            className="insight-toggle"
            type="button"
            aria-expanded={insightOpen}
            onClick={() => setInsightOpen((value) => !value)}
          >
            <Info aria-hidden="true" size={17} />
            <span>這批資料怎麼看</span>
            <ChevronUp aria-hidden="true" className={!insightOpen ? "is-flipped" : ""} size={16} />
          </button>
          <ol>
            {definition.guidance.map((item) => <li key={item}>{item}</li>)}
          </ol>
          <a
            id="source"
            href={source ?? "https://plvr.land.moi.gov.tw/"}
            target="_blank"
            rel="noreferrer"
          >
            查看內政部官方資料來源
          </a>
        </aside>

        <div id="results">
          <ResultWorkspace
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
          />
        </div>
      </main>

      <nav className="view-dock glass-surface" aria-label="結果檢視模式">
        {WORKSPACE_VIEWS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            className={view === value ? "is-active" : ""}
            type="button"
            aria-pressed={view === value}
            onClick={() => setView(value)}
          >
            <Icon aria-hidden="true" size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

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
    </div>
  );
}
