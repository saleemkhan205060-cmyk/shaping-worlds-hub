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
            if (apps instanceof java.util.List && !((java.util.List<?>) apps).isEmpty()) {
                return true;
            }
            Object app = firebaseApp
                .getMethod("initializeApp", android.content.Context.class)
                .invoke(null, context.getApplicationContext());
            return app != null;
        } catch (Throwable error) {
            return false;
        }
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", ensureFirebase(getContext()));
        call.resolve(result);
    }
}
