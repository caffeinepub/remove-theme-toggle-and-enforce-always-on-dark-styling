export class MadgwickFilter {
  private q0 = 1.0;
  private q1 = 0.0;
  private q2 = 0.0;
  private q3 = 0.0;
  private beta: number;
  private samplePeriod: number;

  constructor(sampleFrequency: number = 60, beta: number = 0.1) {
    this.samplePeriod = 1 / sampleFrequency;
    this.beta = beta;
  }

  updateIMU(gx: number, gy: number, gz: number, ax: number, ay: number, az: number) {
    let q0 = this.q0;
    let q1 = this.q1;
    let q2 = this.q2;
    let q3 = this.q3;

    // Normalize accelerometer measurement
    const norm = Math.sqrt(ax * ax + ay * ay + az * az);
    if (norm === 0) return;
    ax /= norm;
    ay /= norm;
    az /= norm;

    // Gradient descent algorithm corrective step
    const _2q0 = 2 * q0;
    const _2q1 = 2 * q1;
    const _2q2 = 2 * q2;
    const _2q3 = 2 * q3;
    const _4q0 = 4 * q0;
    const _4q1 = 4 * q1;
    const _4q2 = 4 * q2;
    const _8q1 = 8 * q1;
    const _8q2 = 8 * q2;
    const q0q0 = q0 * q0;
    const q1q1 = q1 * q1;
    const q2q2 = q2 * q2;
    const q3q3 = q3 * q3;

    // Gradient descent
    const s0 = _4q0 * q2q2 + _2q2 * ax + _4q0 * q1q1 - _2q1 * ay;
    const s1 = _4q1 * q3q3 - _2q3 * ax + 4 * q0q0 * q1 - _2q0 * ay - _4q1 + _8q1 * q1q1 + _8q1 * q2q2 + _4q1 * az;
    const s2 = 4 * q0q0 * q2 + _2q0 * ax + _4q2 * q3q3 - _2q3 * ay - _4q2 + _8q2 * q1q1 + _8q2 * q2q2 + _4q2 * az;
    const s3 = 4 * q1q1 * q3 - _2q1 * ax + 4 * q2q2 * q3 - _2q2 * ay;

    const sNorm = Math.sqrt(s0 * s0 + s1 * s1 + s2 * s2 + s3 * s3);
    const s0n = s0 / sNorm;
    const s1n = s1 / sNorm;
    const s2n = s2 / sNorm;
    const s3n = s3 / sNorm;

    // Rate of change of quaternion
    const qDot1 = 0.5 * (-q1 * gx - q2 * gy - q3 * gz) - this.beta * s0n;
    const qDot2 = 0.5 * (q0 * gx + q2 * gz - q3 * gy) - this.beta * s1n;
    const qDot3 = 0.5 * (q0 * gy - q1 * gz + q3 * gx) - this.beta * s2n;
    const qDot4 = 0.5 * (q0 * gz + q1 * gy - q2 * gx) - this.beta * s3n;

    // Integrate to yield quaternion
    q0 += qDot1 * this.samplePeriod;
    q1 += qDot2 * this.samplePeriod;
    q2 += qDot3 * this.samplePeriod;
    q3 += qDot4 * this.samplePeriod;

    // Normalize quaternion
    const qNorm = Math.sqrt(q0 * q0 + q1 * q1 + q2 * q2 + q3 * q3);
    this.q0 = q0 / qNorm;
    this.q1 = q1 / qNorm;
    this.q2 = q2 / qNorm;
    this.q3 = q3 / qNorm;
  }

  updateMARG(gx: number, gy: number, gz: number, ax: number, ay: number, az: number, mx: number, my: number, mz: number) {
    let q0 = this.q0;
    let q1 = this.q1;
    let q2 = this.q2;
    let q3 = this.q3;

    // Normalize accelerometer
    let normA = Math.sqrt(ax * ax + ay * ay + az * az);
    if (normA === 0) return;
    ax /= normA;
    ay /= normA;
    az /= normA;

    // Normalize magnetometer
    let normM = Math.sqrt(mx * mx + my * my + mz * mz);
    if (normM === 0) return;
    mx /= normM;
    my /= normM;
    mz /= normM;

    // Auxiliary variables
    const _2q0mx = 2 * q0 * mx;
    const _2q0my = 2 * q0 * my;
    const _2q0mz = 2 * q0 * mz;
    const _2q1mx = 2 * q1 * mx;
    const _2q0 = 2 * q0;
    const _2q1 = 2 * q1;
    const _2q2 = 2 * q2;
    const _2q3 = 2 * q3;
    const _2q0q2 = 2 * q0 * q2;
    const _2q2q3 = 2 * q2 * q3;
    const q0q0 = q0 * q0;
    const q0q1 = q0 * q1;
    const q0q2 = q0 * q2;
    const q0q3 = q0 * q3;
    const q1q1 = q1 * q1;
    const q1q2 = q1 * q2;
    const q1q3 = q1 * q3;
    const q2q2 = q2 * q2;
    const q2q3 = q2 * q3;
    const q3q3 = q3 * q3;

    // Reference direction of Earth's magnetic field
    const hx = mx * q0q0 - _2q0my * q3 + _2q0mz * q2 + mx * q1q1 + _2q1 * my * q2 + _2q1 * mz * q3 - mx * q2q2 - mx * q3q3;
    const hy = _2q0mx * q3 + my * q0q0 - _2q0mz * q1 + _2q1mx * q2 - my * q1q1 + my * q2q2 + _2q2 * mz * q3 - my * q3q3;
    const _2bx = Math.sqrt(hx * hx + hy * hy);
    const _2bz = -_2q0mx * q2 + _2q0my * q1 + mz * q0q0 + _2q1mx * q3 - mz * q1q1 + _2q2 * my * q3 - mz * q2q2 + mz * q3q3;
    const _4bx = 2 * _2bx;
    const _4bz = 2 * _2bz;

    // Gradient descent
    const s0 = -_2q2 * (2 * q1q3 - _2q0q2 - ax) + _2q1 * (2 * q0q1 + _2q2q3 - ay) - _2bz * q2 * (_2bx * (0.5 - q2q2 - q3q3) + _2bz * (q1q3 - q0q2) - mx) + (-_2bx * q3 + _2bz * q1) * (_2bx * (q1q2 - q0q3) + _2bz * (q0q1 + q2q3) - my) + _2bx * q2 * (_2bx * (q0q2 + q1q3) + _2bz * (0.5 - q1q1 - q2q2) - mz);
    const s1 = _2q3 * (2 * q1q3 - _2q0q2 - ax) + _2q0 * (2 * q0q1 + _2q2q3 - ay) - 4 * q1 * (1 - 2 * q1q1 - 2 * q2q2 - az) + _2bz * q3 * (_2bx * (0.5 - q2q2 - q3q3) + _2bz * (q1q3 - q0q2) - mx) + (_2bx * q2 + _2bz * q0) * (_2bx * (q1q2 - q0q3) + _2bz * (q0q1 + q2q3) - my) + (_2bx * q3 - _4bz * q1) * (_2bx * (q0q2 + q1q3) + _2bz * (0.5 - q1q1 - q2q2) - mz);
    const s2 = -_2q0 * (2 * q1q3 - _2q0q2 - ax) + _2q3 * (2 * q0q1 + _2q2q3 - ay) - 4 * q2 * (1 - 2 * q1q1 - 2 * q2q2 - az) + (-_4bx * q2 - _2bz * q0) * (_2bx * (0.5 - q2q2 - q3q3) + _2bz * (q1q3 - q0q2) - mx) + (_2bx * q1 + _2bz * q3) * (_2bx * (q1q2 - q0q3) + _2bz * (q0q1 + q2q3) - my) + (_2bx * q0 - _4bz * q2) * (_2bx * (q0q2 + q1q3) + _2bz * (0.5 - q1q1 - q2q2) - mz);
    const s3 = _2q1 * (2 * q1q3 - _2q0q2 - ax) + _2q2 * (2 * q0q1 + _2q2q3 - ay) + (-_4bx * q3 + _2bz * q1) * (_2bx * (0.5 - q2q2 - q3q3) + _2bz * (q1q3 - q0q2) - mx) + (-_2bx * q0 + _2bz * q2) * (_2bx * (q1q2 - q0q3) + _2bz * (q0q1 + q2q3) - my) + _2bx * q1 * (_2bx * (q0q2 + q1q3) + _2bz * (0.5 - q1q1 - q2q2) - mz);

    const sNorm = Math.sqrt(s0 * s0 + s1 * s1 + s2 * s2 + s3 * s3);
    const s0n = s0 / sNorm;
    const s1n = s1 / sNorm;
    const s2n = s2 / sNorm;
    const s3n = s3 / sNorm;

    // Rate of change of quaternion
    const qDot1 = 0.5 * (-q1 * gx - q2 * gy - q3 * gz) - this.beta * s0n;
    const qDot2 = 0.5 * (q0 * gx + q2 * gz - q3 * gy) - this.beta * s1n;
    const qDot3 = 0.5 * (q0 * gy - q1 * gz + q3 * gx) - this.beta * s2n;
    const qDot4 = 0.5 * (q0 * gz + q1 * gy - q2 * gx) - this.beta * s3n;

    // Integrate
    q0 += qDot1 * this.samplePeriod;
    q1 += qDot2 * this.samplePeriod;
    q2 += qDot3 * this.samplePeriod;
    q3 += qDot4 * this.samplePeriod;

    // Normalize
    const qNorm = Math.sqrt(q0 * q0 + q1 * q1 + q2 * q2 + q3 * q3);
    this.q0 = q0 / qNorm;
    this.q1 = q1 / qNorm;
    this.q2 = q2 / qNorm;
    this.q3 = q3 / qNorm;
  }

  getQuaternion(): [number, number, number, number] {
    return [this.q0, this.q1, this.q2, this.q3];
  }

  reset() {
    this.q0 = 1.0;
    this.q1 = 0.0;
    this.q2 = 0.0;
    this.q3 = 0.0;
  }
}

