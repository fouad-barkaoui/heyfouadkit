import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ModuleId } from '@/lib/types';
import type { BgStyle } from '@/state/uiStore';
import { useTheme } from '@/state/themeStore';
import { MODULE_TINT } from './shapes';

/**
 * Edge-to-edge ambient particle layer. One point cloud, laid out entirely in
 * the vertex shader, so it always spans the full viewport at any size:
 *  - waves:     a dot lattice rolling like a sea; the cursor lifts a swell
 *               and sends ripples through it
 *  - starfield: a warp of stars streaming toward you; the cursor parts them
 *  - flow:      drifting dust on a slow current; the cursor stirs a vortex
 * (orbit = flow at low intensity, sitting behind the module shapes)
 */

const STYLE_ID: Record<BgStyle, number> = { waves: 0, starfield: 1, flow: 2, orbit: 2 };

const VERT = /* glsl */ `
  attribute vec2 aGrid;
  attribute vec3 aRand;
  attribute float aSeed;
  uniform float uTime;
  uniform float uStyle;
  uniform float uWave;
  uniform float uEnergy;
  uniform float uFreq;
  uniform float uSize;
  uniform vec2 uHalf;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform float uPress;
  varying float vGlow;
  varying float vFade;
  varying float vSeed;

  void main() {
    float t = uTime;
    vec3 p;
    float glow = 0.0;
    float fade = 1.0;
    float sizeMul = 1.0;
    vec2 pw = uPointer * uHalf;

    if (uStyle < 0.5) {
      // ── waves ───────────────────────────────────────────
      p = vec3(aGrid * uHalf * 1.1, 0.0);
      float w = sin(p.x * 0.42 * uFreq + t * 0.9) * cos(p.y * 0.55 * uFreq - t * 0.7) * 0.75
              + sin((p.x + p.y) * 0.22 + t * 0.45) * 0.45;
      float d = distance(p.xy, pw);
      float ripple = sin(d * 1.55 - t * 5.0) * exp(-d * 0.3) * uPointerStrength;
      float lift = exp(-d * d * 0.09) * (uPointerStrength + uPress * 1.4);
      p.z = w * (1.0 + uEnergy) + ripple * 0.9 + lift * 2.2;
      glow = clamp(lift * 0.9 + abs(ripple) * 0.45, 0.0, 1.0);
      // keep each dot on its screen position — height reads as size and glow
      p.xy *= (15.5 - p.z) / 15.5;
      fade = 0.45 + 0.55 * smoothstep(-1.3, 1.4, p.z);
    } else if (uStyle < 1.5) {
      // ── starfield ───────────────────────────────────────
      float speed = 0.05 * (1.0 + uEnergy * 4.0 + uPress * 5.0);
      float depth = fract(aRand.z + t * speed);
      float z = mix(-30.0, 11.0, depth);
      float spread = (15.5 - z) / 15.5;
      p = vec3(aRand.xy * uHalf * spread * 1.06, z);
      // stars near the cursor's line of sight part around it
      vec2 onScreen = p.xy / spread;
      vec2 dv = onScreen - pw;
      float dist = length(dv);
      float part = exp(-dist * dist * 0.06) * uPointerStrength;
      p.xy += (dist > 0.001 ? dv / dist : vec2(0.0)) * part * 2.2 * spread;
      p.xy -= pw * 0.08 * depth;
      glow = part * 0.8 + uPress * 0.3;
      fade = smoothstep(0.0, 0.2, depth) * smoothstep(1.0, 0.82, depth);
      sizeMul = 0.7 + depth * 0.9;
    } else {
      // ── flow ────────────────────────────────────────────
      p = vec3(aRand.xy * uHalf * 1.12, (aRand.z - 0.5) * 5.0);
      vec2 flow = vec2(
        sin(p.y * 0.32 + t * 0.28 + aSeed * 3.1),
        cos(p.x * 0.27 - t * 0.23 + aSeed * 2.3)
      );
      p.xy += flow * (1.3 + uEnergy);
      p.x += sin(t * 0.05 + aSeed * 6.2831) * 1.5;
      vec2 dv = p.xy - pw;
      float dist = length(dv);
      float s = exp(-dist * dist * 0.045) * (uPointerStrength + uPress);
      p.xy += vec2(-dv.y, dv.x) * s * 0.42 + dv * s * 0.22;
      glow = clamp(s, 0.0, 1.0);
      fade = 0.55 + 0.45 * sin(t * (0.6 + aSeed) + aSeed * 30.0);
    }

    // shockwave from the centre on every module switch
    float r = length(p.xy);
    float reach = max(uHalf.x, uHalf.y) * 1.35;
    float ring = exp(-pow((r - uWave * reach) * 0.85, 2.0)) * (1.0 - uWave) * step(0.001, uWave);
    p.z += ring * 1.4;
    glow = max(glow, ring);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uSize * (1.0 / max(-mv.z, 0.001)) * (0.55 + aSeed * 0.9) * sizeMul * (1.0 + glow * 1.1), 9.0);
    vGlow = glow;
    vFade = fade;
    vSeed = aSeed;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uTint;
  uniform vec3 uGrey;
  uniform float uOpacity;
  varying float vGlow;
  varying float vFade;
  varying float vSeed;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    float alpha = smoothstep(0.25, 0.02, d);
    float chroma = max(smoothstep(0.8, 1.0, vSeed) * 0.8, vGlow);
    vec3 col = mix(uGrey, uTint, clamp(chroma, 0.0, 1.0));
    gl_FragColor = vec4(col, alpha * uOpacity * vFade * (0.75 + vGlow * 1.2));
  }
`;

