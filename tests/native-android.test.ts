import { expect, test } from "bun:test";
import { isAndroidNativeShell } from "../src/lib/native-plugins";

/** Runs `fn` with `window` replaced, restoring the original afterwards. */
function withWindow(value: unknown, fn: () => boolean): boolean {
  const g = globalThis as { window?: unknown };
  const had = "window" in g;
  const previous = g.window;
  g.window = value;
  try {
    return fn();
  } finally {
    if (had) g.window = previous;
    else delete g.window;
  }
}

const android = {
  Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" },
};
const ios = {
  Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" },
};
const web = {
  Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" },
};

test("Android profile-button layout is off in a plain browser build", () => {
  expect(withWindow({}, () => isAndroidNativeShell())).toBe(false);
  expect(withWindow(web, () => isAndroidNativeShell())).toBe(false);
});

test("Android profile-button layout is on only in the installed Android shell", () => {
  expect(withWindow(android, () => isAndroidNativeShell())).toBe(true);
});

test("Android profile-button layout is off in the iOS shell", () => {
  expect(withWindow(ios, () => isAndroidNativeShell())).toBe(false);
});
