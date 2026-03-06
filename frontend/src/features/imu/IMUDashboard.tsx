import { useState, useEffect, useRef } from 'react';
import { useImuSensors, SensorData } from './useImuSensors';
import { MadgwickFilter } from './madgwick';
import { quaternionToEuler } from './orientation';
import {
  calibrateGyroBias,
  calibrateMagnetometer,
  calibrateAccelerometer,
  applyGyroCalibration,
  applyMagCalibration,
  applyAccelCalibration,
  GyroCalibration,
  MagCalibration,
  AccelCalibration,
  DEFAULT_GYRO_CALIBRATION,
  DEFAULT_MAG_CALIBRATION,
  DEFAULT_ACCEL_CALIBRATION,
} from './calibration';
import { generateCSV, downloadCSV, IMUSample } from './csvExport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Square, Download, Gauge, AlertCircle, Save, Trash2, RotateCcw } from 'lucide-react';
import { SavedSessions } from '../recordings/SavedSessions';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';

export function IMUDashboard() {
  const { state, start, stop } = useImuSensors();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const [filter] = useState(() => new MadgwickFilter(60, 0.1));
  const [orientation, setOrientation] = useState({ w: 1, x: 0, y: 0, z: 0 });
  const [euler, setEuler] = useState({ yaw: 0, pitch: 0, roll: 0 });

  const [gyroCalibration, setGyroCalibration] = useState<GyroCalibration>(DEFAULT_GYRO_CALIBRATION);
  const [magCalibration, setMagCalibration] = useState<MagCalibration>(DEFAULT_MAG_CALIBRATION);
  const [accelCalibration, setAccelCalibration] = useState<AccelCalibration>(DEFAULT_ACCEL_CALIBRATION);

  const [isCalibrating, setIsCalibrating] = useState<'gyro' | 'mag' | 'accel' | null>(null);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [calibrationDuration, setCalibrationDuration] = useState(10);
  const calibrationSamples = useRef<SensorData[]>([]);
  const calibrationStartTime = useRef<number>(0);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedSamples, setRecordedSamples] = useState<IMUSample[]>([]);

  // Update orientation from sensor data
  useEffect(() => {
    if (state.status !== 'streaming') return;

    const gyro = state.gyroscope.data;
    const accel = state.accelerometer.data;
    const mag = state.magnetometer.data;

    if (!gyro || !accel) return;

    const calibratedGyro = applyGyroCalibration(gyro, gyroCalibration);
    const calibratedAccel = applyAccelCalibration(accel, accelCalibration);

    if (mag && state.magnetometer.available) {
      const calibratedMag = applyMagCalibration(mag, magCalibration);
      filter.updateMARG(
        calibratedGyro.x,
        calibratedGyro.y,
        calibratedGyro.z,
        calibratedAccel.x,
        calibratedAccel.y,
        calibratedAccel.z,
        calibratedMag.x,
        calibratedMag.y,
        calibratedMag.z
      );
    } else {
      filter.updateIMU(
        calibratedGyro.x,
        calibratedGyro.y,
        calibratedGyro.z,
        calibratedAccel.x,
        calibratedAccel.y,
        calibratedAccel.z
      );
    }

    const [w, x, y, z] = filter.getQuaternion();
    setOrientation({ w, x, y, z });
    setEuler(quaternionToEuler(w, x, y, z));

    // Record sample if recording
    if (isRecording) {
      const calibratedMag = mag && state.magnetometer.available ? applyMagCalibration(mag, magCalibration) : null;

      const sample: IMUSample = {
        timestamp: Date.now(),
        accel: calibratedAccel ? { x: calibratedAccel.x, y: calibratedAccel.y, z: calibratedAccel.z } : null,
        gyro: calibratedGyro ? { x: calibratedGyro.x, y: calibratedGyro.y, z: calibratedGyro.z } : null,
        mag: calibratedMag ? { x: calibratedMag.x, y: calibratedMag.y, z: calibratedMag.z } : null,
        quaternion: { w, x, y, z },
        euler: quaternionToEuler(w, x, y, z),
      };
      setRecordedSamples((prev) => [...prev, sample]);
    }
  }, [state, gyroCalibration, magCalibration, accelCalibration, filter, isRecording]);

  // Time-based calibration logic
  useEffect(() => {
    if (!isCalibrating) return;

    const now = Date.now();
    const elapsed = (now - calibrationStartTime.current) / 1000;
    const progress = Math.min((elapsed / calibrationDuration) * 100, 100);
    setCalibrationProgress(progress);

    if (elapsed >= calibrationDuration) {
      // Calibration complete
      if (isCalibrating === 'gyro' && calibrationSamples.current.length > 0) {
        const bias = calibrateGyroBias(calibrationSamples.current);
        setGyroCalibration(bias);
      } else if (isCalibrating === 'mag' && calibrationSamples.current.length > 0) {
        const cal = calibrateMagnetometer(calibrationSamples.current);
        setMagCalibration(cal);
      } else if (isCalibrating === 'accel' && calibrationSamples.current.length > 0) {
        const cal = calibrateAccelerometer(calibrationSamples.current);
        setAccelCalibration(cal);
      }

      setIsCalibrating(null);
      calibrationSamples.current = [];
      setCalibrationProgress(0);
      return;
    }

    // Collect samples
    if (isCalibrating === 'gyro' && state.gyroscope.data) {
      calibrationSamples.current.push(state.gyroscope.data);
    } else if (isCalibrating === 'mag' && state.magnetometer.data) {
      calibrationSamples.current.push(state.magnetometer.data);
    } else if (isCalibrating === 'accel' && state.accelerometer.data) {
      calibrationSamples.current.push(state.accelerometer.data);
    }
  }, [state, isCalibrating, calibrationDuration]);

  const handleStartCalibration = (type: 'gyro' | 'mag' | 'accel') => {
    if (state.status !== 'streaming') return;
    if (type === 'mag' && !state.magnetometer.available) return;
    
    calibrationSamples.current = [];
    calibrationStartTime.current = Date.now();
    setCalibrationProgress(0);
    setIsCalibrating(type);
  };

  const handleCancelCalibration = () => {
    setIsCalibrating(null);
    calibrationSamples.current = [];
    setCalibrationProgress(0);
  };

  const handleResetCalibration = (type: 'gyro' | 'mag' | 'accel') => {
    if (type === 'gyro') {
      setGyroCalibration(DEFAULT_GYRO_CALIBRATION);
    } else if (type === 'mag') {
      setMagCalibration(DEFAULT_MAG_CALIBRATION);
    } else if (type === 'accel') {
      setAccelCalibration(DEFAULT_ACCEL_CALIBRATION);
    }
  };

  const handleDownloadCSV = () => {
    const csv = generateCSV(recordedSamples, state.magnetometer.available);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadCSV(csv, `imu-recording-${timestamp}.csv`);
  };

  const getStatusBadge = () => {
    switch (state.status) {
      case 'idle':
        return <Badge variant="secondary">Idle</Badge>;
      case 'requesting-permission':
        return <Badge variant="outline">Requesting Permission</Badge>;
      case 'streaming':
        return <Badge className="bg-primary">Streaming</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  const formatValue = (value: number | undefined, decimals: number = 3): string => {
    return value !== undefined ? value.toFixed(decimals) : 'N/A';
  };

  return (
    <div className="space-y-6">
      {/* Status and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>IMU Control</CardTitle>
              <CardDescription>Start streaming sensor data from your device</CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            {state.status === 'idle' || state.status === 'error' ? (
              <Button onClick={start} className="gap-2">
                <Play className="w-4 h-4" />
                Start Sensors
              </Button>
            ) : (
              <Button onClick={stop} variant="destructive" className="gap-2">
                <Square className="w-4 h-4" />
                Stop Sensors
              </Button>
            )}
          </div>

          {state.globalError && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{state.globalError}</span>
            </div>
          )}

          {state.status === 'streaming' && !state.magnetometer.available && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-accent/20 text-accent-foreground text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Magnetometer unavailable. Orientation will have reduced yaw stability (drift over time).</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Dashboard */}
      <Tabs defaultValue="sensors" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sensors">Sensors</TabsTrigger>
          <TabsTrigger value="orientation">Orientation</TabsTrigger>
          <TabsTrigger value="calibration">Calibration</TabsTrigger>
          <TabsTrigger value="recording">Recording</TabsTrigger>
        </TabsList>

        <TabsContent value="sensors" className="space-y-4">
          {/* Accelerometer */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Accelerometer</CardTitle>
                <div className="flex items-center gap-2">
                  {state.accelerometer.available ? (
                    <>
                      <Gauge className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">{state.accelerometer.sampleRate.toFixed(1)} Hz</span>
                    </>
                  ) : (
                    <Badge variant="outline">Unavailable</Badge>
                  )}
                </div>
              </div>
              <CardDescription>Linear acceleration (m/s²) - calibrated</CardDescription>
            </CardHeader>
            <CardContent>
              {state.accelerometer.error ? (
                <p className="text-sm text-destructive">{state.accelerometer.error}</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">X</p>
                    <p className="text-2xl font-mono">
                      {formatValue(
                        state.accelerometer.data
                          ? applyAccelCalibration(state.accelerometer.data, accelCalibration).x
                          : undefined
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Y</p>
                    <p className="text-2xl font-mono">
                      {formatValue(
                        state.accelerometer.data
                          ? applyAccelCalibration(state.accelerometer.data, accelCalibration).y
                          : undefined
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Z</p>
                    <p className="text-2xl font-mono">
                      {formatValue(
                        state.accelerometer.data
                          ? applyAccelCalibration(state.accelerometer.data, accelCalibration).z
                          : undefined
                      )}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gyroscope */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Gyroscope</CardTitle>
                <div className="flex items-center gap-2">
                  {state.gyroscope.available ? (
                    <>
                      <Gauge className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">{state.gyroscope.sampleRate.toFixed(1)} Hz</span>
                    </>
                  ) : (
                    <Badge variant="outline">Unavailable</Badge>
                  )}
                </div>
              </div>
              <CardDescription>Angular velocity (rad/s) - bias corrected</CardDescription>
            </CardHeader>
            <CardContent>
              {state.gyroscope.error ? (
                <p className="text-sm text-destructive">{state.gyroscope.error}</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">X</p>
                    <p className="text-2xl font-mono">
                      {formatValue(
                        state.gyroscope.data ? applyGyroCalibration(state.gyroscope.data, gyroCalibration).x : undefined
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Y</p>
                    <p className="text-2xl font-mono">
                      {formatValue(
                        state.gyroscope.data ? applyGyroCalibration(state.gyroscope.data, gyroCalibration).y : undefined
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Z</p>
                    <p className="text-2xl font-mono">
                      {formatValue(
                        state.gyroscope.data ? applyGyroCalibration(state.gyroscope.data, gyroCalibration).z : undefined
                      )}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Magnetometer */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Magnetometer</CardTitle>
                <div className="flex items-center gap-2">
                  {state.magnetometer.available ? (
                    <>
                      <Gauge className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">{state.magnetometer.sampleRate.toFixed(1)} Hz</span>
                    </>
                  ) : (
                    <Badge variant="outline">Unavailable</Badge>
                  )}
                </div>
              </div>
              <CardDescription>Magnetic field (µT) - calibrated</CardDescription>
            </CardHeader>
            <CardContent>
              {state.magnetometer.error ? (
                <p className="text-sm text-destructive">{state.magnetometer.error}</p>
              ) : state.magnetometer.available ? (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">X</p>
                    <p className="text-2xl font-mono">
                      {formatValue(
                        state.magnetometer.data
                          ? applyMagCalibration(state.magnetometer.data, magCalibration).x
                          : undefined
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Y</p>
                    <p className="text-2xl font-mono">
                      {formatValue(
                        state.magnetometer.data
                          ? applyMagCalibration(state.magnetometer.data, magCalibration).y
                          : undefined
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Z</p>
                    <p className="text-2xl font-mono">
                      {formatValue(
                        state.magnetometer.data
                          ? applyMagCalibration(state.magnetometer.data, magCalibration).z
                          : undefined
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Magnetometer not available on this device</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orientation" className="space-y-4">
          {/* Quaternion */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quaternion</CardTitle>
              <CardDescription>Device orientation as quaternion (w, x, y, z)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">W</p>
                  <p className="text-2xl font-mono">{formatValue(orientation.w)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">X</p>
                  <p className="text-2xl font-mono">{formatValue(orientation.x)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Y</p>
                  <p className="text-2xl font-mono">{formatValue(orientation.y)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Z</p>
                  <p className="text-2xl font-mono">{formatValue(orientation.z)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Euler Angles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Euler Angles</CardTitle>
              <CardDescription>Device orientation in degrees (yaw, pitch, roll)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Yaw</p>
                  <p className="text-2xl font-mono">{formatValue(euler.yaw, 1)}°</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Pitch</p>
                  <p className="text-2xl font-mono">{formatValue(euler.pitch, 1)}°</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Roll</p>
                  <p className="text-2xl font-mono">{formatValue(euler.roll, 1)}°</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calibration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sensor Calibration</CardTitle>
              <CardDescription>
                Calibrate sensors for improved accuracy. Ensure sensors are streaming before starting calibration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Calibration Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Calibration Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  max="60"
                  value={calibrationDuration}
                  onChange={(e) => setCalibrationDuration(Number(e.target.value))}
                  disabled={isCalibrating !== null}
                  className="max-w-xs"
                />
              </div>

              <Separator />

              {/* Gyroscope Calibration */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">Gyroscope Calibration</h3>
                  <p className="text-sm text-muted-foreground">
                    Place device on a stable surface and keep it completely still during calibration.
                  </p>
                </div>

                {isCalibrating === 'gyro' ? (
                  <div className="space-y-3">
                    <Progress value={calibrationProgress} className="w-full" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Calibrating... {calibrationProgress.toFixed(0)}%
                      </span>
                      <Button variant="outline" size="sm" onClick={handleCancelCalibration}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleStartCalibration('gyro')}
                        disabled={state.status !== 'streaming' || isCalibrating !== null}
                        size="sm"
                      >
                        Start Calibration
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetCalibration('gyro')}
                        disabled={isCalibrating !== null}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="text-muted-foreground">Current bias:</p>
                      <p className="font-mono">
                        X: {gyroCalibration.biasX.toFixed(4)}, Y: {gyroCalibration.biasY.toFixed(4)}, Z:{' '}
                        {gyroCalibration.biasZ.toFixed(4)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Magnetometer Calibration */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">Magnetometer Calibration</h3>
                  <p className="text-sm text-muted-foreground">
                    Move device in a figure-8 pattern, rotating through all axes during calibration.
                  </p>
                </div>

                {!state.magnetometer.available ? (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-muted text-muted-foreground text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Magnetometer is unavailable on this device. Calibration cannot be performed.</span>
                  </div>
                ) : isCalibrating === 'mag' ? (
                  <div className="space-y-3">
                    <Progress value={calibrationProgress} className="w-full" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Calibrating... {calibrationProgress.toFixed(0)}%
                      </span>
                      <Button variant="outline" size="sm" onClick={handleCancelCalibration}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleStartCalibration('mag')}
                        disabled={state.status !== 'streaming' || isCalibrating !== null}
                        size="sm"
                      >
                        Start Calibration
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetCalibration('mag')}
                        disabled={isCalibrating !== null}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="text-muted-foreground">Current calibration:</p>
                      <p className="font-mono">
                        Offsets - X: {magCalibration.offsetX.toFixed(2)}, Y: {magCalibration.offsetY.toFixed(2)}, Z:{' '}
                        {magCalibration.offsetZ.toFixed(2)}
                      </p>
                      <p className="font-mono">
                        Scales - X: {magCalibration.scaleX.toFixed(3)}, Y: {magCalibration.scaleY.toFixed(3)}, Z:{' '}
                        {magCalibration.scaleZ.toFixed(3)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Accelerometer Calibration */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">Accelerometer Calibration</h3>
                  <p className="text-sm text-muted-foreground">
                    Slowly rotate device through all orientations (6 faces) during calibration.
                  </p>
                </div>

                {isCalibrating === 'accel' ? (
                  <div className="space-y-3">
                    <Progress value={calibrationProgress} className="w-full" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Calibrating... {calibrationProgress.toFixed(0)}%
                      </span>
                      <Button variant="outline" size="sm" onClick={handleCancelCalibration}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleStartCalibration('accel')}
                        disabled={state.status !== 'streaming' || isCalibrating !== null}
                        size="sm"
                      >
                        Start Calibration
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetCalibration('accel')}
                        disabled={isCalibrating !== null}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="text-muted-foreground">Current calibration:</p>
                      <p className="font-mono">
                        Offsets - X: {accelCalibration.offsetX.toFixed(2)}, Y: {accelCalibration.offsetY.toFixed(2)}, Z:{' '}
                        {accelCalibration.offsetZ.toFixed(2)}
                      </p>
                      <p className="font-mono">
                        Scales - X: {accelCalibration.scaleX.toFixed(3)}, Y: {accelCalibration.scaleY.toFixed(3)}, Z:{' '}
                        {accelCalibration.scaleZ.toFixed(3)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recording" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recording Controls</CardTitle>
              <CardDescription>Record sensor data and save to cloud storage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                {!isRecording ? (
                  <Button
                    onClick={() => {
                      setRecordedSamples([]);
                      setIsRecording(true);
                    }}
                    disabled={state.status !== 'streaming'}
                    className="gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Start Recording
                  </Button>
                ) : (
                  <Button onClick={() => setIsRecording(false)} variant="destructive" className="gap-2">
                    <Square className="w-4 h-4" />
                    Stop Recording
                  </Button>
                )}

                {recordedSamples.length > 0 && (
                  <>
                    <Button onClick={handleDownloadCSV} variant="outline" className="gap-2">
                      <Download className="w-4 h-4" />
                      Download CSV
                    </Button>
                    <Button
                      onClick={() => setRecordedSamples([])}
                      variant="outline"
                      className="gap-2"
                      disabled={isRecording}
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear
                    </Button>
                  </>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                {isRecording ? (
                  <p className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-destructive rounded-full animate-pulse" />
                    Recording... {recordedSamples.length} samples
                  </p>
                ) : (
                  <p>Recorded samples: {recordedSamples.length}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {isAuthenticated && recordedSamples.length > 0 && (
            <SavedSessions
              currentRecording={{
                samples: recordedSamples,
                hasMagnetometer: state.magnetometer.available,
              }}
            />
          )}

          {!isAuthenticated && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-2 p-3 rounded-md bg-muted text-muted-foreground text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Log in to save recordings to cloud storage</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
