import { Canvas, useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ModuleId } from '@/lib/types';
import type { BgStyle } from '@/state/uiStore';
import { AmbientField, type PointerState } from './AmbientField';
import { useTheme } from '@/state/themeStore';
import { buildSeeds, buildShape, MODULE_SHAPE, MODULE_TINT } from './shapes';

/** Fewer particles on phones — same look, a fraction of the fill-rate cost. */
function particleCount(): number {
  if (typeof window === 'undefined') return 3600;
  return Math.min(window.innerWidth, window.innerHeight) < 600 ? 2200 : 3600;
}

const VERT = /* glsl */ `
  attribute vec3 aTarget;
  attribute float aSeed;
  uniform float uMorph;
  uniform float uTime;
  uniform float uSize;
  uniform float uEnergy;
  uniform float uWave;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform float uAspect;
  varying float vSeed;
  varying float vDepth;
  varying float vGlow;
  varying float vTwinkle;

  void main() {
    float e = smoothstep(0.0, 1.0, uMorph);
    vec3 p = mix(position, aTarget, e);

    // transient dispersion at the midpoint of a morph — the field "breathes"
    float burst = sin(e * 3.14159) * 1.15;
    float t = uTime * 0.6 + aSeed * 6.2831;
    vec3 drift = vec3(sin(t), cos(t * 0.83), sin(t * 0.67));
    p += drift * (0.11 + burst * 0.55 + uEnergy * 0.35);

    // shockwave — a spherical ring rolls outward from the core on every switch
    float r = length(p);
    float front = uWave * 11.0;
    float ring = exp(-pow((r - front) * 1.3, 2.0)) * (1.0 - uWave) * step(0.001, uWave);
    p += normalize(p + vec3(0.0001)) * ring * 0.9;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * mv;

    // pointer gravity well, in screen space: points part around the cursor
    vec2 ndc = clip.xy / clip.w;
    vec2 d = (ndc - uPointer) * vec2(uAspect, 1.0);
    float dist = length(d);
    float infl = uPointerStrength * smoothstep(0.42, 0.0, dist);
    vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0);
    clip.xy += (dir * infl * 0.085 / vec2(uAspect, 1.0)) * clip.w;
    gl_Position = clip;

    vTwinkle = 0.72 + 0.28 * sin(uTime * (1.1 + aSeed * 2.4) + aSeed * 40.0);
    gl_PointSize = uSize * (1.0 / max(-mv.z, 0.001)) * (0.55 + aSeed * 1.05) * (1.0 + infl * 0.7 + ring * 0.9);
    vSeed = aSeed;
    vDepth = -mv.z;
    vGlow = clamp(infl + ring, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uTint;
  uniform vec3 uGrey;
  uniform float uOpacity;
  varying float vSeed;
  varying float vDepth;
  varying float vGlow;
  varying float vTwinkle;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    float alpha = smoothstep(0.25, 0.0, d);

    // most points stay in the grey system; a minority carry the module tint,
    // and anything the cursor or the shockwave touches lights up with it
    float chroma = max(smoothstep(0.72, 1.0, vSeed), vGlow * 0.85);
    vec3 col = mix(uGrey, uTint, chroma);

    float fog = smoothstep(30.0, 7.0, vDepth);
    gl_FragColor = vec4(col, alpha * uOpacity * fog * vTwinkle * (1.0 + vGlow * 0.9));
  }
`;

