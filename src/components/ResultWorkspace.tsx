import { ArrowUpRight, Bookmark, ChevronUp, Heart, Scale, List, BarChart3, X, Share } from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";

import {
  formatTransactionPrice,
  formatUnitPrice,
  type AssetMode,
} from "../data/transactions";
import {
  aggregatePresaleProjects,
  buildCommunityTrend,
  paginateTransactions,
  sortTransactions,
  type SortConfig,
  type SortKey,
} from "../data/experience";
import { toMapCoordinate } from "../lib/mapLocation";
import type { Transaction } from "../types/real-estate";

function InvalidateMapSize({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    map.setView(center, 16);
    const timer = setTimeout(() => {
      map.invalidateSize();
      map.setView(center, 16);
    }, 300);
    return () => clearTimeout(timer);
  }, [map, center[0], center[1]]);
  return null;
}

export type WorkspaceView = "map" | "list" | "trend" | "compare";

type ResultWorkspaceProps = {
  cityName: string;
  mode: AssetMode;
  records: Transaction[];
  visibleRecords: Transaction[];
  selectedRecord: Transaction | null;
  view: WorkspaceView;
  loading: boolean;
  error: string | null;
  compareRecords: Transaction[];
  favoriteIds: string[];
  onRetry: () => void;
  onSelectRecord: (record: Transaction) => void;
  onSaveSearch: () => void;
  onToggleFavorite: () => void;
  onAddToCompare: () => void;
  sortLabel: string;
  onViewChange?: (view: WorkspaceView) => void;
};

function RecordRow({
  mode,
  record,
  selected,
  onSelect,
  onOpenDetail,
}: {
  mode: AssetMode;
  record: Transaction;
  selected: boolean;
  onSelect: () => void;
  onOpenDetail: () => void;
}) {
  return (
    <button
      className={`record-row ${selected ? "is-selected" : ""}`}
      type="button"
      onClick={onSelect}
    >
      <span className="record-place">
        <strong>{record.address || record.district}</strong>
        <small>{record.transactionType} · {record.date || "日期未揭露"}</small>
      </span>
      <span className="record-price">
        <strong>{formatUnitPrice(record.unitPrice, mode)}</strong>
        <small>{formatTransactionPrice(record.totalPrice, mode)}</small>
      </span>
      <span 
        className="row-detail-btn"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetail();
        }}
        title="查看成交詳情"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenDetail();
          }
        }}
      >
        <ArrowUpRight aria-hidden="true" size={16} />
      </span>
    </button>
  );
}

