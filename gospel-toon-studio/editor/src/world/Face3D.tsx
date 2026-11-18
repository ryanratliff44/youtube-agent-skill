import React, {useMemo} from 'react';
import * as THREE from 'three';

// A hand-drawn style face on the white head: smooth ink strokes for brows, lids and mouths,
// dot or ring eyes, sweat and tears. Every emotion has its own distinct look.

const INK = '#16110d';
const R = 0.43; // head radius

type P = [number, number];

const onSphere = (x: number, y: number, lift = 0.006): THREE.Vector3 => {
	const rr = Math.min(0.97 * R, Math.hypot(x, y));
	const k = rr / (Math.hypot(x, y) || 1);
	const cx = x * k;
	const cy = y * k;
	return new THREE.Vector3(cx, cy, Math.sqrt(Math.max(0.0001, R * R - cx * cx - cy * cy)) + lift);
};

const Stroke: React.FC<{pts: P[]; r?: number; color?: string; closed?: boolean}> = ({pts, r = 0.0155, color = INK, closed = false}) => {
	const key = pts.map((p) => p.join(',')).join('|') + r + closed;
	const geo = useMemo(() => {
		const v = pts.map(([x, y]) => onSphere(x, y));
		const curve = new THREE.CatmullRomCurve3(v, closed, 'catmullrom', 0.5);
		return new THREE.TubeGeometry(curve, Math.max(10, pts.length * 8), r, 6, closed);
	}, [key]);
	return (
		<mesh geometry={geo}>
			<meshBasicMaterial color={color} />
		</mesh>
	);
};

const Dot: React.FC<{x: number; y: number; r: number; sy?: number}> = ({x, y, r, sy = 1}) => {
	const p = onSphere(x, y, 0.004);
	return (
		<mesh position={p} scale={[1, sy, 0.35]}>
			<sphereGeometry args={[r, 14, 10]} />
			<meshBasicMaterial color={INK} />
		</mesh>
	);
};

const Ring: React.FC<{x: number; y: number; r: number; pupil: number; px?: number}> = ({x, y, r, pupil, px = 0}) => {
	const p = onSphere(x, y, 0.004);
	return (
		<group position={p}>
			<mesh>
				<circleGeometry args={[r + 0.014, 22]} />
				<meshBasicMaterial color={INK} />
			</mesh>
			<mesh position={[0, 0, 0.003]}>
				<circleGeometry args={[r, 22]} />
				<meshBasicMaterial color="#ffffff" />
			</mesh>
			<mesh position={[px, 0, 0.006]}>
				<circleGeometry args={[pupil, 14]} />
				<meshBasicMaterial color={INK} />
			</mesh>
		</group>
	);
};

const Drop: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => {
	const p = onSphere(x, y, 0.01);
	return (
		<group position={p} scale={s}>
			<mesh scale={[1, 1.45, 0.3]}>
				<sphereGeometry args={[0.04, 12, 10]} />
				<meshBasicMaterial color={INK} />
			</mesh>
			<mesh position={[0, 0, 0.004]} scale={[1, 1.45, 0.3]}>
				<sphereGeometry args={[0.031, 12, 10]} />
				<meshBasicMaterial color="#bfe6ff" />
			</mesh>
		</group>
	);
};

// x for an eye side (s = -1 left, +1 right) and a position u along it: -1 = outer end, +1 = inner end
const ex = (s: number, u: number, span = 0.085) => s * (0.15 - u * span);

const brow = (s: number, outerY: number, innerY: number, arch = 0.012, by = 0.145): P[] => [
	[ex(s, -1), by + outerY],
	[ex(s, 0), by + (outerY + innerY) / 2 + arch],
	[ex(s, 1), by + innerY],
];

// the heavy half-closed upper lid that gives the characters their dry, unimpressed look
const lid = (s: number, tilt = 0, ey = 0.05, drop = 0.016): P[] => [
	[ex(s, -1, 0.07), ey + 0.034 - drop - tilt],
	[ex(s, 0, 0.07), ey + 0.044 - drop],
	[ex(s, 1, 0.07), ey + 0.034 - drop + tilt],
];

