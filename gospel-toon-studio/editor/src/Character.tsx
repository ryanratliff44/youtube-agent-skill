import React from 'react';

// Animated flat 2D "bean" characters. Everything is drawn from code so arms, legs, head, eyes and mouth
// can move on their own: blinking, walking, gesturing, talking, and emotion-specific body language.

const INK = '#2b1b12';
const SKIN: Record<string, string> = {light: '#f2c9a0', olive: '#d9a273', tan: '#c98f5e'};

export type CharDef = {
	skin: string;
	robe: string;
	sash?: string;
	hair?: string;
	style: 'long' | 'curly' | 'short' | 'veil' | 'none';
	beard?: string;
	beardBig?: boolean;
	veil?: string;
};

export const CHARS: Record<string, CharDef> = {
	jesus: {skin: 'olive', robe: '#f3ead8', sash: '#3f6fb5', hair: '#5a3a22', style: 'long', beard: '#5a3a22'},
	peter: {skin: 'tan', robe: '#6f8668', sash: '#4b3a28', hair: '#2c1b12', style: 'curly', beard: '#2c1b12', beardBig: true},
	john: {skin: 'olive', robe: '#c4ad80', sash: '#7a6238', hair: '#4a3322', style: 'short'},
	mary: {skin: 'olive', robe: '#f3ead8', style: 'veil', veil: '#3f6fb5'},
	crowd: {skin: 'light', robe: '#7d8f5a', sash: '#5b6a3e', hair: '#6b4a2a', style: 'short'},
};

type Emotion = {
	expr: string;
	armL: number; // degrees the upper arm is raised outward (0 = hanging)
	armR: number;
	foreL: number; // forearm bend
	foreR: number;
	bob: number; // head bob (px)
	hop: number; // jump height (px)
	shake: number; // trembling (px)
	tilt: number; // head tilt (deg)
	lean: number; // body lean (deg, + = forward)
	flail: number; // arm waving amount (deg)
	rate: number; // how fast the emotion moves (Hz)
	open?: number; // mouth open all the time (0-1), e.g. laughing
};

export const EMOTIONS: Record<string, Emotion> = {
	neutral: {expr: 'neutral', armL: 12, armR: 12, foreL: 6, foreR: 6, bob: 3, hop: 0, shake: 0, tilt: 2, lean: 0, flail: 0, rate: 0.9},
	calm: {expr: 'calm', armL: 10, armR: 10, foreL: 4, foreR: 4, bob: 2, hop: 0, shake: 0, tilt: 1.5, lean: 0, flail: 0, rate: 0.6},
	joy: {expr: 'smile', armL: 128, armR: 128, foreL: -20, foreR: -20, bob: 6, hop: 34, shake: 0, tilt: 5, lean: 2, flail: 22, rate: 2.2},
	laugh: {expr: 'smile', armL: 28, armR: 28, foreL: 70, foreR: 70, bob: 8, hop: 20, shake: 3, tilt: 7, lean: -5, flail: 8, rate: 2.8, open: 0.75},
	fear: {expr: 'worried', armL: 40, armR: 40, foreL: 20, foreR: 20, bob: 4, hop: 0, shake: 0, tilt: 3, lean: -6, flail: 30, rate: 3.4},
	panic: {expr: 'worried', armL: 55, armR: 55, foreL: 10, foreR: 10, bob: 6, hop: 0, shake: 0, tilt: 4, lean: 4, flail: 45, rate: 4.2, open: 0.6},
	anger: {expr: 'angry', armL: 35, armR: 112, foreL: 50, foreR: 40, bob: 5, hop: 4, shake: 2.5, tilt: -3, lean: 9, flail: 12, rate: 3},
	sad: {expr: 'sad', armL: 6, armR: 6, foreL: 4, foreR: 4, bob: 2, hop: 0, shake: 0.6, tilt: 9, lean: 6, flail: 0, rate: 0.5},
	awe: {expr: 'surprised', armL: 58, armR: 58, foreL: 20, foreR: 20, bob: 3, hop: 3, shake: 0.8, tilt: -2, lean: -7, flail: 5, rate: 1.1},
	sleep: {expr: 'asleep', armL: 8, armR: 8, foreL: 3, foreR: 3, bob: 3, hop: 0, shake: 0, tilt: 8, lean: 3, flail: 0, rate: 0.35},
	smug: {expr: 'calm', armL: 14, armR: 62, foreL: 6, foreR: 88, bob: 2, hop: 0, shake: 0, tilt: -4, lean: -2, flail: 0, rate: 0.7},
	warm: {expr: 'smile', armL: 10, armR: 14, foreL: 6, foreR: 8, bob: 2, hop: 0, shake: 0, tilt: 3, lean: 1, flail: 0, rate: 0.6},
	command: {expr: 'calm', armL: 10, armR: 150, foreL: 5, foreR: -8, bob: 2, hop: 0, shake: 0, tilt: 0, lean: 2, flail: 0, rate: 0.6},
};

