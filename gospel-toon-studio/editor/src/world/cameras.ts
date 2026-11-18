import {Cam, V3, easeInOut, easeOut, lerp, add} from './math';

export const CAM_PRESETS = ['wide', 'push_in', 'close', 'orbit', 'low_hero', 'crane_up', 'pull_back', 'whip', 'over_water', 'dutch', 'reveal', 'pivot', 'medium'] as const;
export type CamPreset = (typeof CAM_PRESETS)[number];

// [azimuth deg, elevation deg, distance m, fov deg, roll deg]  (azimuth 0 = camera on the +z side looking at the subject)
type Key = [number, number, number, number, number];
const PRESETS: Record<CamPreset, {from: Key; to: Key; ease?: 'out'}> = {
	wide: {from: [28, 9, 16, 50, 0], to: [16, 11, 13.5, 50, 0]},
	push_in: {from: [24, 6, 10, 52, 0], to: [8, 3, 4.6, 46, 0]},
	close: {from: [10, 3, 5.4, 44, 0], to: [5, 2, 4.9, 43, 0]},
	orbit: {from: [62, 8, 8, 50, 0], to: [-34, 10, 8, 50, 0]},
	low_hero: {from: [14, -12, 6.5, 58, 0], to: [-2, -7, 5.2, 54, 0]},
	crane_up: {from: [10, 2, 7, 52, 0], to: [18, 40, 12, 50, 0]},
	pull_back: {from: [4, 4, 3.8, 42, 0], to: [16, 10, 15, 54, 0]},
	whip: {from: [72, 6, 9, 52, 0], to: [14, 5, 7, 50, 0], ease: 'out'},
	over_water: {from: [34, -3, 13, 56, 0], to: [20, 0, 11, 54, 0]},
	dutch: {from: [30, 6, 9, 52, 7], to: [14, 4, 6, 48, 5]},
	reveal: {from: [8, 28, 22, 50, 0], to: [20, 8, 13, 50, 0]},
	pivot: {from: [34, 12, 17, 54, 0], to: [6, 2, 5.6, 44, 0], ease: 'out'}, // the one big opening zoom onto the main character
	medium: {from: [16, 5, 7.5, 46, 0], to: [10, 4, 6.2, 44, 0]},
};

const rad = (d: number) => (d * Math.PI) / 180;

/**
 * Camera for a shot: it flies from one framing to another around the subject (a point in the world).
 * k = 0..1 progress through the shot, t = absolute time (for the handheld drift).
 */
export const cameraFor = (preset: string, subject: V3, k: number, t: number, shake = 1): Cam => {
	const P = PRESETS[(preset as CamPreset) in PRESETS ? (preset as CamPreset) : 'wide'];
	const e = P.ease === 'out' ? easeOut(Math.min(1, k * 2.4)) : easeInOut(k);
	const m = (i: number) => lerp(P.from[i], P.to[i], e);
	const az = rad(m(0));
	const el = rad(m(1));
	const d = m(2);
	let pos = add(subject, [d * Math.cos(el) * Math.sin(az), d * Math.sin(el), d * Math.cos(el) * Math.cos(az)]);
	if (pos[1] < 0.7) pos = [pos[0], 0.7, pos[2]];
	const hx = shake * (0.05 * Math.sin(t * 5.1) + 0.03 * Math.sin(t * 12.7));
	const hy = shake * (0.05 * Math.sin(t * 4.3 + 1) + 0.03 * Math.sin(t * 11.3));
	return {pos: add(pos, [hx, hy, 0]), look: add(subject, [-hx * 0.4, 0, hy * 0.4]), fov: m(3), roll: rad(m(4)) + shake * 0.006 * Math.sin(t * 3.1)};
};
