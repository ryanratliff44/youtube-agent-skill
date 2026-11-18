// Small 3D math helpers shared by the 3D scene (what three.js draws) and the character overlay (where the
// 2D characters are placed on screen). Both use the SAME camera numbers so they always line up.

export type V3 = [number, number, number];

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.sqrt(dot(a, a));
export const norm = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
export const smooth = (x: number) => x * x * (3 - 2 * x);
export const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
export const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);

export type Cam = {pos: V3; look: V3; fov: number; roll: number};

export const camBasis = (c: Cam) => {
	const f = norm(sub(c.look, c.pos));
	const r0 = norm(cross(f, [0, 1, 0]));
	const u0 = cross(r0, f);
	const cr = Math.cos(c.roll);
	const sr = Math.sin(c.roll);
	const r = add(mul(r0, cr), mul(u0, sr));
	const u = sub(mul(u0, cr), mul(r0, sr));
	return {f, r, u};
};

/** Where a world point lands on the screen (pixels), how many pixels one world unit is there, and its depth. */
export const project = (c: Cam, p: V3, W: number, H: number) => {
	const {f, r, u} = camBasis(c);
	const v = sub(p, c.pos);
	const z = dot(v, f);
	if (z < 0.2) return null;
	const t = Math.tan((c.fov * Math.PI) / 360);
	const x = dot(v, r) / (z * t * (W / H));
	const y = dot(v, u) / (z * t);
	return {sx: (x * 0.5 + 0.5) * W, sy: (0.5 - y * 0.5) * H, ppu: H / (2 * z * t), z};
};

// ---------------------------------------------------------------- waves (same formula in the sea shader)
const WAVES: [number, number, number, number, number][] = [
	// dirX, dirZ, k, w, amplitude
	[0.9806, 0.1961, 0.3, 1.1, 0.5],
	[0.6, 0.8, 0.55, 1.5, 0.28],
	[-0.406, 0.914, 0.9, 1.9, 0.14],
	[0.914, -0.406, 1.4, 2.4, 0.07],
];

export const waveHeight = (x: number, z: number, t: number, amp: number) => {
	let h = 0;
	for (const [dx, dz, k, w, a] of WAVES) h += a * Math.sin(k * (dx * x + dz * z) + w * t);
	return h * amp;
};

export const WAVES_GLSL = WAVES.map(([dx, dz, k, w, a]) => `h += ${a.toFixed(3)} * sin(${k.toFixed(3)} * (${dx.toFixed(4)} * p.x + ${dz.toFixed(4)} * p.y) + ${w.toFixed(3)} * t);`).join('\n');

// ---------------------------------------------------------------- the boat rides the waves
export type BoatPose = {pos: V3; yaw: number; pitch: number; roll: number};

export const BOAT_LEN = 7;
export const BOAT_W = 2.3;

export const boatPose = (t: number, amp: number, base: [number, number] = [0, 0]): BoatPose => {
	const [bx, bz] = base;
	const h = (dx: number, dz: number) => waveHeight(bx + dx, bz + dz, t, amp);
	const c = h(0, 0);
	const pitch = Math.atan2(h(BOAT_LEN / 2, 0) - h(-BOAT_LEN / 2, 0), BOAT_LEN);
	const roll = Math.atan2(h(0, BOAT_W / 2) - h(0, -BOAT_W / 2), BOAT_W);
	return {pos: [bx, c * 0.9 - 0.05, bz], yaw: 0.25 * Math.sin(t * 0.3) * Math.min(1, amp), pitch, roll};
};

/** Rotate a point by the boat's yaw (Y), pitch (Z) and roll (X), in the same order three.js uses for 'YZX'. */
export const boatToWorld = (p: BoatPose, local: V3): V3 => {
	let [x, y, z] = local;
	// roll about X
	let c = Math.cos(p.roll);
	let s = Math.sin(p.roll);
	[y, z] = [y * c - z * s, y * s + z * c];
	// pitch about Z
	c = Math.cos(p.pitch);
	s = Math.sin(p.pitch);
	[x, y] = [x * c - y * s, x * s + y * c];
	// yaw about Y
	c = Math.cos(p.yaw);
	s = Math.sin(p.yaw);
	[x, z] = [x * c + z * s, -x * s + z * c];
	return [x + p.pos[0], y + p.pos[1], z + p.pos[2]];
};

// ---------------------------------------------------------------- deterministic randomness
export const hash = (n: number) => {
	const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return s - Math.floor(s);
};

export const rng = (seed: number) => {
	let s = seed * 9301 + 49297;
	return () => {
		s = (s * 9301 + 49297) % 233280;
		return s / 233280;
	};
};

/** Lightning: 0 (none) to 1 (full flash), with the double-flicker of a real strike. */
export const lightning = (t: number, every = 3.6) => {
	const k = Math.floor(t / every);
	const start = k * every + hash(k) * (every - 1.2);
	const dt = t - start;
	if (dt < 0 || dt > 0.55) return {flash: 0, k};
	const f = dt < 0.07 ? 1 : dt < 0.13 ? 0.15 : dt < 0.22 ? 0.95 : Math.max(0, 0.45 - (dt - 0.22) * 1.4);
	return {flash: f, k};
};

// value noise for terrain
const n2 = (x: number, z: number) => hash(x * 12.9898 + z * 78.233);
export const noise2 = (x: number, z: number) => {
	const xi = Math.floor(x);
	const zi = Math.floor(z);
	const xf = smooth(x - xi);
	const zf = smooth(z - zi);
	const a = n2(xi, zi);
	const b = n2(xi + 1, zi);
	const c = n2(xi, zi + 1);
	const d = n2(xi + 1, zi + 1);
	return lerp(lerp(a, b, xf), lerp(c, d, xf), zf);
};
export const fbm = (x: number, z: number) => noise2(x, z) * 0.55 + noise2(x * 2.1, z * 2.1) * 0.28 + noise2(x * 4.3, z * 4.3) * 0.17;