export function ResultWorkspace({
  cityName,
  mode,
  records,
  visibleRecords,
  selectedRecord,
  view,
  loading,
  error,
  compareRecords,
  favoriteIds,
  onRetry,
  onSelectRecord,
  onSaveSearch,
  onToggleFavorite,
  onAddToCompare,
  sortLabel,
  onViewChange,
}: ResultWorkspaceProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const sortedRecords = useMemo(
    () => sortTransactions(visibleRecords, sortConfig),
    [sortConfig, visibleRecords],
  );
  const paginated = useMemo(
    () => paginateTransactions(sortedRecords, currentPage, pageSize),
    [currentPage, pageSize, sortedRecords],
  );
  const presaleProjects = useMemo(
    () => aggregatePresaleProjects(visibleRecords),
    [visibleRecords],
  );
  const communityTrend = useMemo(
    () => buildCommunityTrend(visibleRecords, selectedRecord),
    [selectedRecord, visibleRecords],
  );
  const trendValues = visibleRecords.slice(0, 8).map((record) => Number(record.unitPrice) || 0);
  const maxTrend = Math.max(...trendValues, 1);
  const comparisonRecords = compareRecords.length > 0 ? compareRecords : visibleRecords.slice(0, 3);
  const selectedIsFavorite = Boolean(selectedRecord && favoriteIds.includes(selectedRecord.id));
  const toggleSort = (key: SortKey) => {
    setCurrentPage(1);
    setSortConfig((current) =>
      current?.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" },
    );
  };

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [customHeight, setCustomHeight] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(110);
  const [detailRecord, setDetailRecord] = useState<Transaction | null>(null);

  const similarRecordsInfo = useMemo(() => {
    if (!detailRecord) return { list: [], count: 0, maxPrice: 0, minPrice: 0 };
    const streetName = detailRecord.address ? detailRecord.address.substring(0, 8) : "";
    const list = records.filter(
      (r) => r.id !== detailRecord.id && (r.district === detailRecord.district || (streetName && r.address.includes(streetName)))
    ).slice(0, 3);
    
    const allMatching = records.filter(
      (r) => r.district === detailRecord.district || (streetName && r.address.includes(streetName))
    );
    const prices = allMatching.map((r) => parseFloat(r.unitPrice) || 0).filter(p => p > 0);
    const maxPrice = prices.length ? Math.max(...prices) : parseFloat(detailRecord.unitPrice) || 0;
    const minPrice = prices.length ? Math.min(...prices) : parseFloat(detailRecord.unitPrice) || 0;
    
    return {
      list,
      count: allMatching.length,
      maxPrice,
      minPrice
    };
  }, [detailRecord, records]);

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, [isCollapsed, view, customHeight, records.length]);

  const [showRealMap, setShowRealMap] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (!detailRecord) return;
    setIsSharing(true);
    setTimeout(() => setIsSharing(false), 500);
    const title = `${detailRecord.address} - ${cityName}${detailRecord.district}實價登錄`;
    const text = `總價: ${formatTransactionPrice(detailRecord.totalPrice, mode)}\n單價: ${formatUnitPrice(detailRecord.unitPrice, mode)}\n坪數: ${detailRecord.area || detailRecord.buildingArea || ""} 坪`;
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
      } catch (e) {
        console.warn("Share failed:", e);
      }
    } else {
      navigator.clipboard.writeText(`${title}\n${text}\n${url}`).then(() => {
        alert("已複製到剪貼簿");
      });
    }
  };

  useEffect(() => {
    if (detailRecord) {
      document.body.style.overflow = "hidden";
      const timer = setTimeout(() => {
        setShowRealMap(true);
      }, 400); // 等待淡入動畫 (320ms) 完成後再加載，確保 Leaflet 能獲取正確的容器尺寸
      return () => {
        clearTimeout(timer);
      };
    } else {
      document.body.style.overflow = "";
      setShowRealMap(false);
    }
  }, [detailRecord]);

  const handleToggle = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (next) {
        setCustomHeight(null);
      } else {
        setCustomHeight(window.innerWidth <= 760 ? 188 : 248);
      }
      return next;
    });
  };

  const startDrag = (startY: number) => {
    setIsDragging(true);
    const isMobile = window.innerWidth <= 760;
    const initialHeight = customHeight || (isCollapsed ? (isMobile ? 84 : 72) : (isMobile ? 188 : 248));
    let hasMoved = false;

    const handleMove = (currentY: number) => {
      const deltaY = currentY - startY;
      if (Math.abs(deltaY) > 4) {
        hasMoved = true;
      }

      const isMobileNow = window.innerWidth <= 760;
      const bottomOffset = isMobileNow ? 8 : 18;
      let newHeight = window.innerHeight - currentY - bottomOffset;

      // Restrict bounds
      const minHeight = isMobileNow ? 84 : 72;
      const maxHeight = window.innerHeight * 0.85;

      if (newHeight < minHeight) {
        newHeight = minHeight;
      } else if (newHeight > maxHeight) {
        newHeight = maxHeight;
      }

      const collapsedThreshold = isMobileNow ? 110 : 120;
      if (newHeight > collapsedThreshold) {
        setIsCollapsed(false);
      } else {
        setIsCollapsed(true);
      }

      setCustomHeight(newHeight);
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleMove(moveEvent.clientY);
    };

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length > 0) {
        handleMove(moveEvent.touches[0].clientY);
      }
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleDragEnd);

      if (!hasMoved) {
        handleToggle();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleDragEnd);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    startDrag(e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (e.touches.length > 0) {
      e.preventDefault();
      startDrag(e.touches[0].clientY);
    }
  };

  const style: CSSProperties = useMemo(() => {
    if (customHeight === null) {
      return {};
    }
    if (isCollapsed) {
      return {
        height: `${window.innerWidth <= 760 ? 84 : 72}px`,
        maxHeight: "none",
        minHeight: "none",
      };
    }
    return {
      height: `${customHeight}px`,
      maxHeight: "none",
      minHeight: "none",
    };
  }, [customHeight, isCollapsed]);

  const WORKSPACE_VIEWS = [
    { value: "list" as const, label: "列表", icon: List },
    { value: "trend" as const, label: "分布", icon: BarChart3 },
    { value: "compare" as const, label: "比較", icon: Scale },
  ];

  return (
    <section 
      className={`result-workspace glass-surface view-${view} ${isCollapsed ? "is-collapsed" : ""} ${customHeight !== null ? "has-custom-height" : ""} ${isDragging ? "active" : ""}`} 
      style={style}
      aria-live="polite"
    >
      <div ref={headerRef} className="workspace-header-section">
        <button 
          className="sheet-handle" 
          type="button" 
          aria-label={isCollapsed ? "展開結果" : "收合結果"} 
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{ touchAction: "none" }}
        >
          <span className="sheet-handle-bar" />
        </button>
        <div className="result-header" onClick={handleToggle} style={{ cursor: "pointer" }}>
          <div>
            <h2>{loading ? "正在取得官方資料" : `${records.length.toLocaleString("zh-TW")} 筆成交`}</h2>
            <p>符合目前篩選 {visibleRecords.length.toLocaleString("zh-TW")} 筆</p>
          </div>
          <div className="result-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className={`icon-button ${isCollapsed ? "is-collapsed-icon" : ""}`}
              type="button"
              aria-label={isCollapsed ? "展開" : "收合"}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
            >
              <ChevronUp aria-hidden="true" size={17} className={isCollapsed ? "" : "is-flipped"} />
            </button>
            <button className="icon-button" type="button" aria-label="收藏目前查詢" onClick={onSaveSearch}>
              <Heart aria-hidden="true" size={17} />
            </button>
            <button
              className={`icon-button ${selectedIsFavorite ? "is-active" : ""}`}
              type="button"
              aria-label={selectedIsFavorite ? "取消收藏成交" : "收藏成交"}
              aria-pressed={selectedIsFavorite}
              onClick={onToggleFavorite}
              disabled={!selectedRecord}
            >
              <Bookmark aria-hidden="true" size={17} />
            </button>
            <button className="icon-button" type="button" aria-label="加入比較" onClick={onAddToCompare}>
              <Scale aria-hidden="true" size={17} />
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="workspace-tabs" onClick={(e) => e.stopPropagation()}>
            {WORKSPACE_VIEWS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                className={`workspace-tab-btn ${view === value ? "is-active" : ""}`}
                type="button"
                onClick={() => onViewChange?.(value)}
              >
                <Icon aria-hidden="true" size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div 
        className="workspace-content-area"
        style={customHeight !== null && !isCollapsed ? { height: `calc(100% - ${headerHeight}px)` } : undefined}
      >
        {error ? (
          <div className="result-message" role="alert">
            <strong>無法取得官方資料</strong>
            <span>{error}</span>
            <button type="button" onClick={onRetry}>重新查詢</button>
          </div>
        ) : loading ? (
          <div className="result-skeleton" aria-label="資料載入中">
            <i /><i /><i />
          </div>
        ) : visibleRecords.length === 0 ? (
          <div className="result-message">
            <strong>{sortLabel}</strong>
            <span>可調整行政區、資產類型或查詢期間後重試。</span>
          </div>
        ) : view === "trend" ? (
          <div className="trend-view">
            <div className="trend-bars" aria-label="目前結果的單價分布">
              {trendValues.map((value, index) => (
                <span
                  key={`${value}-${index}`}
                  style={{ "--bar-height": `${Math.max((value / maxTrend) * 100, 8)}%` } as CSSProperties}
                />
              ))}
            </div>
            <div className="trend-axis"><span>目前結果前段</span><span>單價相對分布</span></div>
            <div className="community-trend" aria-label="社區趨勢圖">
              {communityTrend.map((point) => (
                <span key={point.month}>
                  <b>{point.unitPrice}</b>
                  <small>{point.month} · {point.count} 筆</small>
                </span>
              ))}
            </div>
            {mode === "presale" ? (
              <div className="presale-aggregate" aria-label="預售屋建案彙整">
                {presaleProjects.slice(0, 3).map((project) => (
                  <span key={project.name}>
                    <b>{project.name}</b>
                    <small>{project.count} 筆 · {formatUnitPrice(String(project.averageUnitPrice), mode)}</small>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : view === "compare" ? (
          <div className="compare-view">
            {comparisonRecords.map((record, index) => (
              <div className="compare-column" key={record.id}>
                <span>案例 {index + 1}</span>
                <strong>{record.address || record.district}</strong>
                <b>{formatUnitPrice(record.unitPrice, mode)}</b>
                <small>{record.transactionType} · {record.date}</small>
              </div>
            ))}
          </div>
        ) : (
          <>
            {view === "list" ? (
              <div className="table-controls" aria-label="完整表格排序與分頁">
                {[
                  ["date", "日期"],
                  ["totalPrice", "總價"],
                  ["unitPrice", "單價"],
                  ["buildingArea", "建坪"],
                  ["area", "土地"],
                ].map(([key, label]) => (
                  <button key={key} type="button" onClick={() => toggleSort(key as SortKey)}>
                    {label}{sortConfig?.key === key ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                  </button>
                ))}
                <select value={pageSize} onChange={(event) => {
                  setCurrentPage(1);
                  setPageSize(Number(event.target.value));
                }}>
                  <option value={10}>10 筆</option>
                  <option value={20}>20 筆</option>
                  <option value={50}>50 筆</option>
                </select>
              </div>
            ) : null}
            <div className={`records ${view === "list" ? "is-list" : ""}`}>
              {(view === "list" ? paginated.records : visibleRecords.slice(0, 6)).map((record) => (
                <RecordRow
                  key={record.id}
                  mode={mode}
                  record={record}
                  selected={selectedRecord?.id === record.id}
                  onSelect={() => onSelectRecord(record)}
                  onOpenDetail={() => setDetailRecord(record)}
                />
              ))}
            </div>
            {view === "list" ? (
              <div className="pagination-controls">
                <button type="button" disabled={paginated.currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>上一頁</button>
                <span>{paginated.currentPage} / {paginated.totalPages}</span>
                <button type="button" disabled={paginated.currentPage === paginated.totalPages} onClick={() => setCurrentPage((page) => Math.min(paginated.totalPages, page + 1))}>下一頁</button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {detailRecord && createPortal(
        <div className="detail-modal-overlay" onClick={() => setDetailRecord(null)}>
          <div className="detail-modal-container" onClick={(e) => e.stopPropagation()}>
            <button 
              className="detail-modal-close" 
              type="button" 
              onClick={() => setDetailRecord(null)}
              aria-label="關閉詳情"
            >
              <X size={20} />
            </button>

            <div className="detail-modal-header">
              <div className="detail-modal-header-inner">
                <div className="detail-modal-tag-row">
                  <span className="district-tag">{detailRecord.district || "行政區"}</span>
                  <span className="price-tag">
                    登錄價 <span className="price-val">{formatTransactionPrice(detailRecord.totalPrice, mode)}</span>
                  </span>
                  <button 
                    className={`share-btn ${isSharing ? "is-sharing" : ""}`}
                    type="button" 
                    onClick={handleShare}
                    aria-label="分享"
                  >
                    <Share size={16} />
                  </button>
                </div>
                <h1 className="detail-modal-address">{detailRecord.address}</h1>
                <div className="detail-modal-badges">
                  {parseFloat(detailRecord.unitPrice) > 50 ? (
                    <span className="badge-pill trend-badge">📈 趨勢指標</span>
                  ) : parseFloat(detailRecord.unitPrice) < 25 ? (
                    <span className="badge-pill special-badge">🚨 特殊交易</span>
                  ) : (
                    <span className="badge-pill standard-badge">✔️ 一般交易</span>
                  )}
                  {detailRecord.hasManagement === "有" ? (
                    <span className="badge-pill management-tag">🛡️ 留守管理</span>
                  ) : (
                    <span className="badge-pill management-tag-none">🏡 自主管理</span>
                  )}
                  {(parseFloat(detailRecord.parkingPrice) > 0 || detailRecord.parkingType) && (
                    <span className="badge-pill parking-tag">🏢 附車位</span>
                  )}
                  <span className="badge-pill status-tag">✨ 實價認證</span>
                </div>
                <div className="detail-modal-meta">
                  <span className="meta-item">🗓️ {detailRecord.date || "2026/06/03"} 交易</span>
                  <span className="meta-item">📍 {detailRecord.address ? detailRecord.address.substring(0, 3) : "新北市"}</span>
                </div>
              </div>
            </div>

            <div className="detail-modal-body">
              <div className="detail-modal-body-inner">
                {/* Metrics Grid */}
                <div className="metrics-grid">
                  <div className="metric-card">
                    <div className="metric-icon-wrap">💲</div>
                    <div className="metric-content">
                      <span className="metric-label">單價 / 坪</span>
                      <strong className="metric-value">{formatUnitPrice(detailRecord.unitPrice, mode)}</strong>
                      <span className="metric-sub">實價登錄單價</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon-wrap">📐</div>
                    <div className="metric-content">
                      <span className="metric-label">建物面積</span>
                      <strong className="metric-value">{parseFloat(detailRecord.buildingArea) || 0} m²</strong>
                      <span className="metric-sub">
                        約 {(parseFloat(detailRecord.buildingArea) * 0.3025).toFixed(2)} 坪
                      </span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon-wrap">🧬</div>
                    <div className="metric-content">
                      <span className="metric-label">移轉層次</span>
                      <strong className="metric-value">{detailRecord.floor || "全"} / {detailRecord.totalFloor || "-"} 樓</strong>
                      <span className="metric-sub">總樓層 {detailRecord.totalFloor || "-"} 樓</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon-wrap">🕒</div>
                    <div className="metric-content">
                      <span className="metric-label">屋齡</span>
                      <strong className="metric-value">
                        {detailRecord.completionDate && detailRecord.completionDate !== "-" ? detailRecord.completionDate : "新成屋"}
                      </strong>
                      <span className="metric-sub">建築完工至今</span>
                    </div>
                  </div>
                </div>

                {/* Geographic Info / Map Placeholder */}
                <div className="geo-location-section">
                  <div className="section-title">
                    🗺️ 地理位置
                    <span style={{ fontSize: "11px", fontWeight: "normal", color: "#64748b", marginLeft: "6px" }}>
                      ({toMapCoordinate(detailRecord.lat) !== null ? `緯度: ${detailRecord.lat}` : "無精確緯度"} , {toMapCoordinate(detailRecord.lng) !== null ? `經度: ${detailRecord.lng}` : "無精確經度"})
                    </span>
                  </div>
                  {showRealMap ? (
                    (() => {
                      const targetLat = toMapCoordinate(detailRecord.lat);
                      const targetLng = toMapCoordinate(detailRecord.lng);

                      if (targetLat === null || targetLng === null) {
                        return (
                          <div className="modal-map-mock" style={{ height: 200 }}>
                            <div className="map-address-overlay">{detailRecord.address}</div>
                            <div className="map-coords">此筆公開資料目前無法解析精確位置</div>
                          </div>
                        );
                      }

                      return (
                        <div className="detail-modal-map">
                          <MapContainer
                            key={detailRecord.id}
                            center={[targetLat, targetLng]}
                            zoom={16}
                            zoomControl={false}
                            scrollWheelZoom={false}
                            style={{ width: "100%", height: "100%" }}
                          >
                            <TileLayer
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            />
                            <Marker
                              position={[targetLat, targetLng]}
                              icon={L.divIcon({
                                className: "real-map-marker is-selected",
                                html: `
                                  <span class="marker-dot"></span>
                                  <span class="marker-ripple"></span>
                                `,
                                iconSize: [32, 32],
                                iconAnchor: [16, 16],
                              })}
                            />
                            <InvalidateMapSize center={[targetLat, targetLng]} />
                          </MapContainer>
                          <div className="map-address-overlay">{detailRecord.address}</div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="modal-map-mock" style={{ height: 200 }}>
                      <div className="map-grid-layer"></div>
                      <div className="map-circle-ping"></div>
                      <div className="map-marker-pin">📍</div>
                      <div className="map-address-overlay">{detailRecord.address}</div>
                      <div className="map-coords">
                        地圖載入中...
                      </div>
                    </div>
                  )}
                </div>

                {/* Building Details Section */}
                <div className="building-info-section">
                  <div className="section-title">建物資訊</div>
                  <div className="info-table">
                    <div className="info-row">
                      <span className="info-key">建物型態</span>
                      <span className="info-val">{detailRecord.buildingType || "電梯大樓"}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-key">移轉層次</span>
                      <span className="info-val">{detailRecord.floor || "全層"} / {detailRecord.totalFloor || "-"} 層</span>
                    </div>
                    <div className="info-row">
                      <span className="info-key">主要用途</span>
                      <span className="info-val">{detailRecord.mainUse || "住家用"}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-key">主要建材</span>
                      <span className="info-val">{detailRecord.material || "鋼筋混凝土造"}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-key">建築完成日</span>
                      <span className="info-val">{detailRecord.completionDate && detailRecord.completionDate !== "-" ? detailRecord.completionDate : "新成屋"}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-key">現況格局</span>
                      <span className="info-val">
                        {detailRecord.rooms || "2"} 房 {detailRecord.halls || "2"} 廳 {detailRecord.bathrooms || "1"} 衛
                      </span>
                    </div>
                  </div>
                </div>

                {/* Similar Transactions */}
                <div className="similar-records-section">
                  <div className="section-title">
                    同社區/建案歷史紀錄 <span className="title-sub">(同路段極接近建案)</span>
                  </div>
                  <div className="similar-stats">
                    <div className="stat-pill">
                      <span className="stat-label">目前累計紀錄</span>
                      <strong className="stat-value">{similarRecordsInfo.count} 筆</strong>
                    </div>
                    <div className="stat-pill">
                      <span className="stat-label">最高單價</span>
                      <strong className="stat-value max-p">{similarRecordsInfo.maxPrice.toFixed(1)} 萬/坪</strong>
                    </div>
                    <div className="stat-pill">
                      <span className="stat-label">最低單價</span>
                      <strong className="stat-value min-p">{similarRecordsInfo.minPrice.toFixed(1)} 萬/坪</strong>
                    </div>
                  </div>
                  <div className="similar-list">
                    {similarRecordsInfo.list.length === 0 ? (
                      <div className="no-similar-text">周邊暫無其他相近成交案例。</div>
                    ) : (
                      similarRecordsInfo.list.map((sim) => (
                        <div className="similar-item" key={sim.id}>
                          <div className="sim-date-col">
                             <span className="sim-date">{sim.date || "115/05"}</span>
                             <span className="sim-badge">鄰近</span>
                          </div>
                          <div className="sim-address-col">
                             <span className="sim-address">{sim.address || sim.district}</span>
                             <span className="sim-meta">{sim.buildingType} · {sim.floor || "全"}層</span>
                          </div>
                          <div className="sim-price-col">
                             <strong className="sim-unit-price">{formatUnitPrice(sim.unitPrice, mode)}</strong>
                             <span className="sim-total-price">{formatTransactionPrice(sim.totalPrice, mode)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Remarks Section */}
                <div className="remarks-section">
                  <div className="section-title">備註</div>
                  <div className="remarks-content-box">
                    {detailRecord.remarks || "本次交易實價登錄平台無額外備註資訊。"}
                  </div>
                </div>

                {/* Sponsor Tags / Recommendations */}
                <div className="sponsor-section">
                  <div className="section-title">
                    入手這間房後，順手準備 <span className="sponsor-ad-tag">廣告</span>
                  </div>
                  <div className="sponsor-tags">
                    <span className="s-tag">🌪️ Dyson 吸塵器</span>
                    <span className="s-tag">🛍️ momo購物</span>
                    <span className="s-tag">📦 蝦皮購物</span>
                    <span className="s-tag">🏠 HOLA 和樂家居</span>
                    <span className="s-tag">🛋️ Ikea 宜家家居</span>
                    <span className="s-tag">🧹 掃地機器人</span>
                    <span className="s-tag">📺 智慧電視</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-modal-footer">
              <div className="detail-modal-footer-inner">
                <button 
                  className="confirm-close-btn" 
                  type="button" 
                  onClick={() => setDetailRecord(null)}
                >
                  確認並關閉
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
