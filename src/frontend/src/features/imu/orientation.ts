export function quaternionToEuler(q0: number, q1: number, q2: number, q3: number): { yaw: number; pitch: number; roll: number } {
  // Roll (x-axis rotation)
  const sinr_cosp = 2 * (q0 * q1 + q2 * q3);
  const cosr_cosp = 1 - 2 * (q1 * q1 + q2 * q2);
  const roll = Math.atan2(sinr_cosp, cosr_cosp);

  // Pitch (y-axis rotation)
  const sinp = 2 * (q0 * q2 - q3 * q1);
  let pitch: number;
  if (Math.abs(sinp) >= 1) {
    pitch = Math.sign(sinp) * (Math.PI / 2);
  } else {
    pitch = Math.asin(sinp);
  }

  // Yaw (z-axis rotation)
  const siny_cosp = 2 * (q0 * q3 + q1 * q2);
  const cosy_cosp = 1 - 2 * (q2 * q2 + q3 * q3);
  const yaw = Math.atan2(siny_cosp, cosy_cosp);

  return {
    yaw: (yaw * 180) / Math.PI,
    pitch: (pitch * 180) / Math.PI,
    roll: (roll * 180) / Math.PI,
  };
}

