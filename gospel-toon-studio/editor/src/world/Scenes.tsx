import React, {useMemo} from 'react';
import * as THREE from 'three';
import {BOAT_LEN, BOAT_W, V3, WAVES_GLSL, boatPose, clamp, fbm, hash, lightning, rng, smooth, waveHeight} from './math';

// ---------------------------------------------------------------- scene settings
export type SceneCfg = {
	sky: {top: string; mid: string; bottom: string; sun: V3; sunColor: string; sunSize: number; stars: boolean};
	fog: {color: string; density: number};
	ambient: {color: string; intensity: number};
	key: {color: string; intensity: number; dir: V3};
	sea: {amp: number; deep: string; mid: string; light: string; foam: string; foamH: number};
	rain: boolean;
	clouds: number; // 0 = none
	cloudColor: string;
	lightning: boolean;
	terrain: 'ring' | 'shore';
	terrainTint: string;
	boat: {base: [number, number]; furl: number; lantern: boolean};
	stageBase?: [number, number]; // where characters stand when the stage is the ground instead of the boat
	village: boolean;
	charLight: number; // brightness the 2D characters get so they sit in the scene
	charWarm: string; // tint added to the characters
};

export const SCENES: Record<string, SceneCfg> = {
	storm_night: {
		sky: {top: '#05070f', mid: '#16203a', bottom: '#0b1224', sun: [0.2, 0.4, -0.9], sunColor: '#3a4a78', sunSize: 12, stars: false},
		fog: {color: '#0f182c', density: 0.0095},
		ambient: {color: '#4c5f94', intensity: 0.9},
		key: {color: '#8aa3e6', intensity: 1.2, dir: [-0.4, 0.8, 0.5]},
		sea: {amp: 1.5, deep: '#030a18', mid: '#09203a', light: '#14436a', foam: '#c4d8e6', foamH: 0.95},
		rain: true,
		clouds: 24,
		cloudColor: '#1a2236',
		lightning: true,
		terrain: 'ring',
		terrainTint: '#12203a',
		boat: {base: [0, 0], furl: 0.55, lantern: true},
		village: false,
		charLight: 0.78,
		charWarm: 'rgba(40,70,140,0.22)',
	},
	calm_night: {
		sky: {top: '#02040f', mid: '#0f2250', bottom: '#1b3566', sun: [-0.45, 0.42, -0.8], sunColor: '#f4f1d6', sunSize: 900, stars: true},
		fog: {color: '#1b3158', density: 0.004},
		ambient: {color: '#6a85c4', intensity: 1.0},
		key: {color: '#cfe0ff', intensity: 0.95, dir: [-0.45, 0.55, 0.7]},
		sea: {amp: 0.06, deep: '#050f26', mid: '#0b2247', light: '#1b4478', foam: '#e8f1ff', foamH: 9},
		rain: false,
		clouds: 5,
		cloudColor: '#3c5584',
		lightning: false,
		terrain: 'ring',
		terrainTint: '#1a2e55',
		boat: {base: [0, 0], furl: 0, lantern: true},
		village: false,
		charLight: 0.92,
		charWarm: 'rgba(60,90,170,0.12)',
	},
	dusk_shore: {
		sky: {top: '#3a2f6b', mid: '#e0764a', bottom: '#f4b36b', sun: [0.15, 0.1, -1], sunColor: '#ffd08a', sunSize: 60, stars: false},
		fog: {color: '#e9a469', density: 0.0045},
		ambient: {color: '#ffd2a8', intensity: 0.7},
		key: {color: '#ffc58a', intensity: 0.95, dir: [0.2, 0.35, -0.9]},
		sea: {amp: 0.08, deep: '#355c8a', mid: '#e0865a', light: '#f7c57d', foam: '#fff1d0', foamH: 9},
		rain: false,
		clouds: 9,
		cloudColor: '#f3a074',
		lightning: false,
		terrain: 'shore',
		terrainTint: '#ffffff',
		boat: {base: [5, 6], furl: 0.2, lantern: false},
		stageBase: [0, 20],
		village: true,
		charLight: 1,
		charWarm: 'rgba(255,150,70,0.16)',
	},
};

