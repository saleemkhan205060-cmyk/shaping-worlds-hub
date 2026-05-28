# VIP Life — Android Capacitor Build Setup

This guide covers how to build the VIP Life app as an Android App Bundle (AAB) for Google Play Console publishing using Capacitor.

---

## What Was Set Up

- **Capacitor** — wraps the web app in a native Android WebView
- **Android platform** — native project under `android/`
- **Static SPA build** — `capacitor/vite.config.ts` builds a standalone client-side app
- **Release signing** — configured in `android/app/build.gradle` with `keystore.properties`

---

## Quick Build (AAB)

### 1. Build web assets + sync to Android

```bash
bun run android:bundle
```

This single command:
1. Builds the static SPA to `dist-capacitor/`
2. Syncs web assets into the Android project
3. Compiles the release AAB to `android/app/build/outputs/bundle/release/`

### 2. Find your AAB

```
android/app/build/outputs/bundle/release/app-release.aab
```

Upload this file to **Google Play Console**.

---

## First-Time Setup (Release Signing)

Before publishing to Google Play, you **must** create a signing keystore.

### Step 1: Generate a release keystore

```bash
cd android/app
keytool -genkey -v \
  -keystore release-key.jks \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -alias vip-life
```

Follow the prompts to set:
- **Keystore password**
- **Key password** (can be same as keystore password)
- Your name, organization, etc.

> **Keep `release-key.jks` safe.** If you lose it, you cannot update your app on Google Play.

### Step 2: Create keystore.properties

```bash
cd android
cp keystore.properties.template keystore.properties
```

Edit `android/keystore.properties` with your actual passwords:

```properties
VIP_LIFE_STORE_FILE=release-key.jks
VIP_LIFE_STORE_PASSWORD=your_actual_store_password
VIP_LIFE_KEY_ALIAS=vip-life
VIP_LIFE_KEY_PASSWORD=your_actual_key_password
```

> `keystore.properties` is already in `.gitignore` — do not commit it.

### Step 3: Build

```bash
bun run android:bundle
```

---

## Development Workflow

### Live reload on Android device / emulator

1. **Start the dev server:**
   ```bash
   bun run dev
   ```

2. **In another terminal, run:**
   ```bash
   npx cap run android --livereload --external
   ```

### Manual steps (instead of `android:bundle`)

```bash
# 1. Build static SPA
bun run build:capacitor

# 2. Sync assets to Android
npx cap sync android

# 3. Open Android Studio (optional)
npx cap open android

# 4. Build APK for testing
npx cap build android

# 5. Build release AAB
# (cd android && ./gradlew bundleRelease)
```

---

## Project Structure

| Path | Purpose |
|------|---------|
| `capacitor/vite.config.ts` | Vite config for static mobile build |
| `src/capacitor-entry.tsx` | Client-only entry point for the mobile app |
| `capacitor.config.ts` | Capacitor settings (app ID, name, webDir) |
| `android/` | Native Android project (auto-generated) |
| `android/app/build.gradle` | Android build config with release signing |
| `android/keystore.properties.template` | Template for signing credentials |

---

## Updating the App

Before each release:

1. **Bump the version** in `android/app/build.gradle`:
   ```gradle
   versionCode 2       // Increment by 1 each release
   versionName "1.0.1" // Human-readable version
   ```

2. **Build & upload** the new AAB.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `JAVA_HOME not set` | Install JDK 17+ and set `JAVA_HOME` |
| `gradlew permission denied` | Run `chmod +x android/gradlew` |
| Keystore not found | Ensure `release-key.jks` is in `android/app/` and `keystore.properties` exists |
| Build fails with CSS warning | This is a non-fatal warning about `@import` order — safe to ignore |
| App shows blank screen | Check `dist-capacitor/index.html` exists after `build:capacitor` |
| Server functions not working | This app uses direct Supabase client calls — no server functions needed |

---

## Requirements

- **Node.js** 20+ (or Bun)
- **JDK** 17 or 21
- **Android SDK** with API 36 (installed via Android Studio)
- **Android Studio** (for emulator / advanced debugging)

---

## Google Play Checklist

- [ ] Create a Google Play Developer account ($25 one-time fee)
- [ ] Generate and secure your `release-key.jks`
- [ ] Fill in `keystore.properties`
- [ ] Set `versionCode` and `versionName` in `android/app/build.gradle`
- [ ] Run `bun run android:bundle`
- [ ] Upload `app-release.aab` to Google Play Console
- [ ] Complete app listing (screenshots, description, privacy policy)
