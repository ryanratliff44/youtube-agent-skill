import React from 'react';

// Flat 2D "stick figure" characters in the style of the reference Shorts:
// pure white round head, thick black outline, dot eyes with heavy lids, thin black limbs, flat colored clothes.
// Everything is animated from code: weight shifts, bent knees, squash and stretch, nods on narration words,
// gestures, walking, blinking, talking mouths and a hand-drawn face for every emotion.

const INK = '#16110d';
const FACE = '#f8f6f0';
const D = Math.PI / 180;

export type Hat = 'none' | 'helmet' | 'crown' | 'headband' | 'turban' | 'hood';
export type Def2D = {
	robe: string;
	trim?: string; // belt / hem color
	hair?: string;
	hairStyle: 'none' | 'short' | 'long' | 'curly' | 'bald';
	beard?: string;
	hat?: Hat;
	hatColor?: string;
	armor?: string; // chest plates
	robeStyle: 'robe' | 'tunic'; // robe flares to the ankles, tunic stops at the knee
	extras?: ('sling' | 'spear' | 'sword' | 'shield' | 'staff' | 'bag')[];
	big?: number; // body scale for giants
};

export const CHAR2D: Record<string, Def2D> = {
	jesus: {robe: '#f3ead8', trim: '#3f6fb5', hair: '#5a3a22', hairStyle: 'long', beard: '#5a3a22', robeStyle: 'robe'},
	peter: {robe: '#6f8668', trim: '#4b3a28', hair: '#2c1b12', hairStyle: 'curly', beard: '#2c1b12', robeStyle: 'tunic'},
	john: {robe: '#c4ad80', trim: '#7a6238', hair: '#4a3322', hairStyle: 'short', robeStyle: 'tunic'},
	david: {robe: '#b5653a', trim: '#5a3418', hair: '#7a3f1d', hairStyle: 'curly', robeStyle: 'tunic', extras: ['sling', 'bag']},
	goliath: {robe: '#6d6d78', trim: '#2e2e36', hair: '#1c1612', hairStyle: 'short', beard: '#1c1612', hat: 'helmet', hatColor: '#9aa0aa', armor: '#4a4e5a', robeStyle: 'tunic', extras: ['spear', 'shield'], big: 1.55},
	saul: {robe: '#7a2f45', trim: '#d4a64a', hair: '#3a2a1a', hairStyle: 'short', beard: '#3a2a1a', hat: 'crown', hatColor: '#d4a64a', robeStyle: 'robe'},
	soldier: {robe: '#8a5a3a', trim: '#3a2a1a', hair: '#2a1c12', hairStyle: 'short', hat: 'helmet', hatColor: '#8f959f', armor: '#6a6f7a', robeStyle: 'tunic', extras: ['spear']},
	israelite: {robe: '#7b9a6a', trim: '#4a5a3a', hair: '#3a2a1a', hairStyle: 'short', hat: 'headband', hatColor: '#c9b48a', robeStyle: 'tunic'},
	mary: {robe: '#e9e2d0', trim: '#3f6fb5', hairStyle: 'none', hat: 'hood', hatColor: '#3f6fb5', robeStyle: 'robe'},
	crowd: {robe: '#7d8f5a', trim: '#5b6a3e', hair: '#6b4a2a', hairStyle: 'short', robeStyle: 'tunic'},
};

type Emo = {armL: number; armR: number; lean: number; bob: number; tilt: number; rate: number; bounce?: boolean};
const EMO: Record<string, Emo> = {
	neutral: {armL: 12, armR: 12, lean: 0, bob: 3, tilt: 2, rate: 0.9},
	calm: {armL: 10, armR: 10, lean: 0, bob: 2, tilt: 1.5, rate: 0.6},
	warm: {armL: 10, armR: 14, lean: 1, bob: 2, tilt: 3, rate: 0.6},
	joy: {armL: 30, armR: 30, lean: 2, bob: 5, tilt: 4, rate: 2, bounce: true},
	laugh: {armL: 18, armR: 18, lean: -4, bob: 6, tilt: 6, rate: 2.4, bounce: true},
	fear: {armL: 28, armR: 28, lean: -5, bob: 3, tilt: 3, rate: 2.6},
	panic: {armL: 40, armR: 40, lean: -2, bob: 4, tilt: 4, rate: 3.4},
	anger: {armL: 14, armR: 42, lean: 8, bob: 4, tilt: -3, rate: 2.2},
	sad: {armL: 6, armR: 6, lean: 6, bob: 2, tilt: 9, rate: 0.5},
	awe: {armL: 26, armR: 26, lean: -7, bob: 3, tilt: -2, rate: 1.1},
	sleep: {armL: 8, armR: 8, lean: 3, bob: 3, tilt: 8, rate: 0.35},
	smug: {armL: 12, armR: 34, lean: -2, bob: 2, tilt: -4, rate: 0.7},
	command: {armL: 10, armR: 62, lean: 2, bob: 2, tilt: 0, rate: 0.6},
};

