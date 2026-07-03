import { ArrowUpRight, Bookmark, ChevronUp, Heart, Scale } from "lucide-react";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

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
import type { Transaction } from "../types/real-estate";

export type WorkspaceView = "map" | "list" | "trend" | "compare";

type ResultWorkspaceProps = {
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
};

function RecordRow({
  mode,
  record,
  selected,
  onSelect,
}: {
  mode: AssetMode;
  record: Transaction;
  selected: boolean;
  onSelect: () => void;
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
      <ArrowUpRight aria-hidden="true" size={15} />
    </button>
  );
}

export function ResultWorkspace({
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

  return (
    <section className={`result-workspace glass-surface view-${view} ${isCollapsed ? "is-collapsed" : ""}`} aria-live="polite">
      <button className="sheet-handle" type="button" aria-label={isCollapsed ? "展開結果" : "收合結果"} onClick={() => setIsCollapsed(!isCollapsed)} />
      <div className="result-header" onClick={() => setIsCollapsed(!isCollapsed)} style={{ cursor: "pointer" }}>
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
              setIsCollapsed(!isCollapsed);
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
    </section>
  );
}
