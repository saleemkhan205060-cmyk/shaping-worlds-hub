package app.lovable.vip_life.twa;

import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;

import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {
    // Required by @capgo/capacitor-social-login so Google sign-in may request
    // scopes (email/profile). Without it the plugin rejects with
    // "You CANNOT use scopes without modifying the main activity."
    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN
            && requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
            PluginHandle handle = getBridge().getPlugin("SocialLogin");
            if (handle == null) {
                Log.i("Google Activity Result", "SocialLogin plugin handle is null");
                return;
            }
            Plugin plugin = handle.getInstance();
            if (!(plugin instanceof SocialLoginPlugin)) {
                Log.i("Google Activity Result", "Plugin is not SocialLoginPlugin");
                return;
            }
            ((SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(SafeBrowserPlugin.class);
        registerPlugin(PushSupportPlugin.class);
        // Initialize Firebase (when google-services.json is present) BEFORE any
        // push code can reach FirebaseMessaging.getInstance().
       // PushSupportPlugin.ensureFirebase(this);
        // Touch FirebaseAnalytics once so the GA4 Android stream actually starts
        // collecting sessions/events in release builds.
       // startAnalytics();
        super.onCreate(savedInstanceState);

        applyCleanFullscreen();

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.setBackgroundColor(Color.WHITE);
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);
        }
    }

    // NOTE: system-bar styling is applied once in onCreate(). Re-applying it in
    // onWindowFocusChanged() re-ran setSystemUiVisibility()/insets every time the
    // soft keyboard took or gave up window focus, which produced a relayout loop
    // in the WebView — tapping a text field looked like the whole app froze.



    /** Best-effort: never crash the app if analytics is unavailable. */
    private void startAnalytics() {
        try {
            Class<?> analytics = Class.forName("com.google.firebase.analytics.FirebaseAnalytics");
            Object instance = analytics
                .getMethod("getInstance", android.content.Context.class)
                .invoke(null, getApplicationContext());
            if (instance != null) {
                analytics
                    .getMethod("setAnalyticsCollectionEnabled", boolean.class)
                    .invoke(instance, true);
            }
        } catch (Throwable error) {
            Log.i("Analytics", "Firebase Analytics unavailable: " + error);
        }
    }



    private void applyCleanFullscreen() {
        Window window = getWindow();
        window.setStatusBarColor(Color.WHITE);
        window.setNavigationBarColor(Color.WHITE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(true);
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                controller.setSystemBarsAppearance(
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                );
            }
        }

        // Keep this identical to the device-tested Debug APK. On the affected
        // WebView/device combination these stable light-bar flags coexist with
        // adjustResize without freezing text input.
        window.getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        );
    }
}
