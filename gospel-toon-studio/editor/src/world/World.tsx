import React, {useLayoutEffect} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Cam, V3, boatPose, boatToWorld, camBasis, lightning} from './math';
import {Char3D, Char3DProps} from './Character3D';
import {Boat, Bolt, Clouds, DECK_Y, Rain, SCENES, Sea, Sky, Stars, Terrain, Village, groundY} from './Scenes';

const CameraRig: React.FC<{cam: Cam}> = ({cam}) => {
	const {camera} = useThree();
	useLayoutEffect(() => {
		const c = camera as THREE.PerspectiveCamera;
		const {u} = camBasis(cam);
		c.position.set(...cam.pos);
		c.up.set(...u);
		c.lookAt(...cam.look);
		c.fov = cam.fov;
		c.near = 0.1;
		c.far = 2500;
		c.updateProjectionMatrix();
		c.updateMatrixWorld();
	});
	return null;
};

/** Where a character standing at `local` on the scene's stage is in the 3D world (the boat deck rides the waves). */
export const stageToWorld = (scene: string, local: V3, t: number): V3 => {
	const cfg = SCENES[scene];
	const pose = boatPose(t, cfg.sea.amp, cfg.boat.base);
	if (cfg.terrain === 'shore') {
		const sb = cfg.stageBase ?? cfg.boat.base;
		const x = sb[0] + local[0];
		const z = sb[1] + local[2];
		return [x, groundY(x, z) + local[1], z];
	}
	return boatToWorld(pose, [local[0], DECK_Y + local[1], local[2]]);
};

export const sceneFlash = (scene: string, t: number) => (SCENES[scene]?.lightning ? lightning(t).flash : 0);

export type Placed = Char3DProps & {key: string; pos: V3; yaw: number};

export const World: React.FC<{scene: string; t: number; cam: Cam; W: number; H: number; chars?: Placed[]}> = ({scene, t, cam, W, H, chars = []}) => {
	const cfg = SCENES[scene] ?? SCENES.calm_night;
	const flash = cfg.lightning ? lightning(t).flash : 0;
	const onBoat = cfg.terrain !== 'shore';
	const pose = boatPose(t, cfg.sea.amp, cfg.boat.base);
	return (
		<ThreeCanvas width={W} height={H} flat camera={{fov: cam.fov, near: 0.1, far: 2500, position: cam.pos}}>
			<CameraRig cam={cam} />
			<fogExp2 attach="fog" args={[cfg.fog.color, cfg.fog.density]} />
			<ambientLight color={cfg.ambient.color} intensity={cfg.ambient.intensity + flash * 2.4} />
			<directionalLight color={cfg.key.color} intensity={cfg.key.intensity + flash * 2.2} position={cfg.key.dir.map((v) => v * 80) as V3} />
			<Sky cfg={cfg} at={cam.pos} flash={flash} />
			{cfg.sky.stars ? <Stars at={cam.pos} /> : null}
			<Sea cfg={cfg} t={t} flash={flash} at={cam.pos} />
			<Terrain cfg={cfg} />
			{cfg.village ? <Village /> : null}
			<Boat cfg={cfg} t={t} />
			{chars.map(({key, pos, yaw, ...p}) => (
				<group key={key} position={pos} rotation={onBoat ? new THREE.Euler(pose.roll * 0.8, yaw, pose.pitch * 0.8, 'YZX') : new THREE.Euler(0, yaw, 0)}>
					<Char3D {...p} />
				</group>
			))}
			{cfg.clouds > 0 ? <Clouds cfg={cfg} t={t} flash={flash} at={cam.pos} /> : null}
			{cfg.rain ? <Rain t={t} at={cam.pos} /> : null}
			{cfg.lightning ? <Bolt t={t} /> : null}
		</ThreeCanvas>
	);
};