const col = (c: string) => new THREE.Color(c);

// ---------------------------------------------------------------- sky
const skyVert = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const skyFrag = `
uniform vec3 uTop, uMid, uBot, uSunDir, uSunCol; uniform float uSunSize, uFlash; varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir); float y = d.y;
  vec3 c = y > 0.0 ? mix(uMid, uTop, pow(y, 0.55)) : mix(uMid, uBot, pow(-y, 0.4));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  c += uSunCol * (pow(sd, uSunSize) * 1.6 + pow(sd, 6.0) * (uSunSize < 200.0 ? 0.18 : 0.02));
  c += vec3(uFlash) * 0.65 * (1.0 - abs(y) * 0.5);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

export const Sky: React.FC<{cfg: SceneCfg; at: V3; flash: number}> = ({cfg, at, flash}) => {
	const mat = useMemo(
		() =>
			new THREE.ShaderMaterial({
				side: THREE.BackSide,
				depthWrite: false,
				fog: false,
				vertexShader: skyVert,
				fragmentShader: skyFrag,
				uniforms: {uTop: {value: col('#000')}, uMid: {value: col('#000')}, uBot: {value: col('#000')}, uSunDir: {value: new THREE.Vector3()}, uSunCol: {value: col('#000')}, uSunSize: {value: 10}, uFlash: {value: 0}},
			}),
		[],
	);
	mat.uniforms.uTop.value = col(cfg.sky.top);
	mat.uniforms.uMid.value = col(cfg.sky.mid);
	mat.uniforms.uBot.value = col(cfg.sky.bottom);
	mat.uniforms.uSunDir.value = new THREE.Vector3(...cfg.sky.sun).normalize();
	mat.uniforms.uSunCol.value = col(cfg.sky.sunColor);
	mat.uniforms.uSunSize.value = cfg.sky.sunSize;
	mat.uniforms.uFlash.value = flash;
	return (
		<mesh position={at} material={mat} renderOrder={-10}>
			<sphereGeometry args={[800, 32, 24]} />
		</mesh>
	);
};

export const Stars: React.FC<{at: V3}> = ({at}) => {
	const geo = useMemo(() => {
		const r = rng(7);
		const p: number[] = [];
		for (let i = 0; i < 700; i++) {
			const a = r() * Math.PI * 2;
			const y = 0.06 + r() * 0.94;
			const q = Math.sqrt(1 - y * y);
			p.push(Math.cos(a) * q * 700, y * 700, Math.sin(a) * q * 700);
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
		return g;
	}, []);
	return (
		<points position={at} geometry={geo}>
			<pointsMaterial color="#ffffff" size={2.6} sizeAttenuation={false} fog={false} />
		</points>
	);
};

// ---------------------------------------------------------------- sea
const seaVert = `
uniform float uTime, uAmp; varying vec3 vW; varying float vH;
void main(){
  vec3 w = (modelMatrix * vec4(position, 1.0)).xyz; vec2 p = w.xz; float t = uTime; float h = 0.0;
  ${WAVES_GLSL}
  h *= uAmp; w.y += h; vW = w; vH = h;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;
const seaFrag = `
uniform vec3 uDeep, uMid, uLight, uFoam, uFog, uSky, uSun; uniform float uFlash, uFogD, uFoamH, uAmp;
varying vec3 vW; varying float vH;
void main(){
  vec3 n = normalize(cross(dFdx(vW), dFdy(vW))); if (n.y < 0.0) n = -n;
  float d = max(dot(n, normalize(uSun)), 0.0);
  vec3 c = d < 0.5 ? uDeep : (d < 0.82 ? uMid : uLight);
  float hh = vH / max(uAmp, 0.05);
  c = mix(c, uLight, smoothstep(0.15, 0.9, hh) * 0.35);
  c = mix(c, uFoam, smoothstep(uFoamH, uFoamH + 0.18, vH));
  c += vec3(uFlash) * 0.55;
  vec3 V = normalize(cameraPosition - vW); float fr = pow(1.0 - max(dot(n, V), 0.0), 3.0);
  c = mix(c, uSky, fr * 0.3);
  float dist = length(cameraPosition - vW); float fg = 1.0 - exp(-uFogD * uFogD * dist * dist * 1.6);
  c = mix(c, uFog, fg);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

export const Sea: React.FC<{cfg: SceneCfg; t: number; flash: number; at: V3}> = ({cfg, t, flash, at}) => {
	const mat = useMemo(
		() =>
			new THREE.ShaderMaterial({
				vertexShader: seaVert,
				fragmentShader: seaFrag,
				uniforms: {
					uTime: {value: 0}, uAmp: {value: 1}, uDeep: {value: col('#000')}, uMid: {value: col('#000')}, uLight: {value: col('#000')}, uFoam: {value: col('#fff')},
					uFog: {value: col('#000')}, uSky: {value: col('#000')}, uSun: {value: new THREE.Vector3()}, uFlash: {value: 0}, uFogD: {value: 0.01}, uFoamH: {value: 9},
				},
			}),
		[],
	);
	const geo = useMemo(() => {
		const g = new THREE.PlaneGeometry(900, 900, 300, 300);
		g.rotateX(-Math.PI / 2);
		return g;
	}, []);
	const u = mat.uniforms;
	u.uTime.value = t;
	u.uAmp.value = cfg.sea.amp;
	u.uDeep.value = col(cfg.sea.deep);
	u.uMid.value = col(cfg.sea.mid);
	u.uLight.value = col(cfg.sea.light);
	u.uFoam.value = col(cfg.sea.foam);
	u.uFog.value = col(cfg.fog.color);
	u.uSky.value = col(cfg.sky.mid);
	u.uSun.value = new THREE.Vector3(...cfg.key.dir).normalize();
	u.uFlash.value = flash;
	u.uFogD.value = cfg.fog.density;
	u.uFoamH.value = cfg.sea.foamH;
	return <mesh position={[Math.round(at[0] / 3) * 3, 0, Math.round(at[2] / 3) * 3]} geometry={geo} material={mat} frustumCulled={false} />;
};

// ---------------------------------------------------------------- clouds, rain, lightning
export const Clouds: React.FC<{cfg: SceneCfg; t: number; flash: number; at: V3}> = ({cfg, t, flash, at}) => {
	const puffs = useMemo(() => {
		const r = rng(21);
		const out: {p: V3; s: V3; rot: number}[] = [];
		for (let i = 0; i < cfg.clouds; i++) {
			const a = r() * Math.PI * 2;
			const d = 110 + r() * 260;
			out.push({p: [Math.cos(a) * d, 42 + r() * 70, Math.sin(a) * d], s: [40 + r() * 50, 10 + r() * 12, 24 + r() * 26], rot: r() * 3});
		}
		return out;
	}, [cfg.clouds]);
	return (
		<group position={[at[0], 0, at[2]]}>
			{puffs.map((c, i) => (
				<mesh key={i} position={[c.p[0] + Math.sin(t * 0.05 + i) * 6, c.p[1], c.p[2]]} scale={c.s} rotation={[0, c.rot, 0]}>
					<icosahedronGeometry args={[1, 1]} />
					<meshStandardMaterial color={cfg.cloudColor} flatShading emissive={new THREE.Color('#ffffff')} emissiveIntensity={flash * 0.55} fog={false} />
				</mesh>
			))}
		</group>
	);
};

export const Rain: React.FC<{t: number; at: V3}> = ({t, at}) => {
	const geo = useMemo(() => new THREE.BufferGeometry(), []);
	const N = 2600;
	const base = useMemo(() => {
		const r = rng(5);
		return Array.from({length: N}, () => [(r() - 0.5) * 70, r() * 36, (r() - 0.5) * 70, 0.8 + r() * 0.4]);
	}, []);
	const pos = new Float32Array(N * 6);
	for (let i = 0; i < N; i++) {
		const [bx, by, bz, sp] = base[i];
		const y = (((by - t * 32 * sp) % 36) + 36) % 36 - 4;
		pos.set([at[0] + bx, y, at[2] + bz, at[0] + bx - 0.55, y - 1.7, at[2] + bz], i * 6);
	}
	geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	return (
		<lineSegments geometry={geo} frustumCulled={false}>
			<lineBasicMaterial color="#b9c9e6" transparent opacity={0.5} fog={false} />
		</lineSegments>
	);
};

export const Bolt: React.FC<{t: number}> = ({t}) => {
	const {flash, k} = lightning(t);
	if (flash < 0.5) return null;
	const r = rng(k + 3);
	let x = -70 + hash(k + 9) * 140;
	const z = -130 - hash(k + 4) * 60;
	let y = 90;
	const segs: {a: V3; b: V3}[] = [];
	while (y > 4) {
		const ny = y - (6 + r() * 9);
		const nx = x + (r() - 0.5) * 14;
		segs.push({a: [x, y, z], b: [nx, Math.max(ny, 2), z]});
		x = nx;
		y = ny;
	}
	return (
		<group>
			{segs.map((s, i) => {
				const dx = s.b[0] - s.a[0];
				const dy = s.b[1] - s.a[1];
				const L = Math.hypot(dx, dy);
				return (
					<mesh key={i} position={[(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2, z]} rotation={[0, 0, Math.atan2(dx, -dy) * -1 + Math.PI]}>
						<boxGeometry args={[0.7, L, 0.7]} />
						<meshBasicMaterial color="#f4f7ff" fog={false} />
					</mesh>
				);
			})}
		</group>
	);
};

// ---------------------------------------------------------------- terrain (hills around the lake, or a shore)
export const groundY = (x: number, z: number) => heightFn('shore')(x, z);

const heightFn = (kind: 'ring' | 'shore') => (x: number, z: number): number => {
	if (kind === 'ring') {
		const r = Math.hypot(x, z);
		const up = smooth(clamp((r - 150) / 130));
		return -8 + up * (26 + fbm(x * 0.012, z * 0.012) * 46);
	}
	// shore: land to the +z side (behind the characters), open lake toward -z, mountains far away
	const beach = smooth(clamp((z - 10) / 22));
	const land = beach * (2.5 + fbm(x * 0.03, z * 0.03) * 7);
	const hills = smooth(clamp((z - 60) / 90)) * (22 + fbm(x * 0.012 + 3, z * 0.012) * 52);
	const far = smooth(clamp((Math.hypot(x, z + 80) - 210) / 90)) * (24 + fbm(x * 0.01, z * 0.01 + 9) * 40);
	return -6 + 9 * smooth(clamp((z - 2) / 14)) + land + hills + far;
};

const terrainColor = (h: number, n: number, kind: 'ring' | 'shore'): THREE.Color => {
	if (kind === 'shore') {
		if (h < 0.6) return col(n > 0.5 ? '#c9b283' : '#b8a272');
		if (h < 4) return col(n > 0.5 ? '#7d9b46' : '#6c8a3c');
		if (h < 22) return col(n > 0.5 ? '#587d36' : '#4a6e30');
		return col(n > 0.5 ? '#7a7466' : '#665f52');
	}
	if (h < 6) return col(n > 0.5 ? '#2c4a3a' : '#243f33');
	if (h < 24) return col(n > 0.5 ? '#2a4733' : '#223c2c');
	return col(n > 0.5 ? '#4b5240' : '#3f4638');
};

export const Terrain: React.FC<{cfg: SceneCfg}> = ({cfg}) => {
	const geo = useMemo(() => {
		const size = 1000;
		const seg = 160;
		const g = new THREE.PlaneGeometry(size, size, seg, seg);
		g.rotateX(-Math.PI / 2);
		const p = g.attributes.position;
		const f = heightFn(cfg.terrain);
		const colors: number[] = [];
		for (let i = 0; i < p.count; i++) {
			const x = p.getX(i);
			const z = p.getZ(i);
			const h = f(x, z);
			p.setY(i, h);
			const c = terrainColor(h, fbm(x * 0.09, z * 0.09), cfg.terrain);
			colors.push(c.r, c.g, c.b);
		}
		g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
		const ng = g.toNonIndexed(); // flat shaded low-poly look
		ng.computeVertexNormals();
		return ng;
	}, [cfg.terrain]);
	return (
		<mesh geometry={geo} frustumCulled={false}>
			<meshStandardMaterial vertexColors flatShading color={cfg.terrainTint} roughness={1} />
		</mesh>
	);
};

export const Village: React.FC = () => {
	const items = useMemo(() => {
		const r = rng(11);
		const f = heightFn('shore');
		const houses: {p: V3; s: V3}[] = [];
		const trees: {p: V3; s: number}[] = [];
		for (let i = 0; i < 9; i++) {
			const x = -55 + i * 14 + r() * 8;
			const z = 34 + r() * 22;
			houses.push({p: [x, f(x, z), z], s: [4 + r() * 3, 3 + r() * 1.5, 4 + r() * 3]});
		}
		for (let i = 0; i < 34; i++) {
			const x = -90 + r() * 180;
			const z = 20 + r() * 80;
			trees.push({p: [x, f(x, z), z], s: 0.8 + r() * 0.9});
		}
		return {houses, trees};
	}, []);
	return (
		<group>
			{items.houses.map((h, i) => (
				<group key={i} position={h.p}>
					<mesh position={[0, h.s[1] / 2, 0]} scale={h.s}>
						<boxGeometry args={[1, 1, 1]} />
						<meshStandardMaterial color="#e3c9a0" flatShading />
					</mesh>
					<mesh position={[0, h.s[1] + 0.15, 0]} scale={[h.s[0] + 0.5, 0.3, h.s[2] + 0.5]}>
						<boxGeometry args={[1, 1, 1]} />
						<meshStandardMaterial color="#b88a5c" flatShading />
					</mesh>
				</group>
			))}
			{items.trees.map((t, i) => (
				<group key={i} position={t.p} scale={t.s}>
					<mesh position={[0, 1.2, 0]}>
						<cylinderGeometry args={[0.25, 0.35, 2.4, 6]} />
						<meshStandardMaterial color="#6b4a2a" flatShading />
					</mesh>
					<mesh position={[0, 3.4, 0]}>
						<icosahedronGeometry args={[1.9, 0]} />
						<meshStandardMaterial color="#4f7a34" flatShading />
					</mesh>
				</group>
			))}
		</group>
	);
};

// ---------------------------------------------------------------- the boat
export const DECK_Y = 0.78;

const hullGeometry = () => {
	const s = new THREE.Shape();
	s.moveTo(-3.5, 0.95);
	s.lineTo(-3.0, -0.35);
	s.lineTo(1.8, -0.42);
	s.quadraticCurveTo(3.2, -0.2, 3.95, 1.3);
	s.quadraticCurveTo(2.6, 0.9, 1.4, 0.8);
	s.lineTo(-1.6, 0.74);
	s.lineTo(-3.5, 0.95);
	const g = new THREE.ExtrudeGeometry(s, {depth: BOAT_W, bevelEnabled: false, steps: 1});
	g.translate(0, 0, -BOAT_W / 2);
	const p = g.attributes.position;
	const colors: number[] = [];
	for (let i = 0; i < p.count; i++) {
		const x = p.getX(i);
		const y = p.getY(i);
		const z = p.getZ(i);
		const k = 0.58 + 0.42 * clamp((y + 0.42) / 1.4);
		const bow = 1 - 0.82 * smooth(clamp((x - 1.0) / 2.95));
		const stern = 1 - 0.3 * smooth(clamp((-x - 2.2) / 1.3));
		p.setZ(i, z * k * bow * stern);
		const band = Math.floor((y + 0.45) / 0.27) % 2 === 0;
		const c = col(band ? '#93602f' : '#7d4f26');
		colors.push(c.r, c.g, c.b);
	}
	g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
	const ng = g.toNonIndexed();
	ng.computeVertexNormals();
	return ng;
};

export const Boat: React.FC<{cfg: SceneCfg; t: number}> = ({cfg, t}) => {
	const geo = useMemo(hullGeometry, []);
	const pose = boatPose(t, cfg.sea.amp, cfg.boat.base);
	const flap = Math.sin(t * 7) * 0.05 * (cfg.sea.amp > 0.5 ? 1 : 0.2);
	const sailH = 2.6 * (1 - cfg.boat.furl);
	return (
		<group position={pose.pos} rotation={new THREE.Euler(pose.roll, pose.yaw, pose.pitch, 'YZX')}>
			<mesh geometry={geo}>
				<meshStandardMaterial vertexColors flatShading roughness={0.9} />
			</mesh>
			{/* deck boards */}
			<mesh position={[-0.3, DECK_Y + 0.01, 0]}>
				<boxGeometry args={[5.4, 0.04, 1.5]} />
				<meshStandardMaterial color="#b98a52" flatShading />
			</mesh>
			{/* seats */}
			{[-1.4, 1.5].map((x) => (
				<mesh key={x} position={[x, DECK_Y + 0.32, 0]}>
					<boxGeometry args={[0.38, 0.1, 1.5]} />
					<meshStandardMaterial color="#6e4524" flatShading />
				</mesh>
			))}
			{/* gunwale rails */}
			{[-1, 1].map((s) => (
				<mesh key={s} position={[-0.2, DECK_Y + 0.12, s * 0.97]}>
					<boxGeometry args={[6.2, 0.14, 0.1]} />
					<meshStandardMaterial color="#5e3b1d" flatShading />
				</mesh>
			))}
			{/* mast, boom and sail */}
			<mesh position={[1.5, DECK_Y + 3.1, 0]}>
				<cylinderGeometry args={[0.07, 0.1, 6.2, 8]} />
				<meshStandardMaterial color="#5e3b1d" flatShading />
			</mesh>
			<mesh position={[0.1, DECK_Y + 2.6, 0]} rotation={[0, 0, Math.PI / 2]}>
				<cylinderGeometry args={[0.05, 0.05, 3.2, 6]} />
				<meshStandardMaterial color="#5e3b1d" flatShading />
			</mesh>
			{sailH > 0.3 ? (
				<mesh position={[0.1, DECK_Y + 2.65 + sailH / 2, flap]} rotation={[flap, 0, 0]}>
					<boxGeometry args={[3.0, sailH, 0.03]} />
					<meshStandardMaterial color="#e6dcc2" flatShading emissive="#3a3426" emissiveIntensity={0.6} />
				</mesh>
			) : null}
			{/* cushion at the stern */}
			<mesh position={[-2.6, DECK_Y + 0.12, 0]}>
				<boxGeometry args={[0.9, 0.2, 1.0]} />
				<meshStandardMaterial color="#7a93c4" flatShading />
			</mesh>
			{/* coiled rope */}
			<mesh position={[2.2, DECK_Y + 0.12, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
				<torusGeometry args={[0.28, 0.07, 6, 14]} />
				<meshStandardMaterial color="#c9b383" flatShading />
			</mesh>
			{cfg.boat.lantern ? (
				<group position={[3.2, DECK_Y + 1.25, 0]} rotation={[0, 0, Math.sin(t * 2.3) * 0.12]}>
					<mesh>
						<sphereGeometry args={[0.16, 10, 8]} />
						<meshBasicMaterial color="#ffd27a" />
					</mesh>
					<pointLight color="#ffb347" intensity={26} distance={22} decay={1.6} />
				</group>
			) : null}
		</group>
	);
};

export {BOAT_LEN, waveHeight};
