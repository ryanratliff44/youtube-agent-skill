import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Rig2D} from './Char2D';

// A contact sheet of the character kit: every character, and the emotions, so we can judge the look in one picture.
const ROW1: [string, string][] = [['david', 'calm'], ['goliath', 'smug'], ['saul', 'sad'], ['soldier', 'fear'], ['israelite', 'awe'], ['jesus', 'warm'], ['peter', 'panic']];
const ROW2: [string, string][] = [['david', 'joy'], ['david', 'laugh'], ['david', 'anger'], ['david', 'fear'], ['david', 'sad'], ['david', 'smug'], ['david', 'command']];

export const Kit: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const cell = (c: string, e: string, i: number, y: number) => (
		<div key={c + e + i} style={{position: 'absolute', left: 20 + i * 228, top: y, width: 210, height: 360}}>
			<div style={{width: '100%', height: '100%', transform: c === 'goliath' ? 'scale(0.78)' : undefined, transformOrigin: '50% 100%'}}>
				<Rig2D def={c} emotion={e} t={t} mouth={0} walk={0} speaking={false} phase={i * 0.37} />
			</div>
			<div style={{position: 'absolute', bottom: -26, width: '100%', textAlign: 'center', font: '600 20px Arial', color: '#fff'}}>{c} / {e}</div>
		</div>
	);
	return (
		<AbsoluteFill style={{background: 'linear-gradient(#2a3552,#6b5a48)'}}>
			{ROW1.map(([c, e], i) => cell(c, e, i, 10))}
			{ROW2.map(([c, e], i) => cell(c, e, i, 392))}
		</AbsoluteFill>
	);
};