// ------------------------------------------------------------------ face (head-local units like the 3D version, x right, y up)
const FX = 167; // head radius 72px = 0.43 units
type P = [number, number];
const px = (p: P): P => [150 + p[0] * FX, 96 - p[1] * FX];

const path = (pts: P[]) => {
	const q = pts.map(px);
	if (q.length < 3) return `M${q[0][0]} ${q[0][1]} L${q[1][0]} ${q[1][1]}`;
	let d = `M${q[0][0]} ${q[0][1]}`;
	for (let i = 1; i < q.length - 1; i++) {
		const mx = (q[i][0] + q[i + 1][0]) / 2;
		const my = (q[i][1] + q[i + 1][1]) / 2;
		d += ` Q${q[i][0]} ${q[i][1]} ${mx} ${my}`;
	}
	const l = q[q.length - 1];
	return d + ` L${l[0]} ${l[1]}`;
};

const S: React.FC<{pts: P[]; w?: number}> = ({pts, w = 5}) => <path d={path(pts)} stroke={INK} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />;

const ex = (s: number, u: number, span = 0.085) => s * (0.15 - u * span);
const brow = (s: number, oy: number, iy: number, arch = 0.012, by = 0.145): P[] => [[ex(s, -1), by + oy], [ex(s, 0), by + (oy + iy) / 2 + arch], [ex(s, 1), by + iy]];
const lid = (s: number, ey = 0.05, drop = 0.016, tilt = 0): P[] => [[ex(s, -1, 0.07), ey + 0.034 - drop - tilt], [ex(s, 0, 0.07), ey + 0.044 - drop], [ex(s, 1, 0.07), ey + 0.034 - drop + tilt]];
const happy = (s: number, up = true): P[] => [[ex(s, -1, 0.07), 0.04 + (up ? -0.002 : 0.012)], [ex(s, 0, 0.07), 0.04 + (up ? 0.04 : -0.03)], [ex(s, 1, 0.07), 0.04 + (up ? -0.002 : 0.012)]];

const Dot: React.FC<{x: number; y: number; r?: number; sy?: number}> = ({x, y, r = 7.4, sy = 1}) => {
	const [cx, cy] = px([x, y]);
	return <ellipse cx={cx} cy={cy} rx={r} ry={r * sy} fill={INK} />;
};
const Ring: React.FC<{x: number; y: number; r?: number; pupil?: number; look?: number}> = ({x, y, r = 11, pupil = 3.4, look = 0}) => {
	const [cx, cy] = px([x, y]);
	return (
		<g>
			<circle cx={cx} cy={cy} r={r} fill="#fff" stroke={INK} strokeWidth="3.4" />
			<circle cx={cx + look * 2} cy={cy} r={pupil} fill={INK} />
		</g>
	);
};
const Drop: React.FC<{x: number; y: number}> = ({x, y}) => {
	const [cx, cy] = px([x, y]);
	return <path d={`M${cx} ${cy - 10} Q${cx + 8} ${cy + 2} ${cx} ${cy + 8} Q${cx - 8} ${cy + 2} ${cx} ${cy - 10}Z`} fill="#bfe6ff" stroke={INK} strokeWidth="2.6" />;
};
const Grin: React.FC<{open: number; w?: number}> = ({open, w = 0.085}) => {
	const [cx, cy] = px([0, -0.15]);
	const rw = w * FX;
	const rh = (0.036 + open * 0.05) * FX;
	return (
		<g>
			<ellipse cx={cx} cy={cy} rx={rw} ry={rh} fill={INK} />
			<rect x={cx - rw * 0.78} y={cy - rh * 0.78} width={rw * 1.56} height={rh * 0.62} rx="3" fill="#fff" />
		</g>
	);
};
const Talk: React.FC<{open: number; w?: number; h?: number; y?: number}> = ({open, w = 0.05, h = 0.014, y = -0.17}) => {
	const [cx, cy] = px([0, y]);
	return <ellipse cx={cx} cy={cy} rx={(w + open * 0.03) * FX} ry={(h + open * 0.045) * FX} fill={INK} />;
};

