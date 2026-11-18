import React, {createContext, useContext} from 'react';
import * as THREE from 'three';
import {CHARS, CharDef, EMOTIONS} from '../Character';

// Flat "stick figure" characters in a realistic 3D world (like the reference Shorts):
// pure white faces, thick black outline, thin black limbs, dot eyes with heavy brows, a flat colored body.
// They are unlit (flat color) so they read as drawings, only dimmed to match the scene's light.

const INK = '#16110d';
const FACE = '#f8f6f0';
const D = Math.PI / 180;

const LightCtx = createContext(1);

const flat = (hex: string, light: number) => new THREE.Color(hex).multiplyScalar(light);

type PartProps = {pos?: [number, number, number]; rot?: [number, number, number]; scale?: [number, number, number]; color: string; outline?: number; children: React.ReactNode};

const Part: React.FC<PartProps> = ({pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], color, outline = 1.09, children}) => {
	const light = useContext(LightCtx);
	return (
		<group position={pos} rotation={rot} scale={scale}>
			<mesh>
				{children}
				<meshBasicMaterial color={flat(color, light)} />
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
};

export const Char3D: React.FC<Char3DProps> = ({char, emotion, t, mouth, walk, speaking, phase, scale = 1, light = 1}) => {
	const def: CharDef = CHARS[char] ?? CHARS.crowd;
	const E = EMOTIONS[emotion] ?? EMOTIONS.neutral;
	const w = 2 * Math.PI;
	const tt = t + phase;
	const flail = E.flail * 0.25 * Math.sin(tt * w * E.rate);
	const swing = Math.sin(tt * w * 1.9) * 28 * walk;
	const gest = speaking ? Math.sin(tt * w * 1.3) * 5 : 0;
	const ease = (a: number) => 10 + (a - 10) * 0.4;
	const armL = Math.min(70, ease(E.armL) + flail - swing * 0.8 + gest * 0.4);
	const armR = Math.min(70, ease(E.armR) - flail * 0.8 + swing * 0.8 + gest);
	const foreL = E.foreL * 0.45 + flail * 0.3;
	const foreR = E.foreR * 0.45 - flail * 0.2 + (speaking ? 4 * Math.sin(tt * w * 2.1 + 1) : 0);
	const hop = (E.hop / 560) * 1.95 * 0.3 * Math.abs(Math.sin(tt * w * E.rate * 0.5)) + Math.abs(Math.sin(tt * w * 1.9)) * 0.05 * walk;
	const jx = (E.shake / 300) * 0.35 * (Math.sin(tt * 38) + 0.6 * Math.sin(tt * 61));
	const bob = (E.bob / 300) * Math.sin(tt * w * 0.9);
	const tilt = (E.tilt * Math.sin(tt * w * 0.4 + 0.5) + (speaking ? 2 * Math.sin(tt * w * 3.5) : 0)) * D;
	const b = (tt + 1.3) % 3.4;
	const blink = b < 0.14 ? 1 - 0.9 * Math.sin((Math.PI * b) / 0.14) : 1;
	const open = Math.max(E.open ? E.open * (0.5 + 0.5 * Math.abs(Math.sin(tt * w * 3))) : 0, mouth);
	const ex = E.expr;
	const browRot = ({angry: 0.5, worried: -0.4, sad: -0.45, surprised: 0, smile: 0.05, calm: 0.12, neutral: 0.1} as Record<string, number>)[ex] ?? 0;
	const heavy = ex === 'calm' || ex === 'neutral' || ex === 'angry'; // half-closed "unimpressed" eyes like the reference
	const browY = ex === 'surprised' ? 0.09 : heavy ? 0.085 : 0.12;
	const Z = 0.43; // face surface

	const eyes = [-1, 1].map((s) => {
		if (ex === 'asleep')
			return (
				<mesh key={s} position={[s * 0.16, 0.06, Z]}>
					<boxGeometry args={[0.12, 0.022, 0.02]} />
					<meshBasicMaterial color={INK} />
				</mesh>
			);
		if (ex === 'surprised')
			return (
				<group key={s} position={[s * 0.16, 0.07, Z - 0.01]}>
					<mesh>
						<torusGeometry args={[0.075, 0.016, 8, 20]} />
						<meshBasicMaterial color={INK} />
					</mesh>
					<mesh position={[0, 0, 0.005]}>
						<circleGeometry args={[0.07, 18]} />
						<meshBasicMaterial color="#ffffff" />
					</mesh>
					<mesh position={[0, 0, 0.012]}>
						<circleGeometry args={[0.028, 12]} />
						<meshBasicMaterial color={INK} />
					</mesh>
				</group>
			);
		return (
			<group key={s} position={[s * 0.16, 0.05, Z]}>
				<mesh scale={[1, blink, 0.4]}>
					<sphereGeometry args={[0.042, 12, 10]} />
					<meshBasicMaterial color={INK} />
				</mesh>
			</group>
		);
	});

	const brows = [-1, 1].map((s) => (
		<mesh key={s} position={[s * 0.16, browY, Z - 0.004]} rotation={[0, 0, s * browRot]}>
			<boxGeometry args={[0.17, 0.03, 0.02]} />
			<meshBasicMaterial color={INK} />
		</mesh>
	));

	const mouthEl =
		open > 0.06 ? (
			<mesh position={[0, -0.17, Z]} scale={[0.05 + open * 0.03, 0.014 + open * 0.04, 0.3]}>
				<sphereGeometry args={[1, 14, 10]} />
				<meshBasicMaterial color={INK} />
			</mesh>
		) : ex === 'smile' ? (
			<mesh position={[0, -0.12, Z]} rotation={[0, 0, Math.PI]}>
				<torusGeometry args={[0.09, 0.013, 6, 16, Math.PI]} />
				<meshBasicMaterial color={INK} />
			</mesh>
		) : ex === 'sad' || ex === 'angry' || ex === 'worried' ? (
			<mesh position={[0, -0.2, Z]}>
				<torusGeometry args={[0.08, 0.013, 6, 16, Math.PI]} />
				<meshBasicMaterial color={INK} />
			</mesh>
		) : ex === 'surprised' ? (
			<mesh position={[0, -0.18, Z]} scale={[0.04, 0.055, 0.3]}>
				<sphereGeometry args={[1, 12, 10]} />
				<meshBasicMaterial color={INK} />
			</mesh>
		) : (
			<mesh position={[0, -0.17, Z]}>
				<boxGeometry args={[0.07, 0.014, 0.02]} />
				<meshBasicMaterial color={INK} />
			</mesh>
		);

	const hair = def.hair ?? '#2a1c12';

	return (
		<LightCtx.Provider value={light}>
			<group scale={scale} position={[jx, hop, 0]} rotation={[E.lean * 0.4 * D, 0, 0]}>
				{/* stick legs */}
				{[-1, 1].map((s) => (
					<group key={s} position={[s * 0.1, 0.78, 0]} rotation={[s * swing * D, 0, 0]}>
						<Stick len={0.78} r={0.028} />
					</group>
				))}
				{/* flat colored bean body */}
				<group position={[0, 1.12, 0]}>
					<Part color={def.robe} outline={1.07}>
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
				].map(({s, up, fo}) => (
					<group key={s} position={[s * 0.27, 1.34, 0.04]} rotation={[-0.15, 0, s * up * D]}>
						<Stick len={0.38} r={0.028} />
						<group position={[0, -0.38, 0]} rotation={[0, 0, s * fo * D]}>
							<Stick len={0.36} r={0.028} />
							<mesh position={[0, -0.38, 0]}>
								<sphereGeometry args={[0.05, 10, 8]} />
								<meshBasicMaterial color={INK} />
							</mesh>
						</group>
					</group>
				))}
				{/* head: pure white */}
				<group position={[0, 1.78 + bob, 0]} rotation={[0, 0, tilt]}>
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
						<Part pos={[0, -0.24, 0.1]} scale={[def.beardBig ? 1.0 : 0.9, def.beardBig ? 0.9 : 0.72, 0.8]} color={def.beard} outline={1.05}>
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
					{eyes}
					{brows}
					{mouthEl}
				</group>
			</group>
		</LightCtx.Provider>
	);
};
