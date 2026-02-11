# Specification

## Summary
**Goal:** Remove theme switching and enforce an always-on dark appearance across the app.

**Planned changes:**
- Remove the light/dark theme toggle control from the header and any other theme-switch UI elements.
- Make dark styling the default on every load, ignoring system theme preference and any previously stored theme value.
- Remove/retire client-side theme persistence and toggling logic so no runtime code attempts to switch themes or manage a stored theme.

**User-visible outcome:** The app always loads in dark styling with no option to switch to light mode, and there is no flash of light theme on load.