const Face: React.FC<{emo: string; blink: number; open: number; look: number; pulse: number; t: number}> = ({emo, blink, open, look, pulse, t}) => {
	const sides = [-1, 1];
	const lift = pulse * 0.012;
	const talk = open > 0.06;
	const eye = (s: number, y = 0.045) => <Dot key={s} x={ex(s, 0) + look * 0.012} y={y} sy={blink} />;
	let eyes: React.ReactNode;
	let brows: React.ReactNode;
	let mouth: React.ReactNode;
	let extra: React.ReactNode = null;
	switch (emo) {
		case 'joy':
			eyes = sides.map((s) => <S key={s} pts={happy(s)} />);
			brows = sides.map((s) => <S key={s} pts={brow(s, 0.02, 0.025, 0.02, 0.17)} />);
			mouth = <Grin open={talk ? open : 0.25} />;
			break;
		case 'laugh':
			eyes = sides.map((s) => <S key={s} pts={happy(s)} w={5.5} />);
			brows = sides.map((s) => <S key={s} pts={brow(s, 0.025, 0.03, 0.02, 0.17)} />);
			mouth = <Grin open={0.5 + 0.4 * Math.abs(Math.sin(t * 14))} w={0.095} />;
			break;
		case 'fear':
			eyes = sides.map((s) => eye(s, 0.04));
			brows = sides.map((s) => <S key={s} pts={brow(s, -0.015, 0.05, 0, 0.15 + lift)} />);
			mouth = talk ? <Talk open={open} h={0.02} y={-0.18} /> : <S pts={[[-0.07, -0.19], [-0.03, -0.178], [0.03, -0.178], [0.07, -0.19]]} />;
			break;
		case 'panic':
			eyes = sides.map((s) => <Ring key={s} x={ex(s, 0)} y={0.06} look={look} />);
			brows = sides.map((s) => <S key={s} pts={brow(s, 0.01, 0.065, 0, 0.17 + lift)} />);
			mouth = <Talk open={talk ? open : 0.5} w={0.06} h={0.05} y={-0.18} />;
			extra = <Drop x={0.31} y={0.1} />;
			break;
		case 'anger':
			eyes = sides.map((s) => eye(s, 0.035));
			brows = sides.map((s) => <S key={s} pts={brow(s, 0.03, -0.045, 0, 0.135)} w={6} />);
			mouth = talk ? <Talk open={open} w={0.06} h={0.025} y={-0.18} /> : <S pts={[[-0.1, -0.17], [-0.065, -0.185], [-0.03, -0.165], [0.005, -0.185], [0.04, -0.165], [0.075, -0.185], [0.1, -0.17]]} />;
			break;
		case 'sad':
			eyes = sides.map((s) => eye(s, 0.03));
			brows = sides.map((s) => <S key={s} pts={brow(s, -0.03, 0.045, 0, 0.13)} />);
			mouth = talk ? <Talk open={open} w={0.04} h={0.02} y={-0.2} /> : <S pts={[[-0.075, -0.215], [-0.035, -0.19], [0.035, -0.19], [0.075, -0.215]]} />;
			extra = <Drop x={0.17} y={-0.05} />;
			break;
		case 'awe': {
			const [mx, my] = px([0, -0.18]);
			eyes = sides.map((s) => <Ring key={s} x={ex(s, 0)} y={0.06} r={10.5} pupil={3.4} look={look} />);
			brows = sides.map((s) => <S key={s} pts={brow(s, 0.04, 0.05, 0.03, 0.175 + lift)} />);
			mouth = talk ? <Talk open={open} w={0.045} h={0.04} y={-0.18} /> : <ellipse cx={mx} cy={my} rx="6" ry="8" fill="none" stroke={INK} strokeWidth="4" />;
			break;
		}
		case 'smug':
			eyes = sides.map((s) => (
				<g key={s}>
					{eye(s, 0.04)}
					<S pts={lid(s, 0.04, 0.004)} w={6} />
				</g>
			));
			brows = (
				<>
					<S pts={brow(-1, -0.005, -0.018, 0, 0.13)} />
					<S pts={brow(1, 0.06, 0.04, 0.03, 0.155)} />
				</>
			);
			mouth = talk ? <Talk open={open} h={0.02} /> : <S pts={[[-0.07, -0.165], [-0.02, -0.175], [0.05, -0.17], [0.1, -0.135]]} />;
			break;
		case 'warm':
			eyes = sides.map((s) => (
				<g key={s}>
					{eye(s, 0.045)}
					<S pts={lid(s, 0.045, 0.012)} w={4.5} />
				</g>
			));
			brows = sides.map((s) => <S key={s} pts={brow(s, 0.01, 0, 0.02, 0.15 + lift)} />);
			mouth = talk ? <Talk open={open} w={0.05} h={0.02} y={-0.16} /> : <S pts={[[-0.085, -0.13], [-0.045, -0.165], [0.045, -0.165], [0.085, -0.13]]} />;
			break;
		case 'sleep':
			eyes = sides.map((s) => <S key={s} pts={happy(s, false)} w={4.5} />);
			brows = sides.map((s) => <S key={s} pts={brow(s, 0, 0, 0.012, 0.125)} w={3.8} />);
			mouth = <S pts={[[-0.04, -0.17], [0, -0.178], [0.04, -0.17]]} w={3.8} />;
			break;
		case 'command':
		case 'calm':
			eyes = sides.map((s) => (
				<g key={s}>
					{eye(s, 0.04)}
					<S pts={lid(s, 0.04, 0.006)} w={6} />
				</g>
			));
			brows = sides.map((s) => <S key={s} pts={brow(s, 0, -0.005, 0.015, 0.14 + lift)} />);
			mouth = talk ? <Talk open={open} h={0.018} /> : <S pts={[[-0.06, -0.17], [-0.02, -0.178], [0.02, -0.178], [0.06, -0.17]]} />;
			break;
		default:
			eyes = sides.map((s) => (
				<g key={s}>
					{eye(s, 0.042)}
					<S pts={lid(s, 0.042, 0.008, 0.004)} w={6} />
				</g>
			));
			brows = sides.map((s) => <S key={s} pts={brow(s, 0.005, -0.012, 0.012, 0.14 + lift)} />);
			mouth = talk ? <Talk open={open} h={0.018} /> : <S pts={[[-0.05, -0.17], [0, -0.176], [0.05, -0.17]]} />;
	}
	return (
		<g>
			{eyes}
			{brows}
			{mouth}
			{extra}
		</g>
	);
};

