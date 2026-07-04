import { Building2, Eye, EyeOff, Heart, House, KeyRound, LandPlot, Settings, Settings2 } from "lucide-react";

import { ASSET_MODES, type AssetMode } from "../data/transactions";

const ICONS = {
  building: House,
  land: LandPlot,
  presale: Building2,
  rental: KeyRound,
} satisfies Record<AssetMode, typeof House>;

const LABELS: Record<AssetMode, string> = {
  building: "房地",
  land: "土地",
  presale: "預售屋",
  rental: "租賃",
};

type SiteChromeProps = {
  reduceTransparency: boolean;
  onTransparencyToggle: () => void;
  onFiltersOpen: () => void;
  onSettingsOpen: () => void;
  onFavoritesOpen: () => void;
  favoriteCount: number;
  activeMode: AssetMode;
  onModeChange: (mode: AssetMode) => void;
  filtersOpen: boolean;
};

export function SiteChrome({
  reduceTransparency,
  onTransparencyToggle,
  onFiltersOpen,
  onSettingsOpen,
  onFavoritesOpen,
  favoriteCount,
  activeMode,
  onModeChange,
  filtersOpen,
}: SiteChromeProps) {
  return (
    <header className="site-chrome glass-surface">
      <a className="brand" href="/" aria-label="實價登錄查詢首頁">
        <span className="brand-mark" />
        <span className="brand-text">實價登錄查詢</span>
      </a>

      <div className="site-chrome-tabs" role="group" aria-label="交易類型">
        {ASSET_MODES.map((mode) => {
          const Icon = ICONS[mode];
          const isActive = mode === activeMode;
          return (
            <button
              className={`asset-tab ${isActive ? "is-active" : ""}`}
              key={mode}
              type="button"
              aria-pressed={isActive}
              onClick={() => onModeChange(mode)}
            >
              <Icon aria-hidden="true" size={15} strokeWidth={2.2} />
              <span>{LABELS[mode]}</span>
            </button>
          );
        })}
      </div>

      <div className="chrome-actions">
        <button className="icon-button" type="button" aria-label="設定" onClick={onSettingsOpen}>
          <Settings aria-hidden="true" size={18} />
        </button>
        <button className="icon-button mobile-only" type="button" aria-expanded={filtersOpen} aria-label="開啟篩選" onClick={onFiltersOpen}>
          <Settings2 aria-hidden="true" size={18} />
        </button>
        <button
          className="icon-button has-badge"
          type="button"
          aria-label={`收藏與儲存查詢，共 ${favoriteCount} 項`}
          onClick={onFavoritesOpen}
        >
          <Heart aria-hidden="true" size={18} />
          {favoriteCount > 0 ? <span>{favoriteCount}</span> : null}
        </button>
      </div>
    </header>
  );
}

