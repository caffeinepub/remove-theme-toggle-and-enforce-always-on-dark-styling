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

export function calibrateGyroBias(samples: SensorData[]): GyroCalibration {
  if (samples.length === 0) {
    return { biasX: 0, biasY: 0, biasZ: 0 };
  }

  const sumX = samples.reduce((sum, s) => sum + s.x, 0);
  const sumY = samples.reduce((sum, s) => sum + s.y, 0);
  const sumZ = samples.reduce((sum, s) => sum + s.z, 0);

  return {
    biasX: sumX / samples.length,
    biasY: sumY / samples.length,
    biasZ: sumZ / samples.length,
  };
}

export function calibrateMagnetometer(samples: SensorData[]): MagCalibration {
  if (samples.length === 0) {
    return { offsetX: 0, offsetY: 0, offsetZ: 0, scaleX: 1, scaleY: 1, scaleZ: 1 };
  }

  const xValues = samples.map((s) => s.x);
  const yValues = samples.map((s) => s.y);
  const zValues = samples.map((s) => s.z);

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const minZ = Math.min(...zValues);
  const maxZ = Math.max(...zValues);

  const offsetX = (minX + maxX) / 2;
  const offsetY = (minY + maxY) / 2;
  const offsetZ = (minZ + maxZ) / 2;

  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const rangeZ = maxZ - minZ;

  const avgRange = (rangeX + rangeY + rangeZ) / 3;

  return {
    offsetX,
    offsetY,
    offsetZ,
    scaleX: rangeX > 0 ? avgRange / rangeX : 1,
    scaleY: rangeY > 0 ? avgRange / rangeY : 1,
    scaleZ: rangeZ > 0 ? avgRange / rangeZ : 1,
  };
}

export function calibrateAccelerometer(samples: SensorData[]): AccelCalibration {
  if (samples.length === 0) {
    return { offsetX: 0, offsetY: 0, offsetZ: 0, scaleX: 1, scaleY: 1, scaleZ: 1 };
  }

  const xValues = samples.map((s) => s.x);
  const yValues = samples.map((s) => s.y);
  const zValues = samples.map((s) => s.z);

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const minZ = Math.min(...zValues);
  const maxZ = Math.max(...zValues);

  const offsetX = (minX + maxX) / 2;
  const offsetY = (minY + maxY) / 2;
  const offsetZ = (minZ + maxZ) / 2;

  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const rangeZ = maxZ - minZ;

  // Expected range for accelerometer is ~2g (±1g around each axis when rotated)
  const expectedRange = 2 * 9.81;

  return {
    offsetX,
    offsetY,
    offsetZ,
    scaleX: rangeX > 0 ? expectedRange / rangeX : 1,
    scaleY: rangeY > 0 ? expectedRange / rangeY : 1,
    scaleZ: rangeZ > 0 ? expectedRange / rangeZ : 1,
  };
}

export function applyGyroCalibration(data: SensorData, calibration: GyroCalibration): SensorData {
  return {
    x: data.x - calibration.biasX,
    y: data.y - calibration.biasY,
    z: data.z - calibration.biasZ,
    timestamp: data.timestamp,
  };
}

export function applyMagCalibration(data: SensorData, calibration: MagCalibration): SensorData {
  return {
    x: (data.x - calibration.offsetX) * calibration.scaleX,
    y: (data.y - calibration.offsetY) * calibration.scaleY,
    z: (data.z - calibration.offsetZ) * calibration.scaleZ,
    timestamp: data.timestamp,
  };
}

export function applyAccelCalibration(data: SensorData, calibration: AccelCalibration): SensorData {
  return {
    x: (data.x - calibration.offsetX) * calibration.scaleX,
    y: (data.y - calibration.offsetY) * calibration.scaleY,
    z: (data.z - calibration.offsetZ) * calibration.scaleZ,
    timestamp: data.timestamp,
  };
}
