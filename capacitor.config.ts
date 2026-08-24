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
    // Let tapped HTML controls acquire focus directly. Capacitor's default
    // initial WebView focus can leave the container holding the IME connection.
    initialFocus: false,
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
