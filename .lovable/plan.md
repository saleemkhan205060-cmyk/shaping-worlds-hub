# Add Android push notifications (WhatsApp-style)

Goal: نیا میسج آنے پر آواز اور notification ظاہر ہو، چاہے ایپ پوری طرح بند ہو (Android APK)۔ آج کا realtime + browser Notification صرف اس وقت کام کرتا ہے جب ایپ کم از کم background میں running ہو۔ اصل حل Firebase Cloud Messaging (FCM) ہے، جو OS کے ذریعے بند ایپ کو بھی wake کر کے notification دکھاتا ہے۔

## High-level steps

1) **Database**: `push_tokens` table (user_id, token, platform, updated_at) with RLS.
2) **Mobile client**: install `@capacitor/push-notifications`، Android permission + registration code، token کو `push_tokens` میں upsert کرنا۔
3) **Android native**: `google-services.json` کے لیے place بنانا، Gradle میں Google Services plugin، اور `notification.mp3` کو `android/app/src/main/res/raw/notification.mp3` میں شامل کرنا تاکہ FCM payload میں `sound: "notification"` چلے۔
4) **Server (Edge Function)**: ایک Supabase Edge Function `send-message-push` بناؤں جو service-role کے ساتھ FCM HTTP v1 API کو call کرے۔ Payload میں title=sender name, body=message preview, channel با sound۔
5) **Trigger**: `messages` table پر AFTER INSERT trigger جو pg_net سے edge function کو POST کرے (asynchronous، insert کو block نہ کرے)۔
6) **Settings UI**: موجودہ chime toggle کے ساتھ "Push notifications" کا status دکھائیں (granted/denied) اور re-request کا button۔

## What you'll need to provide

- **`FCM_SERVICE_ACCOUNT_JSON`** — Firebase Console > Project settings > Service accounts > "Generate new private key" والی پوری JSON (سرور سے FCM HTTP v1 کو auth کے لیے)۔
- **`FCM_PROJECT_ID`** — Firebase project ID۔
- **`google-services.json`** — Firebase Console سے `com.viplife.app` Android app کے لیے، یہ آپ کو `android/app/google-services.json` میں ڈالنا ہوگا (یہ build secret/repo file ہے، code میں نہیں جاتی)۔

میں سب کچھ scaffold کر دوں گا اور صرف ان تینوں چیزوں کے آنے پر مکمل کام کرے گا۔

## Technical details

- Table:
  ```sql
  create table public.push_tokens(
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    token text not null,
    platform text not null check (platform in ('android','ios','web')),
    updated_at timestamptz not null default now(),
    unique(token)
  );
  ```
  RLS: user اپنے rows کو insert/update/delete کرسکے؛ service_role کو full access۔
- Edge function `send-message-push`:
  - Input: `{ message_id }`
  - Loads message + recipient tokens + sender profile via service-role.
  - Mints OAuth token from service account (jose JWT → Google OAuth) and POSTs to `https://fcm.googleapis.com/v1/projects/{FCM_PROJECT_ID}/messages:send` per token.
  - Removes invalid tokens (UNREGISTERED/INVALID_ARGUMENT).
- DB trigger uses `pg_net.http_post` to call the function URL with `Authorization: Bearer <SERVICE_ROLE>`.
- Android: `MainActivity` کو کچھ نہیں چاہیے؛ plugin خود FCM service register کرتا ہے۔ Custom sound کے لیے FCM payload میں `android.notification.sound = "notification"` (extension کے بغیر) اور `channel_id` set کریں؛ پہلی launch پر plugin سے channel create کریں۔
- Web/PWA: یہ pull request Android-focused ہے۔ Browser پر موجودہ realtime + Notification flow ویسا ہی رہے گا۔

## Out of scope (اس turn میں نہیں)

- iOS APNs (alag setup چاہیے).
- Group chats یا read receipts changes.

اگر آپ "go" کہیں تو میں DB migration + client/server code + Android Gradle changes بنا دوں گا، اور آخر میں آپ سے `FCM_SERVICE_ACCOUNT_JSON` + `FCM_PROJECT_ID` secrets اور `google-services.json` کی request کروں گا۔