function counts(): { cols: number; rows: number } {
  const w = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const h = typeof window === 'undefined' ? 900 : window.innerHeight;
  const small = Math.min(w, h) < 600;
  const target = small ? 3800 : 9000;
  const aspect = w / Math.max(1, h);
  const cols = Math.max(20, Math.round(Math.sqrt(target * aspect)));
  const rows = Math.max(20, Math.round(target / cols));
  return { cols, rows };
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** The same shared pointer the orbit field uses: NDC, eased, with a rest decay. */
export interface PointerState {
  x: number;
  y: number;
  tx: number;
  ty: number;
  last: number;
  down: boolean;
}

export function AmbientField({
  module,
  style,
  energized,
  reduced,
  pointer,
}: {
  module: ModuleId;
  style: BgStyle;
  energized: boolean;
  reduced: boolean;
  pointer: React.MutableRefObject<PointerState>;
}): JSX.Element {
  const { size, camera } = useThree();
  const { resolved: preference } = useTheme();
  const points = useRef<THREE.Points>(null);

  const { cols, rows } = useMemo(counts, []);
  const geometry = useMemo(() => {
    const n = cols * rows;
    const grid = new Float32Array(n * 2);
    const rand = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const pos = new Float32Array(n * 3);
    const r = rng(0xa11b1e);
    for (let j = 0; j < rows; j += 1) {
      for (let i = 0; i < cols; i += 1) {
        const k = j * cols + i;
        grid[k * 2] = (i / (cols - 1)) * 2 - 1;
        grid[k * 2 + 1] = (j / (rows - 1)) * 2 - 1;
        rand[k * 3] = r() * 2 - 1;
        rand[k * 3 + 1] = r() * 2 - 1;
        rand[k * 3 + 2] = r();
        seed[k] = r();
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aGrid', new THREE.BufferAttribute(grid, 2));
    g.setAttribute('aRand', new THREE.BufferAttribute(rand, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    // positions are computed in the shader — never let three cull the cloud
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    return g;
  }, [cols, rows]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uStyle: { value: STYLE_ID[style] },
          uWave: { value: 0 },
          uEnergy: { value: 0 },
          uFreq: { value: 1 },
          uSize: { value: 30 },
          uHalf: { value: new THREE.Vector2(10, 7) },
          uPointer: { value: new THREE.Vector2(0, 0) },
          uPointerStrength: { value: 0 },
          uPress: { value: 0 },
          uOpacity: { value: 0 },
          uTint: { value: new THREE.Vector3(...MODULE_TINT[module]) },
          uGrey: { value: new THREE.Vector3(0.46, 0.48, 0.52) },
        },
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useEffect(() => {
    const light = preference === 'light';
    material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    const grey = material.uniforms.uGrey!.value as THREE.Vector3;
    if (light) grey.set(0.28, 0.3, 0.34);
    else grey.set(0.46, 0.48, 0.52);
    material.needsUpdate = true;
  }, [material, preference]);

  // Style change: dim out, swap the layout, bloom back in.
  const baseOpacity = style === 'orbit' ? 0.16 : style === 'starfield' ? 0.5 : style === 'waves' ? 0.34 : 0.4;
  const firstStyle = useRef(true);
  useEffect(() => {
    const u = material.uniforms;
    const size = style === 'waves' ? 30 : style === 'starfield' ? 26 : 34;
    if (firstStyle.current) {
      firstStyle.current = false;
      u.uStyle!.value = STYLE_ID[style];
      u.uSize!.value = size;
      gsap.to(u.uOpacity!, { value: baseOpacity, duration: 1.6, ease: 'power2.out', delay: 0.1 });
      return;
    }
    const tl = gsap.timeline();
    tl.to(u.uOpacity!, { value: 0, duration: 0.35, ease: 'power2.in' })
      .add(() => {
        u.uStyle!.value = STYLE_ID[style];
        u.uSize!.value = size;
      })
      .to(u.uOpacity!, { value: baseOpacity, duration: 0.9, ease: 'power2.out' });
    return () => {
      tl.kill();
    };
  }, [style, material, baseOpacity]);

  useEffect(() => {
    gsap.to(material.uniforms.uEnergy!, { value: energized ? 0.8 : 0, duration: energized ? 0.7 : 1.2, ease: 'power2.out' });
  }, [energized, material]);

  // Module switch: tint glide, a shockwave, and each module gets its own swell.
  const firstModule = useRef(true);
  useEffect(() => {
    const u = material.uniforms;
    const [r, g, b] = MODULE_TINT[module];
    const tint = u.uTint!.value as THREE.Vector3;
    if (firstModule.current) {
      firstModule.current = false;
      return;
    }
    gsap.to(tint, { x: r, y: g, z: b, duration: 1.1, ease: 'power2.inOut' });
    const freq = 0.8 + ((module.charCodeAt(0) + module.length * 7) % 9) * 0.06;
    gsap.to(u.uFreq!, { value: freq, duration: 1.6, ease: 'power2.inOut' });
    if (!reduced) {
      gsap.fromTo(u.uWave!, { value: 0.0001 }, { value: 1, duration: 1.9, ease: 'power1.out', overwrite: true });
    }
  }, [module, material, reduced]);

  useFrame((_, delta) => {
    const u = material.uniforms;
    if (!reduced) u.uTime!.value += delta;
    // half-extent of the visible plane at z = 0, so the cloud always fills the screen
    const cam = camera as THREE.PerspectiveCamera;
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.position.z;
    (u.uHalf!.value as THREE.Vector2).set(halfH * (size.width / Math.max(1, size.height)), halfH);

    const pt = pointer.current;
    (u.uPointer!.value as THREE.Vector2).set(pt.x, pt.y);
    const idle = (performance.now() - pt.last) / 1000;
    const target = reduced ? 0 : idle < 1.6 ? 1 : 0;
    u.uPointerStrength!.value += (target - u.uPointerStrength!.value) * (1 - Math.exp(-delta * (target ? 5 : 1.2)));
    const press = pt.down && !reduced ? 1 : 0;
    u.uPress!.value += (press - u.uPress!.value) * (1 - Math.exp(-delta * (press ? 6 : 2.5)));
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