// ------------------------------------------------------------------ the rig
export type Rig2DProps = {
	def: string;
	emotion: string;
	t: number;
	mouth: number;
	walk: number;
	speaking: boolean;
	phase?: number;
	wordAge?: number;
	wordIdx?: number;
	look?: number;
};

const Limb: React.FC<{x: number; y: number; rot: number; len: number; children?: React.ReactNode; w?: number}> = ({x, y, rot, len, children, w = 9}) => (
	<g transform={`translate(${x} ${y}) rotate(${rot})`}>
		<line x1="0" y1="0" x2="0" y2={len} stroke={INK} strokeWidth={w} strokeLinecap="round" />
		{children}
	</g>
);

export const Rig2D: React.FC<Rig2DProps> = ({def: key, emotion, t, mouth, walk, speaking, phase = 0, wordAge = 9, wordIdx = 0, look = 0}) => {
	const def = CHAR2D[key] ?? CHAR2D.crowd;
	const E = EMO[emotion] ?? EMO.neutral;
	const w = 2 * Math.PI;
	const tt = t + phase;
	const pulse = wordAge < 0.28 ? Math.sin((Math.PI * wordAge) / 0.28) : 0;
	const emphasis = wordAge < 0.75 && wordIdx % 3 === 0 ? Math.sin((Math.PI * wordAge) / 0.75) : 0;
	const side = wordIdx % 2 === 0 ? 1 : -1;
	const shift = Math.sin(tt * w * 0.33);
	const sway = (2.2 + (E.bounce ? 1.5 : 0.8)) * shift;
	const shiftX = 5 * shift;
	const bounce = E.bounce ? 0.3 * Math.abs(Math.sin(tt * w * E.rate * 0.5)) : 0;
	const bend = (9 + 4 * Math.sin(tt * w * 0.5) + 10 * pulse * (speaking ? 1 : 0.3) + 16 * bounce + (emotion === 'sad' ? 8 : 0) + (emotion === 'anger' ? 6 : 0)) * D;
	const L = 70; // thigh and shin length
	const drop = 2 * L * (1 - Math.cos(bend));
	const squash = 1 + 0.035 * Math.sin(tt * w * 0.8) - 0.05 * pulse * (speaking ? 1 : 0.3) - 0.05 * bounce;
	const stepA = walk > 0 ? 30 * Math.sin(tt * w * 1.9) : 0;
	const hop = Math.abs(Math.sin(tt * w * 1.9)) * 9 * walk + 34 * bounce;
	const rest = 11 + 3 * Math.sin(tt * w * 0.4);
	const baseL = Math.min(55, 10 + (E.armL - 10) * 0.45);
	const baseR = Math.min(55, 10 + (E.armR - 10) * 0.45);
	const gestAmp = speaking ? 34 : 4;
	const armL = baseL + rest * 0.3 - stepA * 0.8 + (side < 0 ? emphasis * gestAmp : emphasis * 6);
	const armR = baseR + rest * 0.3 + stepA * 0.8 + (side > 0 ? emphasis * gestAmp : emphasis * 6);
	const foreL = 14 + (side < 0 ? emphasis * (speaking ? 42 : 4) : 0) + 4 * Math.sin(tt * w * 0.7);
	const foreR = 14 + (side > 0 ? emphasis * (speaking ? 42 : 4) : 0) + 4 * Math.sin(tt * w * 0.7 + 1);
	const listenNod = !speaking ? Math.max(0, Math.sin(tt * w * 0.42 + phase * 5)) ** 6 : 0;
	const nod = -6 * pulse * (speaking ? 1 : 0) - 4 * listenNod + (emotion === 'anger' ? 4 : 0) + (emotion === 'sad' ? 6 : 0);
	const headBob = E.bob * Math.sin(tt * w * 0.9) * 0.5 - 4 * pulse;
	const tilt = E.tilt * Math.sin(tt * w * 0.4 + 0.5) + (speaking ? 4 * side * emphasis : 0);
	const b = (tt + 1.3) % 3.4;
	const blink = b < 0.14 ? 1 - 0.9 * Math.sin((Math.PI * b) / 0.14) : 1;
	const open = Math.max(mouth, 0);
	const lean = E.lean * 0.45 + (speaking ? 3 * pulse : 0);

	const robeH = def.robeStyle === 'robe' ? 150 : 96;
	const legTop = 408;
	const skin = FACE;
	return (
		<svg viewBox="0 0 300 560" width="100%" height="100%" style={{overflow: 'visible'}}>
			<g transform={`translate(${shiftX} ${-hop}) rotate(${sway} 150 548)`}>
				{/* legs: thigh and shin with a knee, feet planted */}
				{[-1, 1].map((sd) => {
					const lift = walk > 0 ? Math.max(0, -sd * Math.sin(tt * w * 1.9)) : 0;
					const a = (bend / D) * 0.45;
					return (
						<Limb key={sd} x={150 + sd * 20} y={legTop + drop} rot={-sd * (a + 2)} len={L}>
							<Limb x={0} y={L} rot={sd * (2 * a) + sd * lift * 38} len={L} />
						</Limb>
					);
				})}
				<g transform={`translate(0 ${drop}) rotate(${lean} 150 410)`}>
					<g transform={`translate(150 300) scale(${1 / Math.sqrt(squash)} ${squash}) translate(-150 -300)`}>
						{/* clothing: robe skirt, torso bean, belt */}
						<path d={`M118 292 L${def.robeStyle === 'robe' ? 84 : 100} ${292 + robeH} Q150 ${300 + robeH} ${def.robeStyle === 'robe' ? 216 : 200} ${292 + robeH} L182 292Z`} fill={def.robe} stroke={INK} strokeWidth="7" strokeLinejoin="round" />
						<rect x="108" y="180" width="84" height="130" rx="40" fill={def.robe} stroke={INK} strokeWidth="7" />
						{def.armor ? (
							<g>
								<rect x="112" y="192" width="76" height="30" rx="12" fill={def.armor} stroke={INK} strokeWidth="5" />
								<rect x="112" y="226" width="76" height="30" rx="12" fill={def.armor} stroke={INK} strokeWidth="5" />
								<path d={`M104 292 L100 ${292 + robeH * 0.55} L200 ${292 + robeH * 0.55} L196 292Z`} fill={def.armor} stroke={INK} strokeWidth="5" />
							</g>
						) : null}
						{def.trim ? <rect x="109" y="284" width="82" height="16" fill={def.trim} stroke={INK} strokeWidth="5" /> : null}
						{def.extras?.includes('bag') ? <rect x="172" y="262" width="34" height="38" rx="8" fill="#8a6a3a" stroke={INK} strokeWidth="5" /> : null}
						{/* arms */}
						{[-1, 1].map((sd) => {
							const up = sd < 0 ? armL : armR;
							const fo = sd < 0 ? foreL : foreR;
							return (
								<Limb key={sd} x={150 + sd * 40} y={212} rot={-sd * up} len={58}>
									<Limb x={0} y={58} rot={-sd * fo * 0.7} len={54}>
										<circle cx="0" cy="58" r="8" fill={INK} />
										{sd > 0 && def.extras?.includes('spear') ? <line x1="0" y1="62" x2="0" y2="-170" stroke={INK} strokeWidth="8" strokeLinecap="round" /> : null}
										{sd > 0 && def.extras?.includes('sling') ? <path d="M0 62 q16 40 -4 80" stroke="#7a5a30" strokeWidth="4" fill="none" /> : null}
										{sd < 0 && def.extras?.includes('shield') ? <ellipse cx="-18" cy="40" rx="30" ry="42" fill="#7a5a3a" stroke={INK} strokeWidth="6" /> : null}
									</Limb>
								</Limb>
							);
						})}
						{/* head */}
						<g transform={`translate(0 ${headBob}) rotate(${tilt + nod * 0.3} 150 170)`}>
							{def.hairStyle === 'long' ? <path d="M82 100 Q70 190 96 200 L204 200 Q230 190 218 100 Z" fill={def.hair} stroke={INK} strokeWidth="6" /> : null}
							{def.hat === 'hood' ? <path d="M70 110 Q150 -10 230 110 L240 200 L60 200Z" fill={def.hatColor} stroke={INK} strokeWidth="6" /> : null}
							<circle cx="150" cy="96" r="72" fill={skin} stroke={INK} strokeWidth="8" />
							{def.beard ? <path d="M88 110 Q92 190 150 196 Q208 190 212 110 Q190 150 150 148 Q110 150 88 110Z" fill={def.beard} stroke={INK} strokeWidth="5" /> : null}
							{def.hairStyle === 'short' ? <path d="M80 92 Q82 28 150 26 Q218 28 220 92 Q196 54 150 54 Q104 54 80 92Z" fill={def.hair} stroke={INK} strokeWidth="6" strokeLinejoin="round" /> : null}
							{def.hairStyle === 'long' ? <path d="M82 92 Q86 28 150 26 Q214 28 218 92 Q190 56 150 58 Q110 56 82 92Z" fill={def.hair} stroke={INK} strokeWidth="6" strokeLinejoin="round" /> : null}
							{def.hairStyle === 'curly' ? (
								<g fill={def.hair} stroke={INK} strokeWidth="5">
									{[[100, 44], [128, 30], [158, 28], [186, 34], [208, 56], [92, 70], [214, 82]].map(([x, y], i) => (
										<circle key={i} cx={x} cy={y} r="20" />
									))}
								</g>
							) : null}
							{def.hat === 'helmet' ? (
								<g>
									<path d="M76 90 Q78 18 150 14 Q222 18 224 90 L210 82 Q150 50 90 82Z" fill={def.hatColor} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
									<rect x="140" y="2" width="20" height="40" fill={def.hatColor} stroke={INK} strokeWidth="5" />
								</g>
							) : null}
							{def.hat === 'crown' ? <path d="M96 40 L104 6 L128 30 L150 0 L172 30 L196 6 L204 40Z" fill={def.hatColor} stroke={INK} strokeWidth="5" strokeLinejoin="round" /> : null}
							{def.hat === 'headband' ? <rect x="80" y="54" width="140" height="14" fill={def.hatColor} stroke={INK} strokeWidth="5" /> : null}
							<Face emo={emotion} blink={blink} open={open} look={look} pulse={pulse} t={t} />
						</g>
					</g>
				</g>
			</g>
		</svg>
	);
};
