import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";

import { CITIES, CITY_DISTRICTS } from "../data/locations";
import type { AssetDefinition } from "../data/transactions";

type FilterPanelProps = {
  definition: AssetDefinition;
  cityName: string;
  district: string;
  resultCount: number;
  loading: boolean;
  isOpen: boolean;
  advancedOpen: boolean;
  onCityChange: (city: string) => void;
  onDistrictChange: (district: string) => void;
  onAdvancedToggle: () => void;
  onClose: () => void;
  onSearch: () => void;
};

export function FilterPanel({
  definition,
  cityName,
  district,
  resultCount,
  loading,
  isOpen,
  advancedOpen,
  onCityChange,
  onDistrictChange,
  onAdvancedToggle,
  onClose,
  onSearch,
}: FilterPanelProps) {
  const districts = CITY_DISTRICTS[cityName] ?? [];

  return (
    <aside
      className={`filter-panel glass-surface ${isOpen ? "is-open" : ""}`}
      aria-label={`${definition.label}查詢條件`}
    >
      <div className="filter-heading">
        <div>
          <span className="ui-label">{definition.label}實價查詢</span>
          <h1>{cityName}{district === "全部" ? "" : district}{definition.queryLabel}</h1>
        </div>
        <button className="icon-button mobile-only" type="button" onClick={onClose} aria-label="關閉篩選">
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      <div className="filter-controls">
        <label className="select-control">
          <span className="sr-only">縣市</span>
          <select value={cityName} onChange={(event) => onCityChange(event.target.value)}>
            {CITIES.map((city) => <option key={city.code} value={city.name}>{city.name}</option>)}
          </select>
          <ChevronDown aria-hidden="true" size={15} />
        </label>

        <label className="select-control">
          <span className="sr-only">行政區</span>
          <select value={district} onChange={(event) => onDistrictChange(event.target.value)}>
            <option value="全部">全部行政區</option>
            {districts.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}
          </select>
          <ChevronDown aria-hidden="true" size={15} />
        </label>

        <div className="filter-control filter-readonly">
          <span>{definition.transactionName} · 最近 2 年</span>
        </div>
      </div>

      <button className="primary-action pressable" type="button" onClick={onSearch} disabled={loading}>
        <Search aria-hidden="true" size={17} />
        {loading ? "正在取得官方資料" : resultCount > 0 ? `更新 ${resultCount.toLocaleString("zh-TW")} 筆成交` : "查詢官方資料"}
      </button>

      <button
        className="advanced-toggle"
        type="button"
        aria-expanded={advancedOpen}
        onClick={onAdvancedToggle}
      >
        <SlidersHorizontal aria-hidden="true" size={15} />
        <span>進階條件與欄位</span>
        <ChevronDown
          aria-hidden="true"
          className={advancedOpen ? "is-rotated" : ""}
          size={15}
        />
      </button>

      <div className={`advanced-options ${advancedOpen ? "is-open" : ""}`}>
        <p>進階價格、面積與屋齡篩選將使用與主網站相同的官方欄位口徑。</p>
      </div>
    </aside>
  );
}
