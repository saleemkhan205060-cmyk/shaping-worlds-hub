package app.lovable.vip_life.twa;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Opens OAuth in the user's default browser without relying on Custom Tabs.
 * Some Android builds have no usable Custom Tabs provider; the stock Browser
 * plugin can then terminate its controller activity while the app is pausing.
 */
@CapacitorPlugin(name = "SafeBrowser")
public class SafeBrowserPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isBlank()) {
            call.reject("A URL is required");
            return;
        }

        Uri uri;
        try {
            uri = Uri.parse(url);
        } catch (RuntimeException error) {
            call.reject("Invalid URL", error);
            return;
        }

        String scheme = uri.getScheme();
        if (!("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme))) {
            call.reject("Only HTTP and HTTPS URLs can be opened");
            return;
        }

        Intent browserIntent = new Intent(Intent.ACTION_VIEW, uri);
        browserIntent.addCategory(Intent.CATEGORY_BROWSABLE);

        try {
            getActivity().startActivity(browserIntent);
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (ActivityNotFoundException error) {
            call.reject("No web browser is installed", error);
        } catch (RuntimeException error) {
            call.reject("Unable to open the web browser", error);
        }
    }
}