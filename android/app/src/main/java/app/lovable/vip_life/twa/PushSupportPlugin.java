package app.lovable.vip_life.twa;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Reports whether Firebase is actually initialized in this build.
 *
 * Without a valid google-services.json the Google Services plugin never runs,
 * FirebaseApp has no default instance, and calling
 * PushNotifications.register() crashes the app with
 * java.lang.IllegalStateException from FirebaseApp.getInstance().
 * The web layer must ask this plugin before registering.
 */
@CapacitorPlugin(name = "PushSupport")
public class PushSupportPlugin extends Plugin {

    /** Best-effort initialization; safe to call repeatedly. */
    static boolean ensureFirebase(android.content.Context context) {
        try {
            Class<?> firebaseApp = Class.forName("com.google.firebase.FirebaseApp");
            Object apps = firebaseApp
                .getMethod("getApps", android.content.Context.class)
                .invoke(null, context.getApplicationContext());
            boolean hasApp = apps instanceof java.util.List && !((java.util.List<?>) apps).isEmpty();
            if (!hasApp) {
                Object app = firebaseApp
                    .getMethod("initializeApp", android.content.Context.class)
                    .invoke(null, context.getApplicationContext());
                hasApp = app != null;
            }
            if (!hasApp) {
                return false;
            }
            // FirebaseApp alone is not enough: PushNotificationsPlugin.register()
            // goes straight to FirebaseMessaging.getInstance(), which throws
            // IllegalStateException when messaging cannot resolve a default app.
            Class<?> messaging = Class.forName("com.google.firebase.messaging.FirebaseMessaging");
            return messaging.getMethod("getInstance").invoke(null) != null;
        } catch (Throwable error) {
            return false;
        }
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        boolean available;
        try {
            available = ensureFirebase(getContext());
        } catch (Throwable error) {
            available = false;
        }
        result.put("available", available);
        call.resolve(result);
    }

}
