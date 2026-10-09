package app.lovable.vip_life.twa;

/** Pure inset decisions, kept independent of Android so they can be unit tested. */
final class KeyboardInsetPolicy {
    private KeyboardInsetPolicy() {}

    static boolean ownsInsets(int sdkVersion) {
        return sdkVersion >= 30;
    }

    static int bottomPadding(int sdkVersion, int systemBottom, int imeBottom, boolean imeVisible) {
        // Legacy decor already removes keyboard/system-bar space via adjustResize.
        if (!ownsInsets(sdkVersion)) {
            return 0;
        }
        int safeBottom = Math.max(0, systemBottom);
        return imeVisible ? Math.max(safeBottom, Math.max(0, imeBottom)) : safeBottom;
    }
}