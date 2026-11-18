import React from 'react';
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
	src: string;
	x: number; // 0..1 across the frame (center of the character)
	y: number; // 0..1 down the frame (where the feet stand)
	scale: number;
	flip: boolean;
	anim: 'none' | 'bob' | 'sway' | 'shake' | 'slide-in' | 'hop';
};

export type Shot = {
	id: string;
	src: string | null;
	type: 'video' | 'image' | 'card' | 'scene';
	start: number;
	end: number;
	motion: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right';
	text?: string;
	actors?: Actor[];
	mood?: 'day' | 'dusk' | 'night' | 'storm' | 'calm';
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

const CHAR_H = 880; // sprite height in a 1920-tall frame at scale 1

const ActorView: React.FC<{actor: Actor; index: number}> = ({actor, index}) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	const t = frame / fps + index * 0.37;
	const pop = spring({frame: Math.max(0, frame - index * 4), fps, config: {damping: 14, stiffness: 140}, durationInFrames: 14});
	let dx = 0;
	let dy = 0;
	let rot = 0;
	if (actor.anim === 'bob') dy = Math.sin(t * 2 * Math.PI * 0.9) * 10;
	if (actor.anim === 'sway') rot = Math.sin(t * 2 * Math.PI * 0.5) * 3.5;
	if (actor.anim === 'hop') dy = -Math.abs(Math.sin(t * 2 * Math.PI * 1.2)) * 36;
	if (actor.anim === 'shake') {
		dx = Math.sin(t * 38) * 7;
		dy = Math.sin(t * 29 + 1) * 6;
		rot = Math.sin(t * 22) * 2.5;
	}
	if (actor.anim === 'slide-in') {
		const k = spring({frame, fps, config: {damping: 18}, durationInFrames: 18});
		dx = (actor.x < 0.5 ? -1 : 1) * (1 - k) * 520;
	}
	const h = CHAR_H * actor.scale;
	const w = (h * 300) / 560;
	return (
		<div style={{position: 'absolute', left: actor.x * width - w / 2 + dx, top: actor.y * height - h + dy, width: w, height: h, transformOrigin: '50% 100%', transform: `scale(${0.85 + 0.15 * pop}) rotate(${rot}deg) scaleX(${actor.flip ? -1 : 1})`, opacity: pop}}>
			<div style={{position: 'absolute', left: '12%', right: '12%', bottom: -h * 0.02, height: h * 0.05, borderRadius: '50%', background: 'rgba(0,0,0,0.28)', filter: 'blur(6px)'}} />
			<Img src={staticFile(actor.src)} style={{width: '100%', height: '100%'}} />
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

const Moving: React.FC<{shot: Shot; frames: number}> = ({shot, frames}) => {
	const frame = useCurrentFrame();
	const p = interpolate(frame, [0, frames], [0, 1], {extrapolateRight: 'clamp'});
	const t = {
		'zoom-in': `scale(${1.04 + 0.1 * p})`,
		'zoom-out': `scale(${1.14 - 0.1 * p})`,
		'pan-left': `scale(1.15) translateX(${4 - 8 * p}%)`,
		'pan-right': `scale(1.15) translateX(${-4 + 8 * p}%)`,
	}[shot.motion];
	const fade = interpolate(frame, [0, 6], [0, 1], {extrapolateRight: 'clamp'});
	const media = {width: '100%', height: '100%', objectFit: 'cover' as const, transform: t};
	return (
		<AbsoluteFill style={{opacity: fade, overflow: 'hidden', backgroundColor: INK}}>
			{shot.type === 'scene' && !shot.src ? (
				<AbsoluteFill style={{background: 'linear-gradient(180deg, #7fb6e6 0%, #cfe3f3 55%, #8fae6a 56%, #5f7f45 100%)'}} />
			) : shot.type === 'video' && shot.src ? (
				<OffthreadVideo src={staticFile(shot.src)} muted style={{...media, transform: shot.motion.startsWith('zoom') ? t : 'scale(1.02)'}} />
			) : (shot.type === 'image' || shot.type === 'scene') && shot.src ? (
				<Img src={staticFile(shot.src)} style={media} />
			) : (
				<Card title={shot.text || shot.id} />
			)}
			{shot.mood ? <AbsoluteFill style={{background: MOOD[shot.mood], mixBlendMode: 'multiply'}} /> : null}
			{(shot.actors || []).map((a, i) => (
				<ActorView key={i} actor={a} index={i} />
			))}
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
		<AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: 1250, paddingLeft: 90, paddingRight: 140}}>
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
			{t.shots.map((shot) => {
				const frames = Math.max(1, f(shot.end) - f(shot.start));
				return (
					<Sequence key={shot.id} from={f(shot.start)} durationInFrames={frames} name={shot.id}>
						<Moving shot={shot} frames={frames} />
					</Sequence>
				);
			})}
			<Sequence from={f(t.outro.start)} name="outro">
				<Card title={t.outro.references.join('\n') || t.title} subtitle="Read it for yourself" />
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
