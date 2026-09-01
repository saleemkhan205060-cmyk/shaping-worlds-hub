import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.vip_life.twa",
  appName: "VIP Life",
  webDir: "dist-capacitor",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    // Keep stock one-tap WebView focus, but use Capacitor's alternate Android
    // InputConnection. Some Android WebView/IME combinations open the keyboard
    // while dropping committed text through Chromium's normal connection.
    android: {
    buildOptions: {
    keystorePath: "android/app/release-key.jks",
    keystoreAlias: "vip-life",
   },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 500,
      backgroundColor: "#FFFFFF",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
  },
};

export default config;
