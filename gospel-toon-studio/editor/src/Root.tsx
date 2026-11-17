import {Composition} from 'remotion';
import {Episode, Timeline} from './Episode';

const sample: Timeline = {
	fps: 30,
	width: 1080,
	height: 1920,
	duration: 6,
	title: 'Sample episode',
	narration: null,
	music: null,
	musicVolume: 0.12,
	shots: [{id: 's01', src: null, type: 'card', start: 0, end: 3, motion: 'zoom-in', text: 'Mark 4:35-41'}],
	captions: [{text: 'He was asleep', start: 0.2, end: 1.4}],
	outro: {start: 3, references: ['Mark 4:35-41']},
};

export const RemotionRoot: React.FC = () => (
	<Composition
		id="Episode"
		component={Episode}
		defaultProps={sample}
		fps={30}
		width={1080}
		height={1920}
		durationInFrames={180}
		calculateMetadata={({props}) => ({
			fps: props.fps,
			width: props.width,
			height: props.height,
			durationInFrames: Math.max(1, Math.ceil(props.duration * props.fps)),
		})}
	/>
);
