import { ArrowUpRight, Bookmark, Scale } from "lucide-react";
import type { CSSProperties } from "react";

import {
  formatTransactionPrice,
  formatUnitPrice,
  type AssetMode,
} from "../data/transactions";
import type { Transaction } from "../types/real-estate";

export type WorkspaceView = "map" | "list" | "trend" | "compare";

type ResultWorkspaceProps = {
  mode: AssetMode;
  records: Transaction[];
  selectedRecord: Transaction | null;
  view: WorkspaceView;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectRecord: (record: Transaction) => void;
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
  selectedRecord,
  view,
  loading,
  error,
  onRetry,
  onSelectRecord,
}: ResultWorkspaceProps) {
  const trendValues = records.slice(0, 8).map((record) => Number(record.unitPrice) || 0);
  const maxTrend = Math.max(...trendValues, 1);

  return (
    <section className={`result-workspace glass-surface view-${view}`} aria-live="polite">
      <div className="sheet-handle" />
      <div className="result-header">
        <div>
          <h2>{loading ? "正在取得官方資料" : `${records.length.toLocaleString("zh-TW")} 筆成交`}</h2>
          <p>內政部實價登錄公開資料</p>
        </div>
        <div className="result-actions">
          <button className="icon-button" type="button" aria-label="收藏目前查詢">
            <Bookmark aria-hidden="true" size={17} />
          </button>
          <button className="icon-button" type="button" aria-label="加入比較">
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
      ) : records.length === 0 ? (
        <div className="result-message">
          <strong>目前條件沒有成交紀錄</strong>
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
        </div>
      ) : view === "compare" ? (
        <div className="compare-view">
          {records.slice(0, 3).map((record, index) => (
            <div className="compare-column" key={record.id}>
              <span>案例 {index + 1}</span>
              <strong>{record.address || record.district}</strong>
              <b>{formatUnitPrice(record.unitPrice, mode)}</b>
              <small>{record.transactionType} · {record.date}</small>
            </div>
          ))}
        </div>
      ) : (
        <div className={`records ${view === "list" ? "is-list" : ""}`}>
          {records.slice(0, view === "list" ? 20 : 6).map((record) => (
            <RecordRow
              key={record.id}
              mode={mode}
              record={record}
              selected={selectedRecord?.id === record.id}
              onSelect={() => onSelectRecord(record)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
