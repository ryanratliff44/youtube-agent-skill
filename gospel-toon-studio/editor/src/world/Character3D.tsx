import React from 'react';
import * as THREE from 'three';
import {CHARS, CharDef, EMOTIONS} from '../Character';

// Real 3D "bean people": a big round head, capsule body, jointed arms and legs, toon-shaded with a dark outline.
// Same emotions as the 2D rig (joy, fear, panic, anger, ...), same blinking, walking, gesturing and talking.

const INK = '#2b1b12';
const SKIN: Record<string, string> = {light: '#f2c9a0', olive: '#d9a273', tan: '#c98f5e'};
const D = Math.PI / 180;

type PartProps = {pos?: [number, number, number]; rot?: [number, number, number]; scale?: [number, number, number]; color: string; outline?: number; children: React.ReactNode; emissive?: string};

const Part: React.FC<PartProps> = ({pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], color, outline = 1.07, children, emissive}) => (
	<group position={pos} rotation={rot} scale={scale}>
		<mesh>
			{children}
			<meshToonMaterial color={color} emissive={emissive ?? '#000000'} />
		</mesh>
		{outline > 1 ? (
			<mesh scale={outline}>
				{children}
				<meshBasicMaterial color={INK} side={THREE.BackSide} />
			</mesh>
		) : null}
	</group>
);

const Limb: React.FC<{len: number; r: number; color: string}> = ({len, r, color}) => (
	<Part pos={[0, -len / 2, 0]} color={color} outline={1.3}>
		<capsuleGeometry args={[r, len - r * 2, 4, 10]} />
	</Part>
);

const BROW_ROT: Record<string, number> = {angry: 0.5, worried: -0.4, sad: -0.45, surprised: 0, smile: 0.08, calm: 0.04, neutral: 0};

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
};

