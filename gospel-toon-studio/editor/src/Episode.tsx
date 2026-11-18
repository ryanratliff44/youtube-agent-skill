import React from 'react';
import {CHARS, Rig} from './Character';
import {World, sceneFlash, stageToWorld, Placed} from './world/World';
import {SCENES} from './world/Scenes';
import {cameraFor} from './world/cameras';
import {V3, easeInOut, lerp, project} from './world/math';
import {
	AbsoluteFill,
	Audio,
	Img,
	interpolate,
	OffthreadVideo,
	Sequence,
	spring,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

export type Actor = {
	char: string; // jesus, peter, john, mary, crowd
	emotion: string; // neutral, calm, joy, laugh, fear, panic, anger, sad, awe, sleep, smug, command
	x: number; // 0..1 across the frame (center of the character)
	y: number; // 0..1 down the frame (where the feet stand)
	scale: number;
	flip: boolean;
	glow?: boolean;
	speak?: boolean; // this character's mouth moves with the narration words
	move?: {x?: number; y?: number; at?: [number, number]}; // walks to this spot during the shot
	at?: [number, number]; // 3D scenes: where they stand on the stage (boat deck: x along the boat, z across)
	lift?: number; // 3D scenes: height above the stage (jumping, standing on a seat)
};

type CaptionItem = {text: string; start: number; end: number};

export type Shot = {
	id: string;
	src: string | null;
	type: 'video' | 'image' | 'card' | 'scene';
	start: number;
	end: number;
	motion: string;
	text?: string;
	actors?: Actor[];
	mood?: 'day' | 'dusk' | 'night' | 'storm' | 'calm';
	focus?: {x: number; y: number; s: number}; // camera angle: point (0-1) to center and zoom factor
	cont?: boolean; // continues the previous shot (no fade-in, characters don't pop in again)
	world?: string; // 3D scene (storm_night, calm_night, dusk_shore)
	cam?: string; // 3D camera move: wide, push_in, close, orbit, low_hero, crane_up, pull_back, whip, over_water, dutch, reveal
	subject?: V3; // 3D: stage point the camera looks at (default: the actors)
	focusActor?: number; // 3D: index of the actor the camera looks at
};

export type Timeline = {
	fps: number;
	width: number;
	height: number;
	duration: number;
	title: string;
	narration: string | null;
	music: string | null;
	musicVolume: number;
	shots: Shot[];
	captions: {text: string; start: number; end: number}[];
	outro: {start: number; references: string[]};
};

const PARCHMENT = '#efe2c4';
const INK = '#3b2a1a';
const GOLD = '#b8862b';
const SERIF = 'Georgia, "Times New Roman", serif';

const Card: React.FC<{title: string; subtitle?: string}> = ({title, subtitle}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = spring({frame, fps, config: {damping: 200}});
	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(circle at 50% 40%, #f8eed6 0%, ${PARCHMENT} 55%, #d9c49a 100%)`,
				justifyContent: 'center',
				alignItems: 'center',
				padding: 90,
			}}
		>
			<div style={{border: `6px solid ${GOLD}`, borderRadius: 24, padding: '80px 60px', opacity: s, transform: `scale(${0.94 + 0.06 * s})`, textAlign: 'center'}}>
				<div style={{fontFamily: SERIF, fontSize: 88, color: INK, lineHeight: 1.15, whiteSpace: 'pre-line'}}>{title}</div>
				{subtitle ? <div style={{fontFamily: SERIF, fontSize: 52, color: GOLD, marginTop: 36, fontStyle: 'italic'}}>{subtitle}</div> : null}
			</div>
		</AbsoluteFill>
	);
};

const CHAR_H = 880; // character height in a 1920-tall frame at scale 1
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

type Override = {sx: number; sy: number; h: number; walk: number; light: number};

