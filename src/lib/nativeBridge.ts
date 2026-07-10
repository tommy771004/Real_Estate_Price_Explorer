/**
 * 偵測是否為 Capacitor 原生 App 並提供 native bridge helper。
 * 在純 web 環境會自動 no-op，避免影響 Vercel 部署。
 */
import { Capacitor } from "@capacitor/core";

export const isNativeApp = (): boolean =>
  typeof Capacitor !== "undefined" && Capacitor.isNativePlatform();

export const nativePlatform = (): "ios" | "android" | "web" =>
  (Capacitor.getPlatform() as "ios" | "android" | "web") ?? "web";
