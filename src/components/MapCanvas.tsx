import L from "leaflet";
import { Layers3, LocateFixed } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import { CITIES, CITY_DISTRICTS } from "../data/locations";
import {
  formatTransactionPrice,
  formatUnitPrice,
  type AssetMode,
} from "../data/transactions";
import type { Transaction } from "../types/real-estate";

type MapLayer = "default" | "satellite" | "landmark";

type MapCanvasProps = {
  cityName: string;
  district: string;
  mode: AssetMode;
  records: Transaction[];
  selectedRecord: Transaction | null;
  isGeocoding: boolean;
  geocodedCount: number;
  totalToGeocode: number;
  onSelectRecord: (record: Transaction) => void;
};

const TILE_LAYERS: Record<MapLayer, { url: string; attribution: string }> = {
  default: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
  },
  landmark: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
};

const markerIcon = L.divIcon({
  className: "real-map-marker",
  html: "<span></span>",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -14],
});

const toCoordinate = (value: string | number | undefined) => {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed !== 0
    ? parsed
    : null;
};

function MapBounds({ records }: { records: Transaction[] }) {
  const map = useMap();

  useEffect(() => {
    const coordinates = records.flatMap((record) => {
      const lat = toCoordinate(record.lat);
      const lng = toCoordinate(record.lng);
      return lat !== null && lng !== null ? [[lat, lng] as [number, number]] : [];
    });

    if (coordinates.length === 1) {
      map.setView(coordinates[0], 15, { animate: true });
    } else if (coordinates.length > 1) {
      map.fitBounds(L.latLngBounds(coordinates), {
        padding: [48, 48],
        maxZoom: 15,
        animate: true,
      });
    }
  }, [map, records]);

  return null;
}

export function MapCanvas({
  cityName,
  district,
  mode,
  records,
  selectedRecord,
  isGeocoding,
  geocodedCount,
  totalToGeocode,
  onSelectRecord,
}: MapCanvasProps) {
  const [layer, setLayer] = useState<MapLayer>("default");
  const city = CITIES.find((item) => item.name === cityName);
  const districtInfo = (CITY_DISTRICTS[cityName] ?? []).find((item) => item.name === district);
  const center: [number, number] = [
    districtInfo?.lat ?? city?.lat ?? 25.033,
    districtInfo?.lng ?? city?.lng ?? 121.5654,
  ];
  const geocodedRecords = useMemo(
    () => records.filter((record) =>
      toCoordinate(record.lat) !== null && toCoordinate(record.lng) !== null,
    ),
    [records],
  );
  const tile = TILE_LAYERS[layer];

  return (
    <section className="map-canvas" aria-label={`${cityName}${district}${mode}成交地圖`}>
      <MapContainer
        key={`${cityName}-${district}`}
        center={center}
        zoom={district === "全部" ? 12 : 14}
        zoomControl={false}
        className="leaflet-map"
      >
        <TileLayer url={tile.url} attribution={tile.attribution} />
        <MapBounds records={geocodedRecords} />
        {geocodedRecords.map((record) => {
          const lat = toCoordinate(record.lat)!;
          const lng = toCoordinate(record.lng)!;
          return (
            <Marker
              key={record.id}
              position={[lat, lng]}
              icon={markerIcon}
              eventHandlers={{ click: () => onSelectRecord(record) }}
            >
              <Popup>
                <button className="map-popup" type="button" onClick={() => onSelectRecord(record)}>
                  <strong>{record.address || record.district}</strong>
                  <span>{record.transactionType} · {record.date}</span>
                  <b>{formatTransactionPrice(record.totalPrice, mode)}</b>
                  <small>{formatUnitPrice(record.unitPrice, mode)}</small>
                </button>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="layer-control glass-surface" aria-label="地圖圖層">
        <Layers3 aria-hidden="true" size={16} />
        {(["default", "satellite", "landmark"] as const).map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={layer === value}
            className={layer === value ? "is-active" : ""}
            onClick={() => setLayer(value)}
          >
            {value === "default" ? "標準" : value === "satellite" ? "衛星" : "地標"}
          </button>
        ))}
      </div>

      {isGeocoding ? (
        <div className="geocoding-status glass-surface" role="status">
          <LocateFixed aria-hidden="true" size={16} />
          <span>地址定位 {geocodedCount}/{totalToGeocode}</span>
          <i style={{ "--progress": `${(geocodedCount / Math.max(totalToGeocode, 1)) * 100}%` } as React.CSSProperties} />
        </div>
      ) : geocodedRecords.length === 0 && records.length > 0 ? (
        <div className="geocoding-status glass-surface" role="status">
          <LocateFixed aria-hidden="true" size={16} />
          <span>目前資料沒有可顯示的精確座標</span>
        </div>
      ) : null}

      {selectedRecord ? (
        <div className="selected-map-record glass-surface" key={selectedRecord.id}>
          <span>{selectedRecord.transactionType}</span>
          <strong>{selectedRecord.address || selectedRecord.district}</strong>
          <small>{formatUnitPrice(selectedRecord.unitPrice, mode)}</small>
        </div>
      ) : null}
    </section>
  );
}
