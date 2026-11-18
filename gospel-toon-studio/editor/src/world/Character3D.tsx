import React, {createContext, useContext} from 'react';
import * as THREE from 'three';
import {CHARS, CharDef, EMOTIONS} from '../Character';
import {Face} from './Face3D';

// Flat "stick figure" characters in a realistic 3D world (like the reference Shorts):
// pure white faces, thick black outline, thin black limbs, dot eyes with heavy brows, a flat colored body.
// They are unlit (flat color) so they read as drawings, only dimmed to match the scene's light.

const INK = '#16110d';
const FACE = '#f8f6f0';
const D = Math.PI / 180;

const LightCtx = createContext(1);

// clothing patterns drawn on a small canvas, like the printed vests in the reference
const patternCache = new Map<string, THREE.Texture>();
const patternTex = (kind: string, base: string, ink: string): THREE.Texture => {
	const key = kind + base + ink;
	const hit = patternCache.get(key);
	if (hit) return hit;
	const cv = document.createElement('canvas');
	cv.width = 256;
	cv.height = 256;
	const g = cv.getContext('2d') as CanvasRenderingContext2D;
	g.fillStyle = base;
	g.fillRect(0, 0, 256, 256);
	g.fillStyle = ink;
	g.strokeStyle = ink;
	if (kind === 'stripes') for (let x = 0; x < 256; x += 22) g.fillRect(x, 0, 8, 256);
	if (kind === 'dots') for (let y = 12; y < 256; y += 26) for (let x = (y / 26) % 2 ? 6 : 19; x < 256; x += 26) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
	if (kind === 'bands') for (let y = 20; y < 256; y += 50) { g.fillRect(0, y, 256, 14); g.fillStyle = base; g.fillRect(0, y + 5, 256, 4); g.fillStyle = ink; }
	const tx = new THREE.CanvasTexture(cv);
	tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
	tx.colorSpace = THREE.SRGBColorSpace;
	patternCache.set(key, tx);
	return tx;
};

const flat = (hex: string, light: number) => new THREE.Color(hex).multiplyScalar(light);

type PartProps = {tex?: THREE.Texture; pos?: [number, number, number]; rot?: [number, number, number]; scale?: [number, number, number]; color: string; outline?: number; children: React.ReactNode};

const Part: React.FC<PartProps> = ({tex, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], color, outline = 1.09, children}) => {
	const light = useContext(LightCtx);
	return (
		<group position={pos} rotation={rot} scale={scale}>
			<mesh>
				{children}
				<meshBasicMaterial color={tex ? new THREE.Color(light, light, light) : flat(color, light)} map={tex ?? null} />
			</mesh>
			{outline > 1 ? (
				<mesh scale={outline}>
					{children}
					<meshBasicMaterial color={INK} side={THREE.BackSide} />
				</mesh>
			) : null}
		</group>
	);
};

const Stick: React.FC<{len: number; r: number}> = ({len, r}) => (
	<mesh position={[0, -len / 2, 0]}>
		<capsuleGeometry args={[r, len - r * 2, 3, 8]} />
		<meshBasicMaterial color={INK} />
	</mesh>
);

const PATTERN: Record<string, [string, string]> = {peter: ['stripes', '#6b4423'], john: ['dots', '#8a6d3b'], crowd: ['bands', '#566a3a'], mary: ['dots', '#b9c8e6']};

export type Char3DProps = {
	char: string;
	emotion: string;
	t: number;
	mouth: number;
	walk: number;
	speaking: boolean;
	phase: number;
	glow?: boolean;
	scale?: number;
	light?: number;
	wordAge?: number; // seconds since the current narration word started (drives nods and gestures)
	wordIdx?: number; // which word of the line this is
	lookYaw?: number; // radians: turn the head toward the other character
};

