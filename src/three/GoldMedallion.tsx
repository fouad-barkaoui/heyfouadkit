import { Canvas, useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Shared with the HTML overlay (the avatar disc) so both tilt as one object. */
export interface MedallionTilt {
  /** Target tilt from the pointer, -1..1 on each axis. */
  tx: number;
  ty: number;
  /** Eased tilt actually rendered, in radians. */
  rx: number;
  ry: number;
  /** Extra spin (radians) added by celebratory flips. */
  spin: number;
}

/** World units: the camera frames ±VIEW_HALF, so px = units * size / (2 * VIEW_HALF). */
export const VIEW_HALF = 1.2;
const FOV = 30;
export const CAMERA_Z = VIEW_HALF / Math.tan(((FOV / 2) * Math.PI) / 180);
/** Radius of the hole the HTML avatar disc sits in. */
export const HOLE_R = 0.64;

const BUMPS = 22;

/** Scalloped seal outline: rounded crests, tighter valleys — like a rosette award. */
function sealShape(): THREE.Shape {
  const shape = new THREE.Shape();
  const steps = 440;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const crest = Math.pow(Math.abs(Math.cos((BUMPS * a) / 2)), 0.65);
    const r = 0.87 + 0.115 * crest;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, HOLE_R, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

function useGoldEnvironment(): void {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.035).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
      room.dispose?.();
    };
  }, [gl, scene]);
}

function Seal({
  tilt,
  overlay,
  reduced,
  flipKey,
}: {
  tilt: MutableRefObject<MedallionTilt>;
  overlay: MutableRefObject<HTMLDivElement | null>;
  reduced: boolean;
  flipKey: number;
}): JSX.Element {
  useGoldEnvironment();
  const group = useRef<THREE.Group>(null);
  const sweep = useRef<THREE.PointLight>(null);

  const { sealGeo, ringGeo, rimGeo, gold, goldDeep } = useMemo(() => {
    const sealGeo = new THREE.ExtrudeGeometry(sealShape(), {
      depth: 0.07,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.035,
      bevelSegments: 5,
      curveSegments: 64,
    });
    sealGeo.translate(0, 0, -0.035);
    const ringGeo = new THREE.TorusGeometry(0.78, 0.022, 20, 160);
    const rimGeo = new THREE.TorusGeometry(HOLE_R + 0.006, 0.03, 20, 160);
    const gold = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#e7b457'),
      metalness: 1,
      roughness: 0.26,
      clearcoat: 0.7,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.25,
    });
    const goldDeep = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#c98d2e'),
      metalness: 1,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.5,
    });
    return { sealGeo, ringGeo, rimGeo, gold, goldDeep };
  }, []);

  useEffect(
    () => () => {
      sealGeo.dispose();
      ringGeo.dispose();
      rimGeo.dispose();
      gold.dispose();
      goldDeep.dispose();
    },
    [sealGeo, ringGeo, rimGeo, gold, goldDeep],
  );

  // Entrance: the seal flips in and settles with a little overshoot.
  useEffect(() => {
    const g = group.current;
    if (!g) return;
    if (reduced) {
      g.scale.setScalar(1);
      return;
    }
    g.scale.setScalar(0.55);
    tilt.current.spin = -Math.PI * 1.5;
    const tl = gsap.timeline();
    tl.to(g.scale, { x: 1, y: 1, z: 1, duration: 1.1, ease: 'elastic.out(1, 0.55)' }, 0);
    tl.to(tilt.current, { spin: 0, duration: 1.35, ease: 'power3.out' }, 0);
    return () => {
      tl.kill();
    };
  }, [reduced, tilt]);

  // Celebratory flip (share, tab change…).
  const firstFlip = useRef(true);
  useEffect(() => {
    if (firstFlip.current) {
      firstFlip.current = false;
      return;
    }
    if (reduced) return;
    gsap.fromTo(tilt.current, { spin: 0 }, { spin: Math.PI * 2, duration: 1.2, ease: 'power3.inOut', onComplete: () => {
      tilt.current.spin = 0;
    } });
  }, [flipKey, reduced, tilt]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = tilt.current;
    const k = 1 - Math.exp(-delta * 6);
    const idleX = reduced ? 0 : Math.sin(state.clock.elapsedTime * 0.7) * 0.06;
    const idleY = reduced ? 0 : Math.cos(state.clock.elapsedTime * 0.55) * 0.09;
    t.rx += (-t.ty * 0.38 + idleX - t.rx) * k;
    t.ry += (t.tx * 0.45 + idleY - t.ry) * k;
    g.rotation.x = t.rx;
    g.rotation.y = t.ry + t.spin;

    // A warm light orbits the seal, so the gold sheen is always travelling.
    if (sweep.current) {
      const a = state.clock.elapsedTime * 0.9;
      sweep.current.position.set(Math.cos(a) * 1.8, Math.sin(a * 0.8) * 1.4, 1.6);
    }

    // Mirror the rotation onto the HTML avatar disc. Past 90° it's facing away.
    const el = overlay.current;
    if (el) {
      const yDeg = ((g.rotation.y * 180) / Math.PI) % 360;
      const facing = Math.cos(g.rotation.y) > 0;
      el.style.transform = `rotateX(${(-g.rotation.x * 180) / Math.PI}deg) rotateY(${yDeg}deg) scale(${g.scale.x})`;
      el.style.opacity = facing ? '1' : '0';
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={sealGeo} material={gold} />
      <mesh geometry={ringGeo} material={goldDeep} position={[0, 0, 0.09]} />
      <mesh geometry={rimGeo} material={goldDeep} position={[0, 0, 0.06]} />
      <pointLight ref={sweep} intensity={9} distance={6} color="#fff1cf" />
    </group>
  );
}