export const Char3D: React.FC<Char3DProps> = ({char, emotion, t, mouth, walk, speaking, phase, glow, scale = 1}) => {
	const def: CharDef = CHARS[char] ?? CHARS.crowd;
	const E = EMOTIONS[emotion] ?? EMOTIONS.neutral;
	const skin = SKIN[def.skin];
	const w = 2 * Math.PI;
	const tt = t + phase;
	const CALM = 0.3; // acting lives in the face; the body stays small and natural
	const flail = E.flail * CALM * Math.sin(tt * w * E.rate);
	const swing = Math.sin(tt * w * 1.9) * 32 * walk;
	const gest = speaking ? Math.sin(tt * w * 1.3) * 5 : 0;
	const ease = (a: number) => 10 + (a - 10) * 0.42; // pull big arm poses toward a relaxed arm
	const armL = Math.min(75, ease(E.armL) + flail - swing * 0.8 + gest * 0.4);
	const armR = Math.min(75, ease(E.armR) - flail * 0.8 + swing * 0.8 + gest);
	const foreL = E.foreL * 0.5 + flail * 0.3 + (speaking ? 3 * Math.sin(tt * w * 2.3) : 0);
	const foreR = E.foreR * 0.5 - flail * 0.2 + (speaking ? 5 * Math.sin(tt * w * 2.1 + 1) : 0);
	const hop = (E.hop / 560) * 1.95 * 0.35 * Math.abs(Math.sin(tt * w * E.rate * 0.5)) + Math.abs(Math.sin(tt * w * 1.9)) * 0.05 * walk;
	const jx = (E.shake / 300) * 0.4 * (Math.sin(tt * 38) + 0.6 * Math.sin(tt * 61));
	const jy = (E.shake / 300) * 0.2 * Math.sin(tt * 47);
	const bob = (E.bob / 300) * Math.sin(tt * w * 0.9);
	const tilt = (E.tilt * Math.sin(tt * w * 0.4 + 0.5) + (speaking ? 2.5 * Math.sin(tt * w * 3.5) : 0)) * D;
	const breathe = 1 + 0.012 * Math.sin(tt * w * 0.8);
	const b = (tt + 1.3) % 3.4;
	const blink = b < 0.14 ? 1 - 0.9 * Math.sin((Math.PI * b) / 0.14) : 1;
	const open = Math.max(E.open ? E.open * (0.5 + 0.5 * Math.abs(Math.sin(tt * w * 3))) : 0, mouth);
	const ex = E.expr;
	const brow = BROW_ROT[ex] ?? 0;
	const browY = ex === 'surprised' ? 0.075 : 0;
	const beardy = Boolean(def.beard);
	const mouthCol = beardy ? '#f6dcc0' : INK;

	const eyes = (() => {
		if (ex === 'asleep')
			return [-0.15, 0.15].map((x) => (
				<mesh key={x} position={[x, 0.04, 0.4]}>
					<boxGeometry args={[0.13, 0.022, 0.02]} />
					<meshBasicMaterial color={INK} />
				</mesh>
			));
		if (ex === 'surprised')
			return [-0.15, 0.15].map((x) => (
				<group key={x} position={[x, 0.05, 0.385]}>
					<mesh scale={[1, 1, 0.45]}>
						<sphereGeometry args={[0.085, 14, 12]} />
						<meshBasicMaterial color="#ffffff" />
					</mesh>
					<mesh position={[0, 0, 0.03]} scale={[1, 1, 0.5]}>
						<sphereGeometry args={[0.04, 10, 8]} />
						<meshBasicMaterial color={INK} />
					</mesh>
				</group>
			));
		const r = ex === 'worried' || ex === 'sad' ? 0.055 : 0.047;
		return [-0.15, 0.15].map((x) => (
			<group key={x} position={[x, 0.04, 0.392]}>
				<mesh scale={[1, blink, 0.5]}>
					<sphereGeometry args={[r * 1.12, 14, 12]} />
					<meshBasicMaterial color={INK} />
				</mesh>
				<mesh position={[r * 0.35, r * 0.4 * blink, 0.02]} scale={[1, blink, 0.5]}>
					<sphereGeometry args={[r * 0.3, 8, 6]} />
					<meshBasicMaterial color="#ffffff" />
				</mesh>
			</group>
		));
	})();

	const mouthEl = (() => {
		const z = 0.405;
		if (open > 0.06)
			return (
				<mesh position={[0, -0.16, z]} scale={[0.06 + open * 0.035, 0.016 + open * 0.045, 0.3]}>
					<sphereGeometry args={[1, 14, 10]} />
					<meshBasicMaterial color={beardy ? '#5a1f1c' : INK} />
				</mesh>
			);
		if (ex === 'smile')
			return (
				<mesh position={[0, -0.12, z]} rotation={[0, 0, Math.PI]}>
					<torusGeometry args={[0.11, 0.014, 6, 16, Math.PI]} />
					<meshBasicMaterial color={mouthCol} />
				</mesh>
			);
		if (ex === 'sad' || ex === 'angry' || ex === 'worried')
			return (
				<mesh position={[0, -0.2, z]}>
					<torusGeometry args={[0.09, 0.014, 6, 16, Math.PI]} />
					<meshBasicMaterial color={mouthCol} />
				</mesh>
			);
		if (ex === 'surprised')
			return (
				<mesh position={[0, -0.17, z]} scale={[0.05, 0.065, 0.3]}>
					<sphereGeometry args={[1, 12, 10]} />
					<meshBasicMaterial color={beardy ? '#a63a35' : INK} />
				</mesh>
			);
		return (
			<mesh position={[0, -0.16, z]} rotation={[0, 0, ex === 'asleep' ? 0 : 0]}>
				<boxGeometry args={[0.13, 0.016, 0.02]} />
				<meshBasicMaterial color={mouthCol} />
			</mesh>
		);
	})();

	const curls = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
		const a = (i / 10) * Math.PI * 2;
		return [Math.sin(a) * 0.31, 0.3 + Math.cos(a * 2) * 0.03, Math.cos(a) * 0.3 - 0.06] as [number, number, number];
	});

	return (
		<group scale={scale} position={[jx, hop + jy, 0]} rotation={[E.lean * D, 0, 0]}>
			{glow ? (
				<>
					<mesh position={[0, 1.0, 0]}>
						<sphereGeometry args={[1.25, 24, 18]} />
						<meshBasicMaterial color="#ffe9a0" transparent opacity={0.08} side={THREE.BackSide} depthWrite={false} fog={false} />
					</mesh>
					<pointLight position={[0, 1.2, 0.8]} color="#ffd98a" intensity={1.6} distance={5} decay={1.5} />
				</>
			) : null}
			{/* legs */}
			{[-1, 1].map((s) => (
				<group key={s} position={[s * 0.12, 0.66, 0]} rotation={[(s * swing * D * 1.0) as number, 0, 0]}>
					<Limb len={0.62} r={0.055} color={INK} />
					<Part pos={[0, -0.64, 0.07]} color="#3b2a1c" outline={1.12}>
						<sphereGeometry args={[0.1, 12, 10]} />
					</Part>
				</group>
			))}
			{/* body */}
			<group position={[0, 1.0, 0]} scale={[1, breathe, 1]}>
				<Part color={def.robe} outline={1.05}>
					<capsuleGeometry args={[0.29, 0.5, 6, 16]} />
				</Part>
				{def.sash ? (
					<Part pos={[0, -0.02, 0]} color={def.sash} outline={1.04}>
						<cylinderGeometry args={[0.305, 0.305, 0.1, 18]} />
					</Part>
				) : null}
			</group>
			{/* arms */}
			{[
				{s: -1, up: armL, fo: foreL},
				{s: 1, up: armR, fo: foreR},
			].map(({s, up, fo}) => (
				<group key={s} position={[s * 0.3, 1.32, 0.02]} rotation={[-0.18, 0, s * up * D]}>
					<Limb len={0.4} r={0.045} color={INK} />
					<group position={[0, -0.4, 0]} rotation={[0, 0, s * fo * D]}>
						<Limb len={0.38} r={0.045} color={INK} />
						<Part pos={[0, -0.4, 0]} color={skin} outline={1.2}>
							<sphereGeometry args={[0.07, 12, 10]} />
						</Part>
					</group>
				</group>
			))}
			{/* head */}
			<group position={[0, 1.7 + bob, 0]} rotation={[0, 0, tilt]}>
				{def.style === 'veil' ? (
					<Part pos={[0, -0.18, -0.12]} scale={[1, 1.15, 0.8]} color={def.veil ?? '#3f6fb5'} outline={1.05}>
						<sphereGeometry args={[0.47, 18, 14]} />
					</Part>
				) : null}
				{def.style === 'long' ? (
					<Part pos={[0, -0.22, -0.2]} scale={[1, 1.25, 0.55]} color={def.hair ?? '#5a3a22'} outline={1.05}>
						<sphereGeometry args={[0.43, 18, 14]} />
					</Part>
				) : null}
				<Part color={skin} outline={1.06}>
					<sphereGeometry args={[0.42, 28, 22]} />
				</Part>
				{def.beard ? (
					<Part pos={[0, -0.22, 0.1]} scale={[def.beardBig ? 1.02 : 0.95, def.beardBig ? 0.95 : 0.8, 0.85]} color={def.beard} outline={1.05}>
						<sphereGeometry args={[0.3, 16, 12]} />
					</Part>
				) : null}
				{def.style === 'curly' ? (
					<>
						{curls.map((p, i) => (
							<Part key={i} pos={p} color={def.hair ?? '#2c1b12'} outline={1.08}>
								<sphereGeometry args={[0.14, 10, 8]} />
							</Part>
						))}
						<Part pos={[0, 0.22, -0.1]} scale={[1, 0.6, 1]} color={def.hair ?? '#2c1b12'} outline={1.04}>
							<sphereGeometry args={[0.42, 16, 12]} />
						</Part>
					</>
				) : null}
				{def.style === 'long' || def.style === 'short' ? (
					<Part pos={[0, 0.08, -0.06]} color={def.hair ?? '#5a3a22'} outline={1.04}>
						<sphereGeometry args={[0.45, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.46]} />
					</Part>
				) : null}
				{def.style === 'veil' ? (
					<Part pos={[0, 0.08, -0.05]} color={def.veil ?? '#3f6fb5'} outline={1.04}>
						<sphereGeometry args={[0.45, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.46]} />
					</Part>
				) : null}
				{eyes}
				{[-1, 1].map((q) => (
					<mesh key={q} position={[q * 0.25, -0.07, 0.31]} scale={[1, 0.7, 0.3]}>
						<sphereGeometry args={[0.07, 10, 8]} />
						<meshBasicMaterial color="#e9857a" transparent opacity={0.45} />
					</mesh>
				))}
				{[-1, 1].map((s) => (
					<mesh key={s} position={[s * 0.15, 0.14 + browY, 0.385]} rotation={[0, 0, s * brow]}>
						<boxGeometry args={[0.14, 0.026, 0.024]} />
						<meshBasicMaterial color={INK} />
					</mesh>
				))}
				{mouthEl}
			</group>
		</group>
	);
};
