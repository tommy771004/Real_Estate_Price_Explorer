import {
  BarChart3,
  ChevronUp,
  Info,
  List,
  Map,
  Scale,
  SlidersHorizontal,
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
  summarizeTransactions,
  type AssetMode,
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

export default function App() {
  const [assetMode, setAssetMode] = useState<AssetMode>("land");
  const [cityName, setCityName] = useState("臺北市");
  const [district, setDistrict] = useState("全部");
  const [view, setView] = useState<WorkspaceView>("map");
  const [filtersOpen, setFiltersOpen] = useState(() => window.innerWidth > 760);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [insightOpen, setInsightOpen] = useState(true);
  const [reduceTransparency, setReduceTransparency] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Transaction | null>(null);

  const definition = ASSET_DEFINITIONS[assetMode];
  const {
    data,
    setData,
    loading,
    error,
    source,
    refresh,
  } = useTransactions(cityName, district, assetMode);

  useEffect(() => {
    setSelectedRecord((current) =>
      data.find((record) => record.id === current?.id) ?? data[0] ?? null,
    );
  }, [data]);

  useEffect(() => {
    setAdvancedOpen(false);
  }, [assetMode]);

  const summary = useMemo(
    () => summarizeTransactions(data, assetMode),
    [assetMode, data],
  );

  const {
    isGeocoding,
    geocodedCount,
    totalToGeocode,
  } = useGeocoding({
    cityName,
    filteredData: data,
    data,
    setData,
    selectedItem: selectedRecord,
    setSelectedItem: setSelectedRecord,
    search: "",
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
        onCityChange={handleCityChange}
        onDistrictChange={setDistrict}
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
          records={data}
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
            selectedRecord={selectedRecord}
            view={view}
            loading={loading}
            error={error}
            onRetry={refresh}
            onSelectRecord={setSelectedRecord}
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
    </div>
  );
}
