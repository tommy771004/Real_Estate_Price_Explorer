import { useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X, MapPin } from "lucide-react";

import { CITIES, CITY_DISTRICTS } from "../data/locations";
import { defaultPropertyTypesForMode, type AssetDefinition, type ClientFilters } from "../data/transactions";
import { LocationSelectModal } from "./LocationSelectModal";

type FilterPanelProps = {
  definition: AssetDefinition;
  cityName: string;
  district: string;
  resultCount: number;
  loading: boolean;
  isOpen: boolean;
  "aria-expanded"?: boolean;
  advancedOpen: boolean;
  filters: ClientFilters;
  onCityChange: (city: string) => void;
  onDistrictChange: (district: string) => void;
  onFiltersChange: (next: Partial<ClientFilters>) => void;
  onFiltersReset: () => void;
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
  filters,
  onCityChange,
  onDistrictChange,
  onFiltersChange,
  onFiltersReset,
  onAdvancedToggle,
  onClose,
  onSearch,
}: FilterPanelProps) {
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const districts = CITY_DISTRICTS[cityName] ?? [];
  const propertyOptions = defaultPropertyTypesForMode(definition.mode);
  const currentRocYear = new Date().getFullYear() - 1911;
  const yearOptions = Array.from({ length: 15 }, (_, index) => String(currentRocYear - index));
  const monthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));

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
        <button
          className="location-trigger-btn select-control"
          type="button"
          onClick={() => setIsLocationModalOpen(true)}
          aria-label="選擇縣市與行政區"
        >
          <MapPin size={15} aria-hidden="true" className="location-trigger-icon" />
          <span className="location-trigger-label">
            {cityName} {district === "全部" ? "全部區域" : district}
          </span>
          <ChevronDown aria-hidden="true" size={15} className="location-trigger-arrow" />
        </button>

        <label className="text-control">
          <span className="sr-only">關鍵字</span>
          <input
            type="search"
            value={filters.keyword}
            placeholder="路名、社區、備註關鍵字"
            onChange={(event) => onFiltersChange({ keyword: event.target.value })}
          />
        </label>
      </div>

      <LocationSelectModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentCityName={cityName}
        currentDistrict={district}
        onSelect={(city, dist) => {
          onCityChange(city);
          onDistrictChange(dist);
        }}
      />

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
        {propertyOptions.length > 0 ? (
          <fieldset className="chip-group">
            <legend>物業類型</legend>
            {propertyOptions.map((type) => (
              <label key={type}>
                <input
                  type="checkbox"
                  checked={filters.propertyTypes.includes(type)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...filters.propertyTypes, type]
                      : filters.propertyTypes.filter((item) => item !== type);
                    onFiltersChange({ propertyTypes: next });
                  }}
                />
                <span>{type}</span>
              </label>
            ))}
          </fieldset>
        ) : null}

        <div className="period-grid">
          <label>
            <span>起年</span>
            <select
              value={filters.period.startY}
              onChange={(event) => onFiltersChange({ period: { ...filters.period, startY: event.target.value } })}
            >
              {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label>
            <span>起月</span>
            <select
              value={filters.period.startM}
              onChange={(event) => onFiltersChange({ period: { ...filters.period, startM: event.target.value } })}
            >
              {monthOptions.map((month) => <option key={month} value={month}>{month}</option>)}
            </select>
          </label>
          <label>
            <span>迄年</span>
            <select
              value={filters.period.endY}
              onChange={(event) => onFiltersChange({ period: { ...filters.period, endY: event.target.value } })}
            >
              {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label>
            <span>迄月</span>
            <select
              value={filters.period.endM}
              onChange={(event) => onFiltersChange({ period: { ...filters.period, endM: event.target.value } })}
            >
              {monthOptions.map((month) => <option key={month} value={month}>{month}</option>)}
            </select>
          </label>
        </div>

        <fieldset className="chip-group">
          <legend>屋齡區間</legend>
          {[
            { label: "不限", min: "", max: "" },
            { label: "5年內", min: "", max: "5" },
            { label: "5-10年", min: "5", max: "10" },
            { label: "10-20年", min: "10", max: "20" },
            { label: "20年以上", min: "20", max: "" }
          ].map((option) => {
            const isActive = filters.age.min === option.min && filters.age.max === option.max;
            return (
              <label key={option.label}>
                <input
                  type="radio"
                  name="age-range"
                  checked={isActive}
                  onChange={() => onFiltersChange({ age: { min: option.min, max: option.max } })}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </fieldset>

        <div className="range-grid">
          <label>
            <span>單價最小</span>
            <input
              type="number"
              inputMode="decimal"
              value={filters.unitPrice.min}
              onChange={(event) => onFiltersChange({ unitPrice: { ...filters.unitPrice, min: event.target.value } })}
            />
          </label>
          <label>
            <span>單價最大</span>
            <input
              type="number"
              inputMode="decimal"
              value={filters.unitPrice.max}
              onChange={(event) => onFiltersChange({ unitPrice: { ...filters.unitPrice, max: event.target.value } })}
            />
          </label>
          <label>
            <span>面積最小</span>
            <input
              type="number"
              inputMode="decimal"
              value={filters.area.min}
              onChange={(event) => onFiltersChange({ area: { ...filters.area, min: event.target.value } })}
            />
          </label>
          <label>
            <span>面積最大</span>
            <input
              type="number"
              inputMode="decimal"
              value={filters.area.max}
              onChange={(event) => onFiltersChange({ area: { ...filters.area, max: event.target.value } })}
            />
          </label>
        </div>

        <div className="unit-switches">
          <label>
            <input
              type="radio"
              name="unit-price-unit"
              checked={filters.unitPrice.unit === "1"}
              onChange={() => onFiltersChange({ unitPrice: { ...filters.unitPrice, unit: "1" } })}
            />
            <span>萬元/坪</span>
          </label>
          <label>
            <input
              type="radio"
              name="unit-price-unit"
              checked={filters.unitPrice.unit === "2"}
              onChange={() => onFiltersChange({ unitPrice: { ...filters.unitPrice, unit: "2" } })}
            />
            <span>元/㎡</span>
          </label>
          <label>
            <input
              type="radio"
              name="area-unit"
              checked={filters.area.unit === "2"}
              onChange={() => onFiltersChange({ area: { ...filters.area, unit: "2" } })}
            />
            <span>坪</span>
          </label>
          <label>
            <input
              type="radio"
              name="area-unit"
              checked={filters.area.unit === "1"}
              onChange={() => onFiltersChange({ area: { ...filters.area, unit: "1" } })}
            />
            <span>㎡</span>
          </label>
        </div>

        <button type="button" onClick={() => { if (window.confirm("清除所有進階篩選條件？")) onFiltersReset(); }}>清除進階條件</button>
      </div>
    </aside>
  );
}
