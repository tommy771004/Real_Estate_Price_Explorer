import { Eye, EyeOff, Heart, Menu, Settings2 } from "lucide-react";

type SiteChromeProps = {
  reduceTransparency: boolean;
  onTransparencyToggle: () => void;
  onFiltersOpen: () => void;
  onSettingsOpen: () => void;
  onFavoritesOpen: () => void;
  favoriteCount: number;
};

export function SiteChrome({
  reduceTransparency,
  onTransparencyToggle,
  onFiltersOpen,
  onSettingsOpen,
  onFavoritesOpen,
  favoriteCount,
}: SiteChromeProps) {
  return (
    <header className="site-chrome glass-surface">
      <a className="brand" href="/" aria-label="實價登錄查詢首頁">
        <span className="brand-mark" />
        <span>實價登錄查詢</span>
      </a>

      <nav className="desktop-nav" aria-label="輔助功能">
        <a href="#results">收藏與比較</a>
        <a href="#guidance">資料指南</a>
        <a href="#source">方法與來源</a>
      </nav>

      <div className="chrome-actions">
        <button
          className="icon-button"
          type="button"
          aria-label={reduceTransparency ? "啟用透明玻璃" : "降低透明效果"}
          aria-pressed={reduceTransparency}
          onClick={onTransparencyToggle}
        >
          {reduceTransparency
            ? <EyeOff aria-hidden="true" size={18} />
            : <Eye aria-hidden="true" size={18} />}
        </button>
        <button className="icon-button desktop-only" type="button" aria-label="設定" onClick={onSettingsOpen}>
          <Settings2 aria-hidden="true" size={18} />
        </button>
        <button className="icon-button mobile-only" type="button" aria-label="開啟篩選" onClick={onFiltersOpen}>
          <Menu aria-hidden="true" size={18} />
        </button>
        <button
          className="icon-button desktop-only has-badge"
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
