package app.lovable.vip_life.twa;

import android.app.Activity;
import android.os.Build;
import android.view.View;
import android.view.ViewParent;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

/** One owner for native viewport sizing; never offsets the HTML composer itself. */
final class KeyboardInsets {
    private KeyboardInsets() {}

    static void install(Activity activity, WebView webView) {
        ViewParent parent = webView.getParent();
        if (!(parent instanceof View)) {
            return;
        }
        View container = (View) parent;
        Window window = activity.getWindow();
        boolean ownsInsets = KeyboardInsetPolicy.ownsInsets(Build.VERSION.SDK_INT);

        // SystemBars registers its parent listener during BridgeActivity.onCreate.
        // Replace that listener; adding a second keyboard plugin would resize twice.
        ViewCompat.setOnApplyWindowInsetsListener(container, (view, insets) -> {
            if (ownsInsets) {
                Insets safe = insets.getInsetsIgnoringVisibility(
                        WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
                Insets visible = insets.getInsets(
                        WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
                Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
                int bottom = KeyboardInsetPolicy.bottomPadding(
                        Build.VERSION.SDK_INT, visible.bottom, ime.bottom,
                        insets.isVisible(WindowInsetsCompat.Type.ime()));
                if (view.getPaddingLeft() != safe.left || view.getPaddingTop() != safe.top
                        || view.getPaddingRight() != safe.right || view.getPaddingBottom() != bottom) {
                    view.setPadding(safe.left, safe.top, safe.right, bottom);
                }
            } else if (view.getPaddingLeft() != 0 || view.getPaddingTop() != 0
                    || view.getPaddingRight() != 0 || view.getPaddingBottom() != 0) {
                view.setPadding(0, 0, 0, 0);
            }

            // Native layout has already accounted for system-bar regions. Keep
            // the real IME visibility for WebView's focus/input handling, and
            // suppress its geometry only when this listener owns keyboard sizing.
            // Legacy decor manages the keyboard, so preserve its IME dispatch.
            int safeTypes = WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout();
            WindowInsetsCompat.Builder remaining = new WindowInsetsCompat.Builder(insets)
                    .setInsets(safeTypes, Insets.NONE)
                    .setInsetsIgnoringVisibility(safeTypes, Insets.NONE);
            if (ownsInsets) {
                remaining.setInsets(WindowInsetsCompat.Type.ime(), Insets.NONE);
            }
            return remaining.build();
        });

        WindowCompat.setDecorFitsSystemWindows(window, !ownsInsets);
        int adjustment = ownsInsets
                ? WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING
                : WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE;
        // Preserve any existing keyboard visibility/state flags.
        int current = window.getAttributes().softInputMode;
        window.setSoftInputMode((current & ~WindowManager.LayoutParams.SOFT_INPUT_MASK_ADJUST) | adjustment);
        ViewCompat.requestApplyInsets(container);
    }
}