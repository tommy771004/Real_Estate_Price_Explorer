import L from "leaflet";
import { Layers3, LocateFixed } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";

import { CITIES, CITY_DISTRICTS } from "../data/locations";
import {
  formatTransactionPrice,
  formatUnitPrice,
  type AssetMode,
} from "../data/transactions";
import {
  buildDistrictMapCoordinates,
  isPlausibleCoordinateForCity,
  toMapCoordinate,
} from "../lib/mapLocation";
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
  onSelectDistrict?: (district: string) => void;
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

const getMarkerIcon = (isSelected: boolean) => {
  return L.divIcon({
    className: `real-map-marker ${isSelected ? "is-selected" : ""}`,
    html: `
      <span class="marker-dot"></span>
      <span class="marker-ripple"></span>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -14],
  });
};

const getDistrictLabelIcon = (name: string, count: number) => {
  return L.divIcon({
    className: "district-map-label",
    html: `
      <div class="district-badge-content">
        <span class="district-badge-name">${name}</span>
        ${count > 0 ? `<span class="district-badge-count">${count}筆</span>` : ""}
      </div>
    `,
    iconSize: [80, 36],
    iconAnchor: [40, 18],
  });
};

function MapBounds({ records, resetTrigger }: { records: Transaction[], resetTrigger: number }) {
  const map = useMap();

  useEffect(() => {
    const coordinates = records.flatMap((record) => {
      const lat = toMapCoordinate(record.lat);
      const lng = toMapCoordinate(record.lng);
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
  }, [map, records, resetTrigger]);

  return null;
}

function SelectedRecordFocus({ record }: { record: Transaction | null }) {
  const map = useMap();

  useEffect(() => {
    const lat = toMapCoordinate(record?.lat);
    const lng = toMapCoordinate(record?.lng);
    if (lat === null || lng === null) return;
    map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true });
  }, [map, record?.id, record?.lat, record?.lng]);

  return null;
}

function MapZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

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
  onSelectDistrict,
}: MapCanvasProps) {
  const [layer, setLayer] = useState<MapLayer>("default");
  const [is3D, setIs3D] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [currentZoom, setCurrentZoom] = useState(district === "全部" ? 12 : 14);

  const city = CITIES.find((item) => item.name === cityName);
  const districtInfo = (CITY_DISTRICTS[cityName] ?? []).find((item) => item.name === district);
  const center: [number, number] = [
    districtInfo?.lat ?? city?.lat ?? 25.033,
    districtInfo?.lng ?? city?.lng ?? 121.5654,
  ];

  const geocodedRecords = useMemo(
    () => records.filter((record) => {
      const lat = toMapCoordinate(record.lat);
      const lng = toMapCoordinate(record.lng);
      return lat !== null && lng !== null && isPlausibleCoordinateForCity(lat, lng, cityName);
    }),
    [cityName, records],
  );

  const districtRecordCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach((r) => {
      if (r.district) {
        counts[r.district] = (counts[r.district] || 0) + 1;
      }
    });
    return counts;
  }, [records]);

  const computedDistrictCoords = useMemo(() => {
    const districts = CITY_DISTRICTS[cityName] ?? [];
    return buildDistrictMapCoordinates(districts, records);
  }, [cityName, records]);

  const tile = TILE_LAYERS[layer];

  return (
    <section className={`map-canvas ${is3D ? "is-3d" : ""}`} aria-label={`${cityName}${district}${mode}成交地圖`}>
      <MapContainer
        key={`${cityName}-${district}`}
        center={center}
        zoom={district === "全部" ? 12 : 14}
        zoomControl={false}
        className="leaflet-map"
      >
        <TileLayer url={tile.url} attribution={tile.attribution} />
        <MapZoomTracker onZoomChange={setCurrentZoom} />
        <MapBounds records={geocodedRecords} resetTrigger={resetTrigger} />
        <SelectedRecordFocus record={selectedRecord} />

        {/* Dynamic District Name Labels & Boundary Circles when zoomed out */}
        {currentZoom <= 13 && (CITY_DISTRICTS[cityName] ?? []).map((d) => {
          const coords = computedDistrictCoords[d.name];
          if (!coords) return null;
          const count = districtRecordCounts[d.name] ?? 0;
          const radius = 1000 + Math.min(count * 50, 1500);
          return (
            <Circle
              key={`circle-${d.name}`}
              center={[coords.lat, coords.lng]}
              radius={radius}
              pathOptions={{
                fillColor: "#ef6c52",
                fillOpacity: 0.08,
                color: "#ef6c52",
                weight: 1.5,
                dashArray: "4 6",
              }}
              eventHandlers={{
                click: () => onSelectDistrict?.(d.name),
              }}
            />
          );
        })}

        {currentZoom <= 13 && (CITY_DISTRICTS[cityName] ?? []).map((d) => {
          const coords = computedDistrictCoords[d.name];
          if (!coords) return null;
          const count = districtRecordCounts[d.name] ?? 0;
          return (
            <Marker
              key={`marker-lbl-${d.name}`}
              position={[coords.lat, coords.lng]}
              icon={getDistrictLabelIcon(d.name, count)}
              eventHandlers={{
                click: () => onSelectDistrict?.(d.name),
              }}
            />
          );
        })}

        <>
          {geocodedRecords.map((record) => {
            const lat = toMapCoordinate(record.lat)!;
            const lng = toMapCoordinate(record.lng)!;
            return (
              <Marker
                key={record.id}
                position={[lat, lng]}
                icon={getMarkerIcon(selectedRecord?.id === record.id)}
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
        </>
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
        <div style={{ width: 16, height: 1, background: "rgba(0,0,0,0.1)", margin: "4px 0" }} />
        <button type="button" onClick={() => setResetTrigger(v => v + 1)}>重置</button>
        <button type="button" className={is3D ? "is-active" : ""} onClick={() => setIs3D(!is3D)}>3D</button>
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
