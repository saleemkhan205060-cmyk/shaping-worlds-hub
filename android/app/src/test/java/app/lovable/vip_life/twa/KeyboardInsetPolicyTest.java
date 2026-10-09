package app.lovable.vip_life.twa;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class KeyboardInsetPolicyTest {
    @Test
    public void modernAndroidHasOneExplicitInsetOwner() {
        assertTrue(KeyboardInsetPolicy.ownsInsets(30));
        assertTrue(KeyboardInsetPolicy.ownsInsets(36));
        assertFalse(KeyboardInsetPolicy.ownsInsets(29));
    }

    @Test
    public void dockedKeyboardDoesNotAddNavigationBarTwice() {
        assertEquals(320, KeyboardInsetPolicy.bottomPadding(30, 48, 320, true));
        assertEquals(500, KeyboardInsetPolicy.bottomPadding(36, 24, 500, true));
    }

    @Test
    public void keyboardHideRestoresOnlySystemBarSpace() {
        assertEquals(48, KeyboardInsetPolicy.bottomPadding(35, 48, 320, false));
    }

    @Test
    public void floatingKeyboardDoesNotReserveDockedKeyboardSpace() {
        assertEquals(24, KeyboardInsetPolicy.bottomPadding(34, 24, 0, true));
    }

    @Test
    public void legacyAndroidNeverAddsPaddingAfterPlatformResize() {
        for (int sdk = 24; sdk <= 29; sdk++) {
            assertEquals(0, KeyboardInsetPolicy.bottomPadding(sdk, 48, 320, true));
            assertEquals(0, KeyboardInsetPolicy.bottomPadding(sdk, 48, 0, false));
        }
    }

    @Test
    public void insetCalculationNeverCreatesNegativeSpace() {
        assertEquals(0, KeyboardInsetPolicy.bottomPadding(30, -1, -1, true));
    }
}