export const Char3D: React.FC<Char3DProps> = ({char, emotion, t, mouth, walk, speaking, phase, scale = 1, light = 1, wordAge = 9, wordIdx = 0, lookYaw = 0}) => {
	const def: CharDef = CHARS[char] ?? CHARS.crowd;
	const E = EMOTIONS[emotion] ?? EMOTIONS.neutral;
	const w = 2 * Math.PI;
	const tt = t + phase;
	const sm = (x: number) => x * x * (3 - 2 * x);
	const pulse = wordAge < 0.28 ? Math.sin((Math.PI * wordAge) / 0.28) : 0; // a little beat on every narration word
	const emphasis = wordAge < 0.75 && wordIdx % 3 === 0 ? Math.sin((Math.PI * wordAge) / 0.75) : 0; // a gesture on every third word
	const side = wordIdx % 2 === 0 ? 1 : -1;
	const lively = emotion === 'joy' || emotion === 'laugh' || emotion === 'panic' || emotion === 'fear' ? 1 : 0.55;
	// weight shift: sway from foot to foot, the body leans over the standing leg
	const shift = Math.sin(tt * w * 0.33);
	const sway = (2.2 + 1.5 * lively) * shift * D;
	const shiftX = 0.035 * shift;
	// knees stay bent a little and bounce with the beat (squash and stretch)
	const bounceRate = E.rate * 0.5;
	const bounce = E.hop > 4 ? Math.abs(Math.sin(tt * w * bounceRate)) : 0;
	const bend = (9 + 4 * Math.sin(tt * w * 0.5) + 10 * pulse * (speaking ? 1 : 0.3) + 18 * bounce + (emotion === 'sad' ? 8 : 0) + (emotion === 'anger' ? 6 : 0)) * D;
	const drop = 0.8 * (1 - Math.cos(bend)) + (emotion === 'sad' ? 0.04 : 0);
	const squash = 1 + 0.035 * Math.sin(tt * w * 0.8) - 0.05 * pulse * (speaking ? 1 : 0.3) - 0.06 * bounce + (E.hop > 4 ? 0.05 * (1 - bounce) : 0);
	const stepA = walk > 0 ? 30 * Math.sin(tt * w * 1.9) : 0;
	const hop = Math.abs(Math.sin(tt * w * 1.9)) * 0.055 * walk + (E.hop / 560) * 1.95 * 0.28 * bounce;
	const jx = (E.shake / 300) * 0.35 * (Math.sin(tt * 38) + 0.6 * Math.sin(tt * 61));
	// arms: relaxed with small elbow bends, plus one clear gesture on emphasized words
	const rest = 11 + 3 * Math.sin(tt * w * 0.4);
	const baseL = Math.min(60, 10 + (E.armL - 10) * 0.32);
	const baseR = Math.min(60, 10 + (E.armR - 10) * 0.32);
	const gestAmp = speaking ? 34 : 4;
	const armL = baseL + rest * 0.3 - stepA * 0.8 + (side < 0 ? emphasis * gestAmp : emphasis * 6);
	const armR = baseR + rest * 0.3 + stepA * 0.8 + (side > 0 ? emphasis * gestAmp : emphasis * 6);
	const foreL = 14 + E.foreL * 0.3 + (side < 0 ? emphasis * (speaking ? 42 : 4) : 0) + 4 * Math.sin(tt * w * 0.7);
	const foreR = 14 + E.foreR * 0.3 + (side > 0 ? emphasis * (speaking ? 42 : 4) : 0) + 4 * Math.sin(tt * w * 0.7 + 1);
	// head: nod on words, drift, tilt, turn toward the other character
	const listenNod = !speaking ? Math.max(0, Math.sin(tt * w * 0.42 + phase * 5)) ** 6 : 0;
	const nod = (-8 * pulse * (speaking ? 1 : 0) + -5 * listenNod + (emotion === 'anger' ? 7 : 0) + (emotion === 'awe' ? -5 : 0) + (emotion === 'sad' ? 10 : 0)) * D;
	const bob = (E.bob / 300) * Math.sin(tt * w * 0.9) + 0.015 * pulse;
	const tilt = (E.tilt * Math.sin(tt * w * 0.4 + 0.5) + (speaking ? 4 * side * emphasis : 0)) * D;
	const turn = lookYaw + 0.12 * Math.sin(tt * w * 0.23 + phase);
	const lean = (E.lean * 0.45 + (speaking ? 3 * pulse : 0)) * D;
	const b = (tt + 1.3) % 3.4;
	const blink = b < 0.14 ? 1 - 0.9 * Math.sin((Math.PI * b) / 0.14) : 1;
	const open = Math.max(E.open ? E.open * (0.5 + 0.5 * Math.abs(Math.sin(tt * w * 3))) : 0, mouth);
	const ex = E.expr;

	const hair = def.hair ?? '#2a1c12';

	return (
		<LightCtx.Provider value={light}>
			<group scale={scale} position={[jx + shiftX, hop, 0]} rotation={[0, 0, sway]}>
				{/* stick legs: thigh and shin with a knee, feet planted */}
				{[-1, 1].map((sd) => {
					const lift = walk > 0 ? Math.max(0, -sd * Math.sin(tt * w * 1.9)) : 0;
					const thigh = bend + sd * stepA * D;
					const knee = -(2 * bend) - lift * 0.9;
					return (
						<group key={sd} position={[sd * 0.1, 0.8 * Math.cos(bend), 0]} rotation={[thigh, 0, sd * 0.04]}>
							<Stick len={0.4} r={0.028} />
							<group position={[0, -0.4, 0]} rotation={[knee, 0, 0]}>
								<Stick len={0.4} r={0.028} />
							</group>
						</group>
					);
				})}
				<group position={[0, -drop, 0]} rotation={[lean, 0, 0]} scale={[1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash)]}>
				{/* flat colored bean body */}
				<group position={[0, 1.12, 0]}>
					<Part color={def.robe} outline={1.07} tex={PATTERN[char] ? patternTex(PATTERN[char][0], def.robe, PATTERN[char][1]) : undefined}>
						<capsuleGeometry args={[0.27, 0.42, 6, 16]} />
					</Part>
					{def.sash ? (
						<Part pos={[0, -0.04, 0]} color={def.sash} outline={1.03}>
							<cylinderGeometry args={[0.278, 0.278, 0.085, 18]} />
						</Part>
					) : null}
				</group>
				{/* stick arms */}
				{[
					{s: -1, up: armL, fo: foreL},
					{s: 1, up: armR, fo: foreR},
				].map(({s: sd, up, fo}) => (
					<group key={sd} position={[sd * 0.27, 1.34, 0.04]} rotation={[-0.15 - (sd === side ? emphasis * 0.35 : 0), 0, sd * up * D]}>
						<Stick len={0.38} r={0.028} />
						<group position={[0, -0.38, 0]} rotation={[-fo * D * 0.6, 0, sd * fo * D * 0.5]}>
							<Stick len={0.36} r={0.028} />
							<mesh position={[0, -0.38, 0]}>
								<sphereGeometry args={[0.05, 10, 8]} />
								<meshBasicMaterial color={INK} />
							</mesh>
						</group>
					</group>
				))}
				{/* head: pure white */}
				<group position={[0, 1.78 + bob, 0]} rotation={[nod, turn, tilt]}>
					{def.style === 'veil' ? (
						<Part pos={[0, -0.2, -0.14]} scale={[1, 1.2, 0.75]} color={def.veil ?? '#3f6fb5'} outline={1.05}>
							<sphereGeometry args={[0.48, 18, 14]} />
						</Part>
					) : null}
					{def.style === 'long' ? (
						<Part pos={[0, -0.24, -0.2]} scale={[1, 1.25, 0.5]} color={hair} outline={1.05}>
							<sphereGeometry args={[0.44, 18, 14]} />
						</Part>
					) : null}
					<Part color={FACE} outline={1.06}>
						<sphereGeometry args={[0.43, 28, 22]} />
					</Part>
					{def.beard ? (
						<Part pos={[0, -0.33, 0.09]} scale={[def.beardBig ? 1.0 : 0.88, def.beardBig ? 0.62 : 0.5, 0.8]} color={def.beard} outline={1.05}>
							<sphereGeometry args={[0.3, 16, 12]} />
						</Part>
					) : null}
					{def.style === 'curly' ? (
						<Part pos={[0, 0.2, -0.08]} scale={[1, 0.55, 1]} color={hair} outline={1.06}>
							<sphereGeometry args={[0.45, 16, 12]} />
						</Part>
					) : null}
					{def.style === 'long' || def.style === 'short' ? (
						<Part pos={[0, 0.1, -0.07]} color={hair} outline={1.05}>
							<sphereGeometry args={[0.46, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
						</Part>
					) : null}
					{def.style === 'veil' ? (
						<Part pos={[0, 0.1, -0.06]} color={def.veil ?? '#3f6fb5'} outline={1.05}>
							<sphereGeometry args={[0.46, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
						</Part>
					) : null}
					<Face emotion={emotion} blink={blink} open={open} look={lookYaw} pulse={pulse} t={t} />
				</group>
				</group>
			</group>
		</LightCtx.Provider>
	);
};