const ActorView: React.FC<{actor: Actor; index: number; cont?: boolean; frames: number; lead: number; from: number; captions: CaptionItem[]; override?: Override}> = ({actor, index, cont, frames, lead, from, captions, override}) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	const local = Math.max(0, frame - lead);
	const abs = (from + frame) / fps; // absolute time: animation keeps flowing across angle cuts
	const pop = cont ? 1 : spring({frame: Math.max(0, frame - index * 4), fps, config: {damping: 14, stiffness: 140}, durationInFrames: 14});
	let x = actor.x;
	let y = actor.y;
	let walk = 0;
	if (actor.move && !override) {
		const k = clamp01(local / Math.max(1, frames * 0.85));
		const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
		x = actor.x + ((actor.move.x ?? actor.x) - actor.x) * e;
		y = actor.y + ((actor.move.y ?? actor.y) - actor.y) * e;
		walk = k > 0 && k < 1 ? 1 : 0;
	}
	const cap = captions.find((c) => abs >= c.start && abs < c.end);
	const speaking = Boolean(actor.speak && cap && actor.emotion !== 'sleep'); // sleepers never talk
	const mouth = speaking ? 0.3 + 0.7 * Math.abs(Math.sin(abs * 2 * Math.PI * 3.6 + index)) : 0;
	const h = override ? override.h : CHAR_H * actor.scale;
	const w = (h * 300) / 560;
	if (override) walk = override.walk;
	const left = override ? override.sx - w / 2 : x * width - w / 2;
	const top = override ? override.sy - h : y * height - h;
	return (
		<div style={{position: 'absolute', left, top, width: w, height: h, transformOrigin: '50% 100%', transform: `scale(${0.85 + 0.15 * pop}) scaleX(${actor.flip ? -1 : 1})`, opacity: pop, filter: override ? `brightness(${override.light})` : undefined}}>
			{actor.glow ? (
				<div style={{position: 'absolute', left: -w * 0.5, top: h * 0.05, width: w * 2, height: w * 2, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,243,176,0.42) 0%, rgba(255,243,176,0.16) 40%, rgba(255,243,176,0) 68%)'}} />
			) : null}
			<div style={{position: 'absolute', left: '12%', right: '12%', bottom: -h * 0.02, height: h * 0.05, borderRadius: '50%', background: 'rgba(0,0,0,0.28)', filter: 'blur(6px)'}} />
			<Rig def={CHARS[actor.char] ?? CHARS.crowd} emotion={actor.emotion} t={abs} mouth={mouth} walk={walk} speaking={speaking} phase={index * 0.37} />
		</div>
	);
};

const MOOD: Record<string, string> = {
	day: 'rgba(255,214,140,0.10)',
	dusk: 'rgba(255,140,80,0.18)',
	night: 'rgba(20,30,80,0.38)',
	storm: 'rgba(15,25,60,0.42)',
	calm: 'rgba(120,160,255,0.12)',
};

const snap = (frame: number, f0: number, f1: number) => 1 - Math.pow(1 - clamp01((frame - f0) / (f1 - f0)), 3); // fast ease-out

type Cam = {t: string; shake: number; blur: number};

// The whole scene (background + characters) moves together like a camera.
const cameraMotion = (motion: string, frame: number, frames: number): Cam => {
	const p = clamp01(frame / Math.max(1, frames));
	switch (motion) {
		case 'punch': // quick snap in, then a slow creep
			return {t: `scale(${1 + 0.22 * snap(frame, 0, 6) + 0.05 * p})`, shake: 1, blur: 0};
		case 'punch-out': // starts zoomed in, snaps back out
			return {t: `scale(${1.28 - 0.26 * snap(frame, 0, 7) + 0.04 * p})`, shake: 1, blur: 0};
		case 'pulse': {
			// a quick zoom-in bump every 0.75 s that eases back
			const phase = frame % 22;
			const kick = Math.pow(Math.max(0, 1 - phase / 8), 2) * 0.09;
			return {t: `scale(${1.05 + 0.05 * p + kick})`, shake: 1, blur: 0};
		}
		case 'whip': {
			// whip pan: slides in fast with motion blur
			const k = snap(frame, 0, 8);
			return {t: `translateX(${(1 - k) * 14}%) scale(${1.06 + 0.2 * (1 - k)})`, shake: 1, blur: (1 - k) * 10};
		}
		case 'dutch': // tilted camera that rolls into place
			return {t: `rotate(${-4 * snap(frame, 0, 10)}deg) scale(${1.12 + 0.04 * p})`, shake: 1.2, blur: 0};
		case 'handheld':
			return {t: `scale(${1.06 + 0.05 * p})`, shake: 2.4, blur: 0};
		case 'zoom-in':
			return {t: `scale(${1.04 + 0.12 * p})`, shake: 1, blur: 0};
		case 'zoom-out':
			return {t: `scale(${1.16 - 0.12 * p})`, shake: 1, blur: 0};
		case 'pan-left':
			return {t: `scale(1.15) translateX(${4 - 8 * p}%)`, shake: 1, blur: 0};
		case 'pan-right':
			return {t: `scale(1.15) translateX(${-4 + 8 * p}%)`, shake: 1, blur: 0};
		default:
			return {t: 'scale(1)', shake: 1, blur: 0};
	}
};

// A little handheld-camera drift on every shot so the picture never feels frozen (more in storms).
const handheld = (frame: number, amp: number): string =>
	`translate(${amp * (2.2 * Math.sin(frame * 0.17) + 1.4 * Math.sin(frame * 0.43 + 1))}px, ${amp * (2.2 * Math.sin(frame * 0.21 + 2) + 1.2 * Math.sin(frame * 0.51))}px) rotate(${amp * 0.25 * Math.sin(frame * 0.11)}deg)`;