const happyArc = (s: number, up = true): P[] => [
	[ex(s, -1, 0.07), 0.04 + (up ? -0.002 : 0.012)],
	[ex(s, 0, 0.07), 0.04 + (up ? 0.04 : -0.03)],
	[ex(s, 1, 0.07), 0.04 + (up ? -0.002 : 0.012)],
];

const Grin: React.FC<{open: number; w?: number}> = ({open, w = 0.085}) => {
	const h = 0.036 + open * 0.05;
	return (
		<group position={onSphere(0, -0.15, 0.004)}>
			<mesh scale={[w, h, 0.02]}>
				<sphereGeometry args={[1, 18, 12]} />
				<meshBasicMaterial color={INK} />
			</mesh>
			<mesh position={[0, h * 0.45, 0.03]} scale={[w * 0.8, h * 0.4, 1]}>
				<boxGeometry args={[1, 1, 0.01]} />
				<meshBasicMaterial color="#ffffff" />
			</mesh>
		</group>
	);
};

export type FaceProps = {emotion: string; blink: number; open: number; look: number; pulse: number; t: number};

export const Face: React.FC<FaceProps> = ({emotion: e, blink, open, look, pulse, t}) => {
	const sides = [-1, 1];
	const lift = pulse * 0.012; // brows pop up a hair on stressed words
	const eyeDot = (s: number, r = 0.043, y = 0.045) => <Dot key={s} x={ex(s, 0) + look * 0.012} y={y} r={r} sy={blink} />;

	let eyes: React.ReactNode;
	let brows: React.ReactNode;
	let mouth: React.ReactNode;
	let extra: React.ReactNode = null;

	const talk = open > 0.06;
	const talking = (w = 0.05, h = 0.012, y = -0.16) => (
		<group position={onSphere(0, y, 0.004)} scale={[w + open * 0.035, h + open * 0.05, 0.02]}>
			<mesh>
				<sphereGeometry args={[1, 16, 12]} />
				<meshBasicMaterial color={INK} />
			</mesh>
		</group>
	);

	switch (e) {
		case 'joy':
			eyes = sides.map((s) => <Stroke key={s} pts={happyArc(s)} r={0.016} />);
			brows = sides.map((s) => <Stroke key={s} pts={brow(s, 0.02, 0.025, 0.02, 0.17)} />);
			mouth = <Grin open={talk ? open : 0.25} />;
			break;
		case 'laugh':
			eyes = sides.map((s) => <Stroke key={s} pts={happyArc(s)} r={0.017} />);
			brows = sides.map((s) => <Stroke key={s} pts={brow(s, 0.025, 0.03, 0.02, 0.17)} />);
			mouth = <Grin open={0.5 + 0.4 * Math.abs(Math.sin(t * 14))} w={0.095} />;
			break;
		case 'fear':
			eyes = sides.map((s) => eyeDot(s, 0.04, 0.04));
			brows = sides.map((s) => <Stroke key={s} pts={brow(s, -0.015, 0.05, 0.0, 0.15 + lift)} />);
			mouth = talk ? talking(0.045, 0.02, -0.18) : <Stroke pts={[[-0.075, -0.19], [-0.04, -0.175], [0, -0.195], [0.04, -0.175], [0.075, -0.19]]} />;
			extra = <Drop x={0.3} y={0.12 - ((t * 0.07) % 0.1)} />;
			break;
		case 'panic':
			eyes = sides.map((s) => <Ring key={s} x={ex(s, 0)} y={0.06} r={0.068} pupil={0.017} px={look * 0.012} />);
			brows = sides.map((s) => <Stroke key={s} pts={brow(s, 0.01, 0.065, 0.0, 0.17 + lift)} />);
			mouth = talking(0.06, 0.05 + 0.02 * Math.abs(Math.sin(t * 16)), -0.18);
			extra = (
				<>
					<Drop x={0.31} y={0.14 - ((t * 0.09) % 0.12)} />
					<Drop x={-0.33} y={0.08 - ((t * 0.08 + 0.05) % 0.1)} s={0.8} />
				</>
			);
			break;
		case 'anger':
			eyes = sides.map((s) => eyeDot(s, 0.042, 0.035));
			brows = sides.map((s) => <Stroke key={s} pts={brow(s, 0.03, -0.045, 0.0, 0.135)} r={0.019} />);
			mouth = talk ? talking(0.06, 0.025, -0.18) : <Stroke pts={[[-0.1, -0.17], [-0.065, -0.185], [-0.03, -0.165], [0.005, -0.185], [0.04, -0.165], [0.075, -0.185], [0.1, -0.17]]} />;
			break;
		case 'sad':
			eyes = sides.map((s) => eyeDot(s, 0.042, 0.03));
			brows = sides.map((s) => <Stroke key={s} pts={brow(s, -0.03, 0.045, 0.0, 0.13)} />);
			mouth = talk ? talking(0.04, 0.02, -0.2) : <Stroke pts={[[-0.075, -0.215], [-0.035, -0.19], [0.035, -0.19], [0.075, -0.215]]} />;
			extra = <Drop x={0.17} y={-0.05 - ((t * 0.06) % 0.12)} s={0.85} />;
			break;
		case 'awe':
			eyes = sides.map((s) => <Ring key={s} x={ex(s, 0)} y={0.06} r={0.062} pupil={0.02} px={look * 0.01} />);
			brows = sides.map((s) => <Stroke key={s} pts={brow(s, 0.04, 0.05, 0.03, 0.175 + lift)} />);
			mouth = talk ? talking(0.045, 0.04, -0.18) : (
				<group position={onSphere(0, -0.18, 0.004)}>
					<mesh scale={[1, 1.2, 0.3]}>
						<torusGeometry args={[0.032, 0.012, 8, 16]} />
						<meshBasicMaterial color={INK} />
					</mesh>
				</group>
			);
			break;
		case 'smug':
			eyes = sides.map((s) => (
				<group key={s}>
					{eyeDot(s, 0.043, 0.04)}
					<Stroke pts={lid(s, 0, 0.04, 0.004)} r={0.021} />
				</group>
			));
			brows = (
				<>
					<Stroke pts={brow(-1, -0.005, -0.018, 0.0, 0.13)} />
					<Stroke pts={brow(1, 0.06, 0.04, 0.03, 0.155)} />
				</>
			);
			mouth = talk ? talking(0.05, 0.02, -0.17) : <Stroke pts={[[-0.07, -0.165], [-0.02, -0.175], [0.05, -0.17], [0.1, -0.135]]} />;
			break;
		case 'command':
		case 'calm':
			eyes = sides.map((s) => (
				<group key={s}>
					{eyeDot(s, 0.043, 0.04)}
					<Stroke pts={lid(s, 0, 0.04, 0.006)} r={0.02} />
				</group>
			));
			brows = sides.map((s) => <Stroke key={s} pts={brow(s, 0.0, -0.005, 0.015, 0.14 + lift)} />);
			mouth = talk ? talking(0.045, 0.018, -0.17) : <Stroke pts={[[-0.06, -0.17], [-0.02, -0.178], [0.02, -0.178], [0.06, -0.17]]} />;
			break;
		case 'sleep':
			eyes = sides.map((s) => <Stroke key={s} pts={happyArc(s, false)} r={0.015} />);
			brows = sides.map((s) => <Stroke key={s} pts={brow(s, 0.0, 0.0, 0.012, 0.125)} r={0.013} />);
			mouth = <Stroke pts={[[-0.04, -0.17], [0, -0.178], [0.04, -0.17]]} r={0.013} />;
			break;
		default: // neutral: dry, half-lidded
			eyes = sides.map((s) => (
				<group key={s}>
					{eyeDot(s, 0.043, 0.042)}
					<Stroke pts={lid(s, 0.004, 0.042, 0.008)} r={0.02} />
				</group>
			));
			brows = sides.map((s) => <Stroke key={s} pts={brow(s, 0.005, -0.012, 0.012, 0.14 + lift)} />);
			mouth = talk ? talking(0.045, 0.018, -0.17) : <Stroke pts={[[-0.05, -0.17], [0, -0.176], [0.05, -0.17]]} />;
	}
	return (
		<group>
			{eyes}
			{brows}
			{mouth}
			{extra}
		</group>
	);
};