function Field({
  module,
  reduced,
  energized,
  pointer,
}: {
  module: ModuleId;
  reduced: boolean;
  energized: boolean;
  pointer: React.MutableRefObject<PointerState>;
}): JSX.Element {
  const points = useRef<THREE.Points>(null);
  const { size } = useThree();
  const { preference } = useTheme();
  const COUNT = useMemo(particleCount, []);

  const seeds = useMemo(() => buildSeeds(COUNT), [COUNT]);
  const initial = useMemo(() => buildShape(MODULE_SHAPE[module], COUNT), [COUNT]); // eslint-disable-line react-hooks/exhaustive-deps


  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(initial.slice(), 3));
    g.setAttribute('aTarget', new THREE.BufferAttribute(initial.slice(), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    return g;
  }, [initial, seeds]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uMorph: { value: 0 },
          uTime: { value: 0 },
          uSize: { value: 46 },
          uEnergy: { value: 0 },
          uWave: { value: 0 },
          uPointer: { value: new THREE.Vector2(0, 0) },
          uPointerStrength: { value: 0 },
          uAspect: { value: 1 },
          uOpacity: { value: 0 },
          uTint: { value: new THREE.Vector3(...MODULE_TINT[module]) },
          uGrey: { value: new THREE.Vector3(0.42, 0.44, 0.48) },
        },
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  // Additive blending is what makes the field glow against the native dark
  // void — the same particles would wash out to invisible over a light page,
  // so light mode falls back to ordinary alpha blending instead.
  useEffect(() => {
    const light = preference === 'light';
    material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    const grey = material.uniforms.uGrey!.value as THREE.Vector3;
    if (light) grey.set(0.3, 0.32, 0.36);
    else grey.set(0.42, 0.44, 0.48);
    material.needsUpdate = true;
  }, [material, preference]);

  // Fade in once, so the first paint is calm rather than a flash of particles.
  useEffect(() => {
    gsap.to(material.uniforms.uOpacity!, { value: 0.34, duration: 1.6, ease: 'power2.out', delay: 0.15 });
  }, [material]);

  // Opening the phone menu or the command palette charges the field up.
  const settled = useRef(false);
  useEffect(() => {
    if (!settled.current) {
      settled.current = true;
      if (!energized) return;
    }
    gsap.to(material.uniforms.uEnergy!, { value: energized ? 0.9 : 0, duration: energized ? 0.7 : 1.2, ease: 'power2.out' });
    gsap.to(material.uniforms.uOpacity!, { value: energized ? 0.5 : 0.34, duration: 0.9, ease: 'power2.out' });
  }, [energized, material]);

  // Re-form the field whenever the module changes.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
    const tgt = geometry.getAttribute('aTarget') as THREE.BufferAttribute;
    const next = buildShape(MODULE_SHAPE[module], COUNT);
    tgt.array.set(next);
    tgt.needsUpdate = true;

    const uMorph = material.uniforms.uMorph!;
    const uTint = material.uniforms.uTint!.value as THREE.Vector3;
    const [r, g, b] = MODULE_TINT[module];

    gsap.to(uTint, { x: r, y: g, z: b, duration: 1.1, ease: 'power2.inOut' });
    if (!reduced) {
      gsap.fromTo(material.uniforms.uWave!, { value: 0.0001 }, { value: 1, duration: 1.7, ease: 'power1.out', overwrite: true });
    }

    if (reduced) {
      pos.array.set(next);
      pos.needsUpdate = true;
      uMorph.value = 0;
      return;
    }

    gsap.fromTo(
      uMorph,
      { value: 0 },
      {
        value: 1,
        duration: 1.35,
        ease: 'power2.inOut',
        overwrite: true,
        onComplete: () => {
          pos.array.set(next);
          pos.needsUpdate = true;
          uMorph.value = 0;
        },
      },
    );
  }, [module, geometry, material, reduced, COUNT]);

  useFrame((state, delta) => {
    const mesh = points.current;
    if (!mesh) return;
    const u = material.uniforms;
    u.uTime!.value += delta;
    u.uAspect!.value = size.width / Math.max(1, size.height);
    if (!reduced) {
      const pt = pointer.current;
      (u.uPointer!.value as THREE.Vector2).set(pt.x, pt.y);
      // the well is strong while the pointer moves, and relaxes when it rests
      const idle = (performance.now() - pt.last) / 1000;
      const target = idle < 1.4 ? 1 : 0;
      u.uPointerStrength!.value += (target - u.uPointerStrength!.value) * (1 - Math.exp(-delta * (target ? 5 : 1.4)));

      mesh.rotation.y += delta * (0.035 + u.uEnergy!.value * 0.09);
      mesh.rotation.x = Math.sin(state.clock.elapsedTime * 0.11) * 0.11;
      // parallax — the field leans toward the cursor, never follows it
      mesh.position.x += (pt.x * 0.85 - mesh.position.x) * 0.025;
      mesh.position.y += (pt.y * 0.5 - mesh.position.y) * 0.025;
    }
  });

  return <points ref={points} geometry={geometry} material={material} />;
}