const WorldShot: React.FC<{shot: Shot; frames: number; lead: number; from: number; captions: CaptionItem[]}> = ({shot, frames, lead, from, captions}) => {
	const frame = useCurrentFrame();
	const {width: W, height: H, fps} = useVideoConfig();
	const local = Math.max(0, frame - lead);
	const t = (from + frame) / fps;
	const k = clamp01(local / Math.max(1, frames));
	const scene = shot.world as string;
	const cfg = SCENES[scene] ?? SCENES.calm_night;
	const fade = lead > 0 ? interpolate(frame, [0, lead], [0, 1], {extrapolateRight: 'clamp'}) : 1;
	const acts = (shot.actors || []).map((a, i) => {
		let at: [number, number] = a.at ?? [(i - ((shot.actors || []).length - 1) / 2) * 1.3, 0];
		let walk = 0;
		if (a.move?.at) {
			const m = clamp01(local / Math.max(1, frames * 0.85));
			const e = easeInOut(m);
			at = [lerp(at[0], a.move.at[0], e), lerp(at[1], a.move.at[1], e)];
			walk = m > 0 && m < 1 ? 1 : 0;
		}
		return {a, i, walk, world: stageToWorld(scene, [at[0], a.lift ?? 0, at[1]], t)};
	});
	const chest = (v: V3): V3 => [v[0], v[1] + 1.15, v[2]];
	let subject: V3;
	if (shot.focusActor != null && acts[shot.focusActor]) subject = chest(acts[shot.focusActor].world);
	else if (shot.subject) subject = stageToWorld(scene, shot.subject, t);
	else if (acts.length) {
		const c = acts.map((o) => chest(o.world));
		subject = [c.reduce((s, v) => s + v[0], 0) / c.length, c.reduce((s, v) => s + v[1], 0) / c.length, c.reduce((s, v) => s + v[2], 0) / c.length];
	} else subject = stageToWorld(scene, [0, 1.4, 0], t);
	const cam = cameraFor(shot.cam ?? 'wide', subject, k, t, scene === 'storm_night' ? 0.8 : 0.35, Boolean(cfg.camFlip));
	const blur = 0;
	const chars: Placed[] = acts.map((o) => {
		const cap = captions.find((c) => t >= c.start && t < c.end);
		const last = [...captions].reverse().find((c) => c.start <= t);
		const wordIdx = last ? captions.indexOf(last) : 0;
		const wordAge = last ? t - last.start : 9;
		const speaking = Boolean(o.a.speak && cap && o.a.emotion !== 'sleep');
		const other = acts.find((q) => q.i !== o.i);
		const lookYaw = other ? Math.max(-0.7, Math.min(0.7, (other.world[0] - o.world[0]) * 0.35)) : 0;
		const mouth = speaking ? 0.3 + 0.7 * Math.abs(Math.sin(t * 2 * Math.PI * 3.6 + o.i)) : 0;
		// Face the camera (mostly), so close-ups show faces; a little sway keeps them alive.
		const yaw = Math.atan2(cam.pos[0] - o.world[0], cam.pos[2] - o.world[2]) * 0.95 + 0.06 * Math.sin(t * 0.9 + o.i * 2);
		return {key: String(o.i), pos: o.world, yaw, char: o.a.char, emotion: o.a.emotion, t, mouth, walk: o.walk, speaking, phase: o.i * 0.37, wordAge, wordIdx, lookYaw, glow: o.a.glow, scale: o.a.scale ?? 1};
	});
	return (
		<AbsoluteFill style={{opacity: fade, backgroundColor: '#000', overflow: 'hidden', filter: blur > 0.3 ? `blur(${blur}px)` : undefined}}>
			<World scene={scene} t={t} cam={cam} W={W} H={H} chars={chars} />
		</AbsoluteFill>
	);
};

