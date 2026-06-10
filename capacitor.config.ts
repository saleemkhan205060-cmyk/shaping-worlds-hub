import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.viplife.app",
  appName: "VIP Life",
  webDir: "dist-capacitor",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
    cleartext: false,
  },
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