const BROWS: Record<string, [string, string]> = {
	neutral: ['M112 76 q12 -5 24 0', 'M164 76 q12 -5 24 0'],
	smile: ['M112 74 q12 -6 24 0', 'M164 74 q12 -6 24 0'],
	calm: ['M112 74 q12 -4 24 0', 'M164 74 q12 -4 24 0'],
	worried: ['M110 80 q12 -2 26 -12', 'M164 68 q14 10 26 12'],
	sad: ['M110 80 q12 -2 26 -12', 'M164 68 q14 10 26 12'],
	surprised: ['M110 68 q12 -9 26 0', 'M164 68 q12 -9 26 0'],
	angry: ['M110 70 q14 6 26 10', 'M164 80 q14 -4 26 -10'],
};

const MOUTHS: Record<string, string> = {
	neutral: 'M138 122 l24 0',
	smile: 'M132 120 q18 16 36 0',
	calm: 'M138 122 q12 6 24 0',
	worried: 'M134 126 q8 -9 16 0 q8 9 16 0',
	sad: 'M134 128 q16 -12 32 0',
	angry: 'M134 126 q16 -10 32 0',
	asleep: 'M140 122 q10 6 20 0',
};

const stroke = (d: string, color = INK, w = 5) => <path d={d} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" />;

const Face: React.FC<{expr: string; blink: number; open: number; mouthColor: string; mouthFill: string}> = ({expr, blink, open, mouthColor, mouthFill}) => {
	const brows = BROWS[expr];
	let eyes: React.ReactNode;
	if (expr === 'asleep') {
		eyes = (
			<>
				{stroke('M114 94 q10 8 20 0')}
				{stroke('M166 94 q10 8 20 0')}
			</>
		);
	} else if (expr === 'surprised') {
		eyes = (
			<>
				<circle cx="124" cy="92" r="10" fill="#fff" stroke={INK} strokeWidth="4" />
				<circle cx="124" cy="92" r="4.5" fill={INK} />
				<circle cx="176" cy="92" r="10" fill="#fff" stroke={INK} strokeWidth="4" />
				<circle cx="176" cy="92" r="4.5" fill={INK} />
			</>
		);
	} else {
		const r = expr === 'worried' || expr === 'sad' ? 8.5 : 7.5;
		eyes = (
			<g transform={`translate(0 92) scale(1 ${blink}) translate(0 -92)`}>
				<circle cx="124" cy="92" r={r} fill={INK} />
				<circle cx="176" cy="92" r={r} fill={INK} />
			</g>
		);
	}
	const mouth =
		open > 0.06 ? (
			<g>
				<ellipse cx="150" cy="124" rx={9 + open * 7} ry={2.5 + open * 13} fill={mouthFill} stroke={mouthColor} strokeWidth="3" />
			</g>
		) : expr === 'surprised' ? (
			<ellipse cx="150" cy="124" rx="9" ry="12" fill={mouthFill} />
		) : (
			stroke(MOUTHS[expr] ?? MOUTHS.neutral, mouthColor)
		);
	return (
		<g>
			{eyes}
			{brows ? (
				<>
					{stroke(brows[0])}
					{stroke(brows[1])}
				</>
			) : null}
			{mouth}
		</g>
	);
};