/** Tiny gold motes drifting up around the seal. */
function Motes({ reduced }: { reduced: boolean }): JSX.Element {
  const COUNT = 46;
  const { geo, mat } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.95 + Math.random() * 0.3;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
      seed[i] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPx: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime;
        uniform float uPx;
        varying float vA;
        void main() {
          vec3 p = position;
          float life = fract(uTime * (0.08 + aSeed * 0.08) + aSeed);
          p.y += life * 0.9 - 0.2;
          p.x += sin(uTime * 0.8 + aSeed * 30.0) * 0.05;
          vA = sin(life * 3.14159) * (0.55 + 0.45 * sin(uTime * 4.0 + aSeed * 50.0));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (2.0 + aSeed * 3.5) * uPx;
        }`,
      fragmentShader: /* glsl */ `
        precision mediump float;
        varying float vA;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = dot(c, c);
          if (d > 0.25) discard;
          float core = smoothstep(0.25, 0.0, d);
          gl_FragColor = vec4(vec3(1.0, 0.82, 0.45) * (0.6 + core), core * vA);
        }`,
    });
    return { geo, mat };
  }, []);
  const { gl } = useThree();
  useEffect(() => {
    mat.uniforms.uPx!.value = gl.getPixelRatio();
  }, [gl, mat]);
  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  useFrame((_, delta) => {
    if (!reduced) mat.uniforms.uTime!.value += delta;
  });
  return <points geometry={geo} material={mat} />;
}

export function GoldMedallionCanvas({
  tilt,
  overlay,
  reduced,
  flipKey,
}: {
  tilt: MutableRefObject<MedallionTilt>;
  overlay: MutableRefObject<HTMLDivElement | null>;
  reduced: boolean;
  flipKey: number;
}): JSX.Element {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, CAMERA_Z], fov: FOV }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      frameloop={reduced ? 'demand' : 'always'}
      style={{ position: 'absolute', inset: 0 }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[2, 3, 4]} intensity={1.6} color="#fff4dd" />
      <Seal tilt={tilt} overlay={overlay} reduced={reduced} flipKey={flipKey} />
      <Motes reduced={reduced} />
    </Canvas>
  );
}