/** Some phones, locked-down browsers and remote sessions have no WebGL at all. */
function webglAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ?? canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl'),
    );
  } catch {
    return false;
  }
}

/** Window-level pointer (the canvas itself is pointer-events: none), eased per frame. */
function usePointer(): React.MutableRefObject<PointerState> {
  const pointer = useRef<PointerState>({ x: 0, y: 0, tx: 0, ty: 0, last: -1e9, down: false });
  useEffect(() => {
    const move = (e: PointerEvent): void => {
      const p = pointer.current;
      p.tx = (e.clientX / window.innerWidth) * 2 - 1;
      p.ty = -((e.clientY / window.innerHeight) * 2 - 1);
      p.last = performance.now();
    };
    const down = (e: PointerEvent): void => {
      move(e);
      pointer.current.down = true;
    };
    const up = (): void => {
      pointer.current.down = false;
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', up, { passive: true });
    window.addEventListener('blur', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('blur', up);
    };
  }, []);
  return pointer;
}

function PointerEase({ pointer }: { pointer: React.MutableRefObject<PointerState> }): null {
  useFrame((_, delta) => {
    const pt = pointer.current;
    const k = 1 - Math.exp(-delta * 7);
    pt.x += (pt.tx - pt.x) * k;
    pt.y += (pt.ty - pt.y) * k;
  });
  return null;
}

/**
 * Keeps the background from ever costing the UI its frame rate: measures
 * real FPS every ~2s and steps render resolution down on slow machines (and
 * back up once there's headroom). It's a backdrop — it should never be the
 * reason typing or scrolling feels heavy.
 */
function AdaptiveQuality({ max }: { max: number }): null {
  const setDpr = useThree((s) => s.setDpr);
  const st = useRef({ acc: 0, frames: 0, dpr: max, calm: 0 });
  useFrame((_, delta) => {
    const s = st.current;
    if (delta > 0.25) return; // tab switch / GC hiccup — not representative
    s.acc += delta;
    s.frames++;
    if (s.acc < 2) return;
    const fps = s.frames / s.acc;
    s.acc = 0;
    s.frames = 0;
    if (fps < 47 && s.dpr > 0.7) {
      s.dpr = Math.max(0.7, Math.round((s.dpr - 0.3) * 100) / 100);
      s.calm = 0;
      setDpr(s.dpr);
    } else if (fps > 57 && s.dpr < max && ++s.calm >= 4) {
      s.dpr = Math.min(max, Math.round((s.dpr + 0.2) * 100) / 100);
      s.calm = 0;
      setDpr(s.dpr);
    }
  });
  return null;
}

export function SpatialField({
  module,
  energized = false,
  style = 'waves',
}: {
  module: ModuleId;
  energized?: boolean;
  style?: BgStyle;
}): JSX.Element {
  const pointer = usePointer();
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [supported] = useState(webglAvailable);

  // No WebGL: the atmospheric floor alone still grounds the interface.
  if (!supported) {
    return (
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 78% at 50% 108%, rgba(208,214,224,0.06) 0%, rgba(8,9,10,0) 62%), radial-gradient(80% 55% at 50% -10%, rgba(228,242,34,0.04) 0%, rgba(8,9,10,0) 60%)',
          }}
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <Canvas
        dpr={[1, 1.65]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 15.5], fov: 52 }}
        frameloop={reduced ? 'demand' : 'always'}
      >
        <AdaptiveQuality max={Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 1.65)} />
        <PointerEase pointer={pointer} />
        <AmbientField module={module} style={style} energized={energized} reduced={reduced} pointer={pointer} />
        {style === 'orbit' ? <Field module={module} reduced={reduced} energized={energized} pointer={pointer} /> : null}
      </Canvas>
      {/* Atmospheric floor — the one place a gradient is allowed */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 78% at 50% 108%, rgba(208,214,224,0.055) 0%, rgba(8,9,10,0) 62%), radial-gradient(80% 55% at 50% -10%, rgba(228,242,34,0.035) 0%, rgba(8,9,10,0) 60%)',
        }}
      />
    </div>
  );
}