const HairBack: React.FC<{c: CharDef}> = ({c}) => {
	if (c.style === 'long')
		return <path d="M78 100 q-8 -66 72 -70 q80 4 72 70 l6 76 q-16 14 -34 6 l-4 -60 l-80 0 l-4 60 q-18 8 -34 -6z" fill={c.hair} stroke={INK} strokeWidth="7" strokeLinejoin="round" />;
	if (c.style === 'veil')
		return <path d="M74 104 q-4 -78 76 -80 q80 2 76 80 l10 120 q-86 24 -172 0z" fill={c.veil} stroke={INK} strokeWidth="7" strokeLinejoin="round" />;
	return null;
};

const HairFront: React.FC<{c: CharDef}> = ({c}) => {
	if (c.style === 'long')
		return <path d="M82 88 q4 -52 68 -54 q64 2 68 54 q-34 -28 -68 -22 q-34 -6 -68 22z" fill={c.hair} stroke={INK} strokeWidth="6" strokeLinejoin="round" />;
	if (c.style === 'curly')
		return (
			<g>
				{[
					[96, 52],
					[122, 38],
					[150, 34],
					[178, 38],
					[204, 52],
					[84, 80],
					[216, 80],
				].map(([x, y], i) => (
					<circle key={i} cx={x} cy={y} r="22" fill={c.hair} stroke={INK} strokeWidth="5" />
				))}
			</g>
		);
	if (c.style === 'short')
		return <path d="M80 84 q2 -50 70 -52 q68 2 70 52 q-22 -22 -70 -22 q-48 0 -70 22z" fill={c.hair} stroke={INK} strokeWidth="6" strokeLinejoin="round" />;
	if (c.style === 'veil')
		return <path d="M80 80 q4 -50 70 -52 q66 2 70 52 q-30 -26 -70 -24 q-40 -2 -70 24z" fill={c.veil} stroke={INK} strokeWidth="6" strokeLinejoin="round" />;
	return null;
};

const Beard: React.FC<{c: CharDef}> = ({c}) => {
	if (!c.beard) return null;
	return c.beardBig ? (
		<path d="M84 112 q4 62 66 64 q62 -2 66 -64 q-22 28 -66 26 q-44 2 -66 -26z" fill={c.beard} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
	) : (
		<path d="M96 118 q6 48 54 50 q48 -2 54 -50 q-20 22 -54 20 q-34 2 -54 -20z" fill={c.beard} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
	);
};

const Arm: React.FC<{x: number; upper: number; fore: number; skin: string; side: 1 | -1}> = ({x, upper, fore, skin, side}) => (
	<g transform={`translate(${x} 206) rotate(${side * upper})`}>
		<line x1="0" y1="0" x2="0" y2="64" stroke={INK} strokeWidth="16" strokeLinecap="round" />
		<g transform={`translate(0 64) rotate(${side * fore})`}>
			<line x1="0" y1="0" x2="0" y2="58" stroke={INK} strokeWidth="16" strokeLinecap="round" />
			<circle cx="0" cy="62" r="14" fill={skin} stroke={INK} strokeWidth="6" />
		</g>
	</g>
);

const Leg: React.FC<{x: number; swing: number}> = ({x, swing}) => (
	<g transform={`translate(${x} 404) rotate(${swing})`}>
		<line x1="0" y1="0" x2="0" y2="128" stroke={INK} strokeWidth="16" strokeLinecap="round" />
		<ellipse cx="0" cy="136" rx="26" ry="12" fill="#3b2a1c" stroke={INK} strokeWidth="6" transform={`rotate(${-swing} 0 136)`} />
	</g>
);

