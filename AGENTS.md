# Native Android layout

- Keep keyboard/system-bar sizing owned by `KeyboardInsets`: Android 11+ uses explicit native insets, older Android uses decor `adjustResize`, and the Capacitor parent listener is replaced rather than stacked; this prevents duplicate keyboard space without changing shared web messaging code.