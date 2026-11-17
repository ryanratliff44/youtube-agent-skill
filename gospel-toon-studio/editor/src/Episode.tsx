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

export type Shot = {
	id: string;
	src: string | null;
	type: 'video' | 'image' | 'card';
	start: number;
	end: number;
	motion: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right';
	text?: string;
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
			{shot.type === 'video' && shot.src ? (
				<OffthreadVideo src={staticFile(shot.src)} muted style={{...media, transform: shot.motion.startsWith('zoom') ? t : 'scale(1.02)'}} />
			) : shot.type === 'image' && shot.src ? (
				<Img src={staticFile(shot.src)} style={media} />
			) : (
				<Card title={shot.text || shot.id} />
			)}
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
	const pop = spring({frame, fps, config: {damping: 14, stiffness: 180}, durationInFrames: 8});
	return (
		// Sits at ~65% height: clear of the title area and of the TikTok/Reels button rail and caption at the bottom.
		<AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: 1180, paddingLeft: 90, paddingRight: 140}}>
			<div
				style={{
					fontFamily: '"Arial Black", Arial, sans-serif',
					fontSize: 74,
					fontWeight: 900,
					color: '#fffaf0',
					textAlign: 'center',
					lineHeight: 1.1,
					WebkitTextStroke: `10px ${INK}`,
					paintOrder: 'stroke fill',
					textShadow: '0 6px 18px rgba(0,0,0,0.45)',
					transform: `scale(${0.85 + 0.15 * pop})`,
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
