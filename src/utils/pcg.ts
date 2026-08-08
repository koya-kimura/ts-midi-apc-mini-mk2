export type Vec2 = Readonly<{ x: number; y: number }>;
export type Vec3 = Readonly<{ x: number; y: number; z: number }>;
export type Vec4 = Readonly<{ x: number; y: number; z: number; w: number }>;

export const FLOAT_MAX = 4294967295;

const UINT_A = 1664525;
const UINT_B = 1013904223;

const f32Buffer = new ArrayBuffer(4);
const f32View = new DataView(f32Buffer);

function u32(v: number): number {
  return v >>> 0;
}

function umul(a: number, b: number): number {
  return Math.imul(a, b) >>> 0;
}

function uadd(a: number, b: number): number {
  return (a + b) >>> 0;
}

export function floatBitsToUint(v: number): number {
  f32View.setFloat32(0, v, true);
  return f32View.getUint32(0, true);
}

export function Pcg(v: number): number {
  const state = uadd(umul(u32(v), 747796405), 2891336453);
  const shift = (state >>> 28) + 4;
  const xored = (state >>> shift) ^ state;
  const word = umul(xored, 277803737);
  return ((word >>> 22) ^ word) >>> 0;
}

export function Pcg2d(v: Vec2): Vec2 {
  let x = uadd(umul(u32(v.x), UINT_A), UINT_B);
  let y = uadd(umul(u32(v.y), UINT_A), UINT_B);

  x = uadd(x, umul(y, UINT_A));
  y = uadd(y, umul(x, UINT_A));

  x = x ^ (x >>> 16);
  y = y ^ (y >>> 16);

  x = uadd(x, umul(y, UINT_A));
  y = uadd(y, umul(x, UINT_A));

  x = x ^ (x >>> 16);
  y = y ^ (y >>> 16);

  return { x: u32(x), y: u32(y) };
}

export function Pcg3d(v: Vec3): Vec3 {
  let x = uadd(umul(u32(v.x), UINT_A), UINT_B);
  let y = uadd(umul(u32(v.y), UINT_A), UINT_B);
  let z = uadd(umul(u32(v.z), UINT_A), UINT_B);

  x = uadd(x, umul(y, z));
  y = uadd(y, umul(z, x));
  z = uadd(z, umul(x, y));

  x = x ^ (x >>> 16);
  y = y ^ (y >>> 16);
  z = z ^ (z >>> 16);

  x = uadd(x, umul(y, z));
  y = uadd(y, umul(z, x));
  z = uadd(z, umul(x, y));

  return { x: u32(x), y: u32(y), z: u32(z) };
}

export function Pcg4d(v: Vec4): Vec4 {
  let x = uadd(umul(u32(v.x), UINT_A), UINT_B);
  let y = uadd(umul(u32(v.y), UINT_A), UINT_B);
  let z = uadd(umul(u32(v.z), UINT_A), UINT_B);
  let w = uadd(umul(u32(v.w), UINT_A), UINT_B);

  x = uadd(x, umul(y, w));
  y = uadd(y, umul(z, x));
  z = uadd(z, umul(x, y));
  w = uadd(w, umul(y, z));

  x = x ^ (x >>> 16);
  y = y ^ (y >>> 16);
  z = z ^ (z >>> 16);
  w = w ^ (w >>> 16);

  x = uadd(x, umul(y, w));
  y = uadd(y, umul(z, x));
  z = uadd(z, umul(x, y));
  w = uadd(w, umul(y, z));

  return { x: u32(x), y: u32(y), z: u32(z), w: u32(w) };
}

export function Pcg01(v: number): number;
export function Pcg01(v: Vec2): Vec2;
export function Pcg01(v: Vec3): Vec3;
export function Pcg01(v: Vec4): Vec4;
export function Pcg01(v: number | Vec2 | Vec3 | Vec4): number | Vec2 | Vec3 | Vec4 {
  if (typeof v === "number") {
    return Pcg(floatBitsToUint(v)) / FLOAT_MAX;
  }

  if ("w" in v) {
    const bits: Vec4 = {
      x: floatBitsToUint(v.x),
      y: floatBitsToUint(v.y),
      z: floatBitsToUint(v.z),
      w: floatBitsToUint(v.w),
    };
    const hashed = Pcg4d(bits);
    return {
      x: hashed.x / FLOAT_MAX,
      y: hashed.y / FLOAT_MAX,
      z: hashed.z / FLOAT_MAX,
      w: hashed.w / FLOAT_MAX,
    };
  }

  if ("z" in v) {
    const bits: Vec3 = {
      x: floatBitsToUint(v.x),
      y: floatBitsToUint(v.y),
      z: floatBitsToUint(v.z),
    };
    const hashed = Pcg3d(bits);
    return {
      x: hashed.x / FLOAT_MAX,
      y: hashed.y / FLOAT_MAX,
      z: hashed.z / FLOAT_MAX,
    };
  }

  const bits: Vec2 = {
    x: floatBitsToUint(v.x),
    y: floatBitsToUint(v.y),
  };
  const hashed = Pcg2d(bits);
  return {
    x: hashed.x / FLOAT_MAX,
    y: hashed.y / FLOAT_MAX,
  };
}