const Moving: React.FC<{shot: Shot; frames: number; lead: number; from: number; captions: CaptionItem[]}> = ({shot, frames, lead, from, captions}) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	// New scene: a quick dissolve over the previous one (lead frames). New angle of the same scene: hard cut.
	const fade = lead > 0 ? interpolate(frame, [0, lead], [0, 1], {extrapolateRight: 'clamp'}) : 1;
	// Camera angle for this shot: keep the focus point centered, never showing past the picture's edges.
	const fs = shot.focus ? Math.max(1, shot.focus.s) : 1;
	const lim = (fs - 1) / (2 * fs);
	const fx = shot.focus ? Math.min(0.5 + lim, Math.max(0.5 - lim, shot.focus.x)) : 0.5;
	const fy = shot.focus ? Math.min(0.5 + lim, Math.max(0.5 - lim, shot.focus.y)) : 0.5;
	const cam = cameraMotion(shot.motion, Math.max(0, frame - lead), frames);
	const amp = cam.shake * (shot.mood === 'storm' ? 3 : 1);
	const angle = `${handheld(from + frame, amp)} translate(${fs * (0.5 - fx) * W}px, ${fs * (0.5 - fy) * H}px) scale(${fs})`;
	const media = {width: '100%', height: '100%', objectFit: 'cover' as const};
	return (
		<AbsoluteFill style={{opacity: fade, overflow: 'hidden', backgroundColor: INK}}>
			<AbsoluteFill style={{transform: angle, filter: cam.blur > 0.3 ? `blur(${cam.blur}px)` : undefined}}>
			<AbsoluteFill style={{transform: cam.t, transformOrigin: '50% 58%'}}>
				{shot.type === 'scene' && !shot.src ? (
					<AbsoluteFill style={{background: 'linear-gradient(180deg, #7fb6e6 0%, #cfe3f3 55%, #8fae6a 56%, #5f7f45 100%)'}} />
				) : shot.type === 'video' && shot.src ? (
					<OffthreadVideo src={staticFile(shot.src)} muted style={media} />
				) : (shot.type === 'image' || shot.type === 'scene') && shot.src ? (
					<Img src={staticFile(shot.src)} style={media} />
				) : (
					<Card title={shot.text || shot.id} />
				)}
				{shot.mood ? <AbsoluteFill style={{background: MOOD[shot.mood], mixBlendMode: 'multiply'}} /> : null}
				{(shot.actors || []).map((a, i) => (
					<ActorView key={i} actor={a} index={i} cont={shot.cont} frames={frames} lead={lead} from={from} captions={captions} />
				))}
			</AbsoluteFill>
			</AbsoluteFill>
			{shot.text && shot.type !== 'card' ? (
				<div style={{position: 'absolute', top: 150, width: '100%', textAlign: 'center'}}>
					<span style={{fontFamily: SERIF, fontSize: 46, color: PARCHMENT, background: 'rgba(59,42,26,0.72)', padding: '12px 28px', borderRadius: 14}}>{shot.text}</span>
				</div>
			) : null}
		</AbsoluteFill>
	);
};

const Caption: React.FC<{text: string}> = ({text}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const pop = spring({frame, fps, config: {damping: 14, stiffness: 220}, durationInFrames: 5});
	return (
		// One word at a time, ~67% down the frame: clear of faces and of the TikTok/Reels caption + button rail.
		<AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: 1300, paddingLeft: 90, paddingRight: 140}}>
			<div
				style={{
					fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
					fontSize: 82,
					fontWeight: 900,
					color: '#ffffff',
					textAlign: 'center',
					lineHeight: 1.05,
					WebkitTextStroke: '12px #111111',
					paintOrder: 'stroke fill',
					transform: `scale(${0.9 + 0.1 * pop})`,
				}}
			>
				{text}
			</div>
		</AbsoluteFill>
	);
};

export const Episode: React.FC<Timeline> = (t) => {
	const {fps} = useVideoConfig();
	const f = (s: number) => Math.round(s * fps);
	return (
		<AbsoluteFill style={{backgroundColor: INK}}>
			{t.shots.map((shot, i) => {
				const lead = !shot.cont && i > 0 ? 6 : 0; // 0.2 s dissolve into a new scene
				const frames = Math.max(1, f(shot.end) - f(shot.start));
				return (
					<Sequence key={shot.id} from={f(shot.start) - lead} durationInFrames={frames + lead} name={shot.id}>
						{shot.world ? (
							<WorldShot shot={shot} frames={frames} lead={lead} from={f(shot.start) - lead} captions={t.captions} />
						) : (
							<Moving shot={shot} frames={frames} lead={lead} from={f(shot.start) - lead} captions={t.captions} />
						)}
					</Sequence>
				);
			})}
			<Sequence from={f(t.outro.start)} name="outro">
				{t.shots.some((x) => x.world) ? null : (
					<Card title={t.outro.references.join('\n') || t.title} subtitle="Read it for yourself" />
				)}
			</Sequence>
			{t.captions.map((c, i) => (
				<Sequence key={i} from={f(c.start)} durationInFrames={Math.max(1, f(c.end) - f(c.start))} name={`cap ${i}`}>
					<Caption text={c.text} />
				</Sequence>
			))}
			{t.narration ? <Audio src={staticFile(t.narration)} /> : null}
			{t.music ? <Audio src={staticFile(t.music)} volume={t.musicVolume} /> : null}
		</AbsoluteFill>
	);
};