export const Rig: React.FC<{
	def: CharDef;
	emotion: string;
	t: number; // seconds
	mouth: number; // 0-1 how open the mouth is while talking
	walk: number; // 0-1 walking intensity
	speaking: boolean;
	phase?: number;
}> = ({def, emotion, t, mouth, walk, speaking, phase = 0}) => {
	const E = EMOTIONS[emotion] ?? EMOTIONS.neutral;
	const w = 2 * Math.PI;
	const tt = t + phase;
	const skin = SKIN[def.skin];
	const flail = E.flail * Math.sin(tt * w * E.rate);
	const walkSwing = Math.sin(tt * w * 1.9) * 30 * walk;
	const gest = speaking ? Math.sin(tt * w * 1.6) * 16 : 0;
	const armL = E.armL + flail - walkSwing * 0.8 + gest * 0.4;
	const armR = E.armR - flail * 0.8 + walkSwing * 0.8 + gest;
	const foreL = E.foreL + flail * 0.4 + (speaking ? 8 * Math.sin(tt * w * 2.3) : 0);
	const foreR = E.foreR - flail * 0.3 + (speaking ? 14 * Math.sin(tt * w * 2.1 + 1) : 0);
	const hop = E.hop * Math.abs(Math.sin(tt * w * E.rate * 0.5)) + Math.abs(Math.sin(tt * w * 1.9)) * 14 * walk;
	const dx = E.shake * Math.sin(tt * 38) + E.shake * 0.6 * Math.sin(tt * 61);
	const dy = -hop + E.shake * 0.5 * Math.sin(tt * 47);
	const headBob = E.bob * Math.sin(tt * w * 0.9);
	const tilt = E.tilt * Math.sin(tt * w * 0.4 + 0.5) + (speaking ? 2.5 * Math.sin(tt * w * 3.5) : 0);
	const breathe = 1 + 0.012 * Math.sin(tt * w * 0.8);
	const b = (tt + 1.3) % 3.4;
	const blink = b < 0.14 ? 1 - 0.9 * Math.sin((Math.PI * b) / 0.14) : 1;
	const open = Math.max(E.open ? E.open * (0.5 + 0.5 * Math.abs(Math.sin(tt * w * 3))) : 0, mouth);
	const beardy = Boolean(def.beard);
	return (
		<svg viewBox="0 0 300 560" width="100%" height="100%" style={{overflow: 'visible'}}>
			<g transform={`translate(${dx} ${dy}) rotate(${E.lean} 150 548)`}>
				<Leg x={130} swing={swingOf(walkSwing, -1, E)} />
				<Leg x={170} swing={swingOf(walkSwing, 1, E)} />
				<Arm x={104} upper={armL} fore={foreL} skin={skin} side={1} />
				<Arm x={196} upper={armR} fore={foreR} skin={skin} side={-1} />
				<g transform={`translate(150 412) scale(1 ${breathe}) translate(-150 -412)`}>
					<rect x="92" y="176" width="116" height="236" rx="58" fill={def.robe} stroke={INK} strokeWidth="8" />
					{def.sash ? <rect x="96" y="268" width="108" height="26" fill={def.sash} stroke={INK} strokeWidth="6" /> : null}
				</g>
				<g transform={`translate(0 ${headBob}) rotate(${tilt} 150 176)`}>
					<HairBack c={def} />
					<circle cx="150" cy="96" r="72" fill={skin} stroke={INK} strokeWidth="8" />
					<Beard c={def} />
					<HairFront c={def} />
					<Face expr={E.expr} blink={blink} open={open} mouthColor={beardy ? '#f6dcc0' : INK} mouthFill={beardy ? '#b0413b' : INK} />
				</g>
			</g>
		</svg>
	);
};

const swingOf = (walkSwing: number, side: number, E: Emotion) => side * walkSwing + (side < 0 ? -3 : 3) * (E.armL > 60 ? 0.5 : 1);
