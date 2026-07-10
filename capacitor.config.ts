import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "tw.realestate.explorer",
  appName: "實價登錄查詢",
  webDir: "dist",
  android: {
    allowMixedContent: false,
    backgroundColor: "#dce9e4",
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#dce9e4",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#dce9e4",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      androidSplashResourceName: "splash",
      iosSpinnerStyle: "small",
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#dce9e4",
      overlaysWebView: false,
    },
    Geolocation: {
      permissions: ["location"],
    },
  },
};

export default config;
