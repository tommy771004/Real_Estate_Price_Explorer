import { Building2, House, KeyRound, LandPlot } from "lucide-react";

import {
  ASSET_DEFINITIONS,
  ASSET_MODES,
  type AssetMode,
} from "../data/transactions";

const ICONS = {
  building: House,
  land: LandPlot,
  presale: Building2,
  rental: KeyRound,
} satisfies Record<AssetMode, typeof House>;

type AssetDockProps = {
  activeMode: AssetMode;
  onChange: (mode: AssetMode) => void;
};

export function AssetDock({ activeMode, onChange }: AssetDockProps) {
  return (
    <div className="asset-dock glass-surface" role="group" aria-label="交易類型">
      {ASSET_MODES.map((mode) => {
        const Icon = ICONS[mode];
        const isActive = mode === activeMode;
        return (
          <button
            className={`asset-tab ${isActive ? "is-active" : ""}`}
            key={mode}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(mode)}
          >
            <Icon aria-hidden="true" size={16} strokeWidth={2.2} />
            <span>{ASSET_DEFINITIONS[mode].label}</span>
          </button>
        );
      })}
    </div>
  );
}
