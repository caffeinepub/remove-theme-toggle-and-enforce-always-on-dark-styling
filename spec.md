# Specification

## Summary
**Goal:** Add a magnetometer calibration workflow to the IMU dashboard and apply an always-on dark theme across the app.

**Planned changes:**
- Add a dedicated Magnetometer calibration section in the Calibration tab with start, progress indication, and cancel controls.
- Display computed magnetometer calibration parameters (offsets and scales) when calibration completes, with a UI action to reset back to defaults (offsets=0, scales=1).
- Ensure calibrated magnetometer values are used consistently anywhere magnetometer data is displayed and anywhere magnetometer data is used for MARG/orientation updates when available.
- Detect and communicate when the magnetometer is unavailable, disabling magnetometer calibration actions accordingly.
- Apply an always-on dark theme layout across the app (no theme toggle), updating app shell surfaces and major components to consistently use dark theme styling.

**User-visible outcome:** Users can calibrate the magnetometer from the Calibration tab (or reset it), see the resulting offsets/scales, and the app will display and use calibrated magnetometer data for orientation when available; the entire UI renders in a consistent dark theme on every load.
