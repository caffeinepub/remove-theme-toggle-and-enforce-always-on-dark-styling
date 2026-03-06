import { SensorData } from './useImuSensors';

export interface IMUSample {
  timestamp: number;
  accel: { x: number; y: number; z: number } | null;
  gyro: { x: number; y: number; z: number } | null;
  mag: { x: number; y: number; z: number } | null;
  quaternion: { w: number; x: number; y: number; z: number };
  euler: { yaw: number; pitch: number; roll: number };
}

export function generateCSV(samples: IMUSample[], hasMagnetometer: boolean): string {
  const headers = [
    'timestamp',
    'accel_x',
    'accel_y',
    'accel_z',
    'gyro_x',
    'gyro_y',
    'gyro_z',
    ...(hasMagnetometer ? ['mag_x', 'mag_y', 'mag_z'] : []),
    'quat_w',
    'quat_x',
    'quat_y',
    'quat_z',
    'euler_yaw',
    'euler_pitch',
    'euler_roll',
  ];

  const rows = samples.map((sample) => {
    const row = [
      sample.timestamp.toString(),
      sample.accel ? sample.accel.x.toFixed(6) : 'NaN',
      sample.accel ? sample.accel.y.toFixed(6) : 'NaN',
      sample.accel ? sample.accel.z.toFixed(6) : 'NaN',
      sample.gyro ? sample.gyro.x.toFixed(6) : 'NaN',
      sample.gyro ? sample.gyro.y.toFixed(6) : 'NaN',
      sample.gyro ? sample.gyro.z.toFixed(6) : 'NaN',
    ];

    if (hasMagnetometer) {
      row.push(
        sample.mag ? sample.mag.x.toFixed(6) : 'NaN',
        sample.mag ? sample.mag.y.toFixed(6) : 'NaN',
        sample.mag ? sample.mag.z.toFixed(6) : 'NaN'
      );
    }

    row.push(
      sample.quaternion.w.toFixed(6),
      sample.quaternion.x.toFixed(6),
      sample.quaternion.y.toFixed(6),
      sample.quaternion.z.toFixed(6),
      sample.euler.yaw.toFixed(6),
      sample.euler.pitch.toFixed(6),
      sample.euler.roll.toFixed(6)
    );

    return row.join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
