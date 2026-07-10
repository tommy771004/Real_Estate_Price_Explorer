/**
 * 統一 geolocation 入口。
 * - 在 Capacitor 原生環境使用 @capacitor/geolocation。
 * - 網頁環境 fallback 到 navigator.geolocation + IP geo。
 * 回傳結構刻意相容於原 App.tsx 的 userLocation state，方便 1:1 體驗。
 */
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";

export type ResolvedLocation = {
  latitude: number;
  longitude: number;
  county: string | null;
  district: string | null;
  method: "gps" | "manual" | "unknown";
};

export async function getCurrentPositionOnce(): Promise<
  | { latitude: number; longitude: number; native: true }
  | { latitude: number; longitude: number; native: false }
  | null
> {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await Geolocation.requestPermissions({ permissions: ["location"] });
      if (perm.location !== "granted") return null;
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8000,
      });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        native: true,
      };
    } catch {
      return null;
    }
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, native: false }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 },
    );
  });
}

export async function getIpLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const res = await fetch("https://get.geojs.io/v1/ip/geo.json");
    const data = await res.json();
    if (data && data.latitude && data.longitude) {
      return {
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
      };
    }
  } catch {
    // ignore
  }
  return null;
}
