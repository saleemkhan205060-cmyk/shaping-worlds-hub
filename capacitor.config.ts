import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.vip_life.twa",
  appName: "VIP Life",
  webDir: "dist-capacitor",
  bundledWebRuntime: false,
  // IMPORTANT: no `server.url` — the app must load the bundled SPA
  // from dist-capacitor. Setting `server.url` makes the WebView load a
  // remote site instead, which is what caused the "This page didn't load"
  // error in a previous build.
  server: {
    androidScheme: "https",
    hostname: "localhost",
    cleartext: false,
    // OAuth needs to reach Google + the Lovable auth broker from the WebView.
    allowNavigation: [
      "accounts.google.com",
      "*.google.com",
      "oauth.lovable.app",
      "*.lovable.app",
      "viplifes.com",
      "*.viplifes.com",
      "*.supabase.co",
    ],
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
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
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
    },
  },
};

export default config;
