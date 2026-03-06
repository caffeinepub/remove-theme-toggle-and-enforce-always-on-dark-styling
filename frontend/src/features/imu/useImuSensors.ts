import { useState, useEffect, useCallback, useRef } from 'react';

export type SensorStatus = 'idle' | 'requesting-permission' | 'streaming' | 'error';

export interface SensorData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface SensorState {
  available: boolean;
  error?: string;
  data: SensorData | null;
  sampleRate: number;
}

export interface ImuSensorsState {
  accelerometer: SensorState;
  gyroscope: SensorState;
  magnetometer: SensorState;
  status: SensorStatus;
  globalError?: string;
}

const SAMPLE_RATE_WINDOW = 10;

export function useImuSensors() {
  const [state, setState] = useState<ImuSensorsState>({
    accelerometer: { available: false, data: null, sampleRate: 0 },
    gyroscope: { available: false, data: null, sampleRate: 0 },
    magnetometer: { available: false, data: null, sampleRate: 0 },
    status: 'idle',
  });

  const accelTimestamps = useRef<number[]>([]);
  const gyroTimestamps = useRef<number[]>([]);
  const magTimestamps = useRef<number[]>([]);
  const listenersRef = useRef<(() => void)[]>([]);

  const calculateSampleRate = (timestamps: number[]): number => {
    if (timestamps.length < 2) return 0;
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return avgInterval > 0 ? 1000 / avgInterval : 0;
  };

  const updateTimestamps = (arr: number[], timestamp: number) => {
    arr.push(timestamp);
    if (arr.length > SAMPLE_RATE_WINDOW) {
      arr.shift();
    }
  };

  const start = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'requesting-permission' }));

    try {
      // Check if we need permission (iOS 13+)
      if (typeof DeviceMotionEvent !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission !== 'granted') {
          setState((prev) => ({
            ...prev,
            status: 'error',
            globalError: 'Motion sensor permission denied',
          }));
          return;
        }
      }

      // Try Generic Sensor API first (Chrome Android)
      let accelSensor: any = null;
      let gyroSensor: any = null;
      let magSensor: any = null;

      const cleanupFunctions: (() => void)[] = [];

      if ('Accelerometer' in window) {
        try {
          accelSensor = new (window as any).Accelerometer({ frequency: 60 });
          accelSensor.addEventListener('reading', () => {
            const timestamp = Date.now();
            updateTimestamps(accelTimestamps.current, timestamp);
            setState((prev) => ({
              ...prev,
              accelerometer: {
                ...prev.accelerometer,
                available: true,
                data: {
                  x: accelSensor.x,
                  y: accelSensor.y,
                  z: accelSensor.z,
                  timestamp,
                },
                sampleRate: calculateSampleRate(accelTimestamps.current),
              },
            }));
          });
          accelSensor.addEventListener('error', (event: any) => {
            setState((prev) => ({
              ...prev,
              accelerometer: {
                ...prev.accelerometer,
                available: false,
                error: event.error.message,
              },
            }));
          });
          accelSensor.start();
          cleanupFunctions.push(() => accelSensor.stop());
        } catch (error: any) {
          console.warn('Accelerometer API failed:', error);
        }
      }

      if ('Gyroscope' in window) {
        try {
          gyroSensor = new (window as any).Gyroscope({ frequency: 60 });
          gyroSensor.addEventListener('reading', () => {
            const timestamp = Date.now();
            updateTimestamps(gyroTimestamps.current, timestamp);
            setState((prev) => ({
              ...prev,
              gyroscope: {
                ...prev.gyroscope,
                available: true,
                data: {
                  x: gyroSensor.x,
                  y: gyroSensor.y,
                  z: gyroSensor.z,
                  timestamp,
                },
                sampleRate: calculateSampleRate(gyroTimestamps.current),
              },
            }));
          });
          gyroSensor.addEventListener('error', (event: any) => {
            setState((prev) => ({
              ...prev,
              gyroscope: {
                ...prev.gyroscope,
                available: false,
                error: event.error.message,
              },
            }));
          });
          gyroSensor.start();
          cleanupFunctions.push(() => gyroSensor.stop());
        } catch (error: any) {
          console.warn('Gyroscope API failed:', error);
        }
      }

      if ('Magnetometer' in window) {
        try {
          magSensor = new (window as any).Magnetometer({ frequency: 60 });
          magSensor.addEventListener('reading', () => {
            const timestamp = Date.now();
            updateTimestamps(magTimestamps.current, timestamp);
            setState((prev) => ({
              ...prev,
              magnetometer: {
                ...prev.magnetometer,
                available: true,
                data: {
                  x: magSensor.x,
                  y: magSensor.y,
                  z: magSensor.z,
                  timestamp,
                },
                sampleRate: calculateSampleRate(magTimestamps.current),
              },
            }));
          });
          magSensor.addEventListener('error', (event: any) => {
            setState((prev) => ({
              ...prev,
              magnetometer: {
                ...prev.magnetometer,
                available: false,
                error: event.error.message,
              },
            }));
          });
          magSensor.start();
          cleanupFunctions.push(() => magSensor.stop());
        } catch (error: any) {
          console.warn('Magnetometer API failed:', error);
        }
      }

      // Fallback to DeviceMotionEvent (iOS, older Android)
      if (!accelSensor && !gyroSensor) {
        const handleMotion = (event: DeviceMotionEvent) => {
          const timestamp = Date.now();

          const acceleration = event.acceleration;
          if (acceleration && acceleration !== null) {
            updateTimestamps(accelTimestamps.current, timestamp);
            setState((prev) => ({
              ...prev,
              accelerometer: {
                ...prev.accelerometer,
                available: true,
                data: {
                  x: acceleration.x || 0,
                  y: acceleration.y || 0,
                  z: acceleration.z || 0,
                  timestamp,
                },
                sampleRate: calculateSampleRate(accelTimestamps.current),
              },
            }));
          }

          const rotationRate = event.rotationRate;
          if (rotationRate && rotationRate !== null) {
            updateTimestamps(gyroTimestamps.current, timestamp);
            setState((prev) => ({
              ...prev,
              gyroscope: {
                ...prev.gyroscope,
                available: true,
                data: {
                  x: (rotationRate.alpha || 0) * (Math.PI / 180),
                  y: (rotationRate.beta || 0) * (Math.PI / 180),
                  z: (rotationRate.gamma || 0) * (Math.PI / 180),
                  timestamp,
                },
                sampleRate: calculateSampleRate(gyroTimestamps.current),
              },
            }));
          }
        };

        window.addEventListener('devicemotion', handleMotion);
        cleanupFunctions.push(() => window.removeEventListener('devicemotion', handleMotion));
      }

      listenersRef.current = cleanupFunctions;

      setState((prev) => ({ ...prev, status: 'streaming' }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        globalError: error.message || 'Failed to start sensors',
      }));
    }
  }, []);

  const stop = useCallback(() => {
    listenersRef.current.forEach((cleanup) => cleanup());
    listenersRef.current = [];
    accelTimestamps.current = [];
    gyroTimestamps.current = [];
    magTimestamps.current = [];
    setState({
      accelerometer: { available: false, data: null, sampleRate: 0 },
      gyroscope: { available: false, data: null, sampleRate: 0 },
      magnetometer: { available: false, data: null, sampleRate: 0 },
      status: 'idle',
    });
  }, []);

  useEffect(() => {
    return () => {
      listenersRef.current.forEach((cleanup) => cleanup());
    };
  }, []);

  return {
    state,
    start,
    stop,
  };
}

