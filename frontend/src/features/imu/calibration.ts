import { SensorData } from './useImuSensors';

export interface GyroCalibration {
  biasX: number;
  biasY: number;
  biasZ: number;
}

export interface MagCalibration {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

export interface AccelCalibration {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

// Default calibration constants
export const DEFAULT_GYRO_CALIBRATION: GyroCalibration = {
  biasX: 0,
  biasY: 0,
  biasZ: 0,
};

export const DEFAULT_MAG_CALIBRATION: MagCalibration = {
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
};

export const DEFAULT_ACCEL_CALIBRATION: AccelCalibration = {
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
};

/**
 * Calibrate gyroscope bias by averaging samples collected while device is stationary
 */
export function calibrateGyroBias(samples: SensorData[]): GyroCalibration {
  if (samples.length === 0) return DEFAULT_GYRO_CALIBRATION;

  let sumX = 0,
    sumY = 0,
    sumZ = 0;

  for (const sample of samples) {
    sumX += sample.x;
    sumY += sample.y;
    sumZ += sample.z;
  }

  return {
    biasX: sumX / samples.length,
    biasY: sumY / samples.length,
    biasZ: sumZ / samples.length,
  };
}

/**
 * Calibrate magnetometer using ellipsoid fitting for hard-iron and soft-iron correction
 */
export function calibrateMagnetometer(samples: SensorData[]): MagCalibration {
  if (samples.length < 10) return DEFAULT_MAG_CALIBRATION;

  // Find min/max for each axis
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (const sample of samples) {
    minX = Math.min(minX, sample.x);
    maxX = Math.max(maxX, sample.x);
    minY = Math.min(minY, sample.y);
    maxY = Math.max(maxY, sample.y);
    minZ = Math.min(minZ, sample.z);
    maxZ = Math.max(maxZ, sample.z);
  }

  // Calculate offsets (hard-iron correction)
  const offsetX = (maxX + minX) / 2;
  const offsetY = (maxY + minY) / 2;
  const offsetZ = (maxZ + minZ) / 2;

  // Calculate scales (soft-iron correction)
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const rangeZ = maxZ - minZ;
  const avgRange = (rangeX + rangeY + rangeZ) / 3;

  const scaleX = rangeX > 0 ? avgRange / rangeX : 1;
  const scaleY = rangeY > 0 ? avgRange / rangeY : 1;
  const scaleZ = rangeZ > 0 ? avgRange / rangeZ : 1;

  return {
    offsetX,
    offsetY,
    offsetZ,
    scaleX,
    scaleY,
    scaleZ,
  };
}

/**
 * Calibrate accelerometer using 6-point tumble calibration
 */
export function calibrateAccelerometer(samples: SensorData[]): AccelCalibration {
  if (samples.length < 10) return DEFAULT_ACCEL_CALIBRATION;

  // Find min/max for each axis
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (const sample of samples) {
    minX = Math.min(minX, sample.x);
    maxX = Math.max(maxX, sample.x);
    minY = Math.min(minY, sample.y);
    maxY = Math.max(maxY, sample.y);
    minZ = Math.min(minZ, sample.z);
    maxZ = Math.max(maxZ, sample.z);
  }

  // Calculate offsets
  const offsetX = (maxX + minX) / 2;
  const offsetY = (maxY + minY) / 2;
  const offsetZ = (maxZ + minZ) / 2;

  // Calculate scales (normalize to 1g = 9.81 m/s²)
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const rangeZ = maxZ - minZ;

  const scaleX = rangeX > 0 ? (2 * 9.81) / rangeX : 1;
  const scaleY = rangeY > 0 ? (2 * 9.81) / rangeY : 1;
  const scaleZ = rangeZ > 0 ? (2 * 9.81) / rangeZ : 1;

  return {
    offsetX,
    offsetY,
    offsetZ,
    scaleX,
    scaleY,
    scaleZ,
  };
}

/**
 * Apply gyroscope calibration to raw data
 */
export function applyGyroCalibration(data: SensorData, calibration: GyroCalibration): SensorData {
  return {
    x: data.x - calibration.biasX,
    y: data.y - calibration.biasY,
    z: data.z - calibration.biasZ,
    timestamp: data.timestamp,
  };
}

/**
 * Apply magnetometer calibration to raw data
 */
export function applyMagCalibration(data: SensorData, calibration: MagCalibration): SensorData {
  return {
    x: (data.x - calibration.offsetX) * calibration.scaleX,
    y: (data.y - calibration.offsetY) * calibration.scaleY,
    z: (data.z - calibration.offsetZ) * calibration.scaleZ,
    timestamp: data.timestamp,
  };
}

/**
 * Apply accelerometer calibration to raw data
 */
export function applyAccelCalibration(data: SensorData, calibration: AccelCalibration): SensorData {
  return {
    x: (data.x - calibration.offsetX) * calibration.scaleX,
    y: (data.y - calibration.offsetY) * calibration.scaleY,
    z: (data.z - calibration.offsetZ) * calibration.scaleZ,
    timestamp: data.timestamp,
  };
}
