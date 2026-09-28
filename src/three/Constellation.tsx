import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { LinkKind, SavedLink } from '@/lib/types';
import { KIND_META, KIND_ORDER } from '@/modules/saveit/linkIntel';

/**
 * SaveIt's "Constellation": every saved link is a star. Links cluster into
 * glowing systems by type, threads join links that share a tag, unread
 * links breathe, favorites burn gold. Drag to orbit, scroll to zoom, hover
 * a star to see what it is, click to open it.
 */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rand(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Layout {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  flags: Float32Array; // x: unread, y: favorite
  centers: { kind: LinkKind; pos: THREE.Vector3; count: number }[];
  tagLines: Float32Array;
  spokeLines: Float32Array;
}

function buildLayout(links: SavedLink[]): Layout {
  const kinds = KIND_ORDER.filter((k) => links.some((l) => l.kind === k));
  const golden = Math.PI * (3 - Math.sqrt(5));
  const R = kinds.length <= 1 ? 0 : 5.2;
  const centers = kinds.map((kind, i) => {
    const y = kinds.length === 1 ? 0 : 1 - (i / (kinds.length - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    return {
      kind,
      pos: new THREE.Vector3(Math.cos(th) * r * R, y * R * 0.62, Math.sin(th) * r * R),
      count: links.filter((l) => l.kind === kind).length,
    };
  });
  const centerOf = new Map(centers.map((c) => [c.kind, c.pos]));

  const n = links.length;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const flags = new Float32Array(n * 2);
  const spokes: number[] = [];
  const color = new THREE.Color();

  links.forEach((l, i) => {
    const c = centerOf.get(l.kind) ?? new THREE.Vector3();
    const rnd = rand(hash(l.id));
    const count = centers.find((x) => x.kind === l.kind)?.count ?? 1;
    const spread = 0.9 + Math.min(2.6, Math.sqrt(count) * 0.42);
    const u = rnd() * 2 - 1;
    const phi = rnd() * Math.PI * 2;
    const rr = spread * Math.cbrt(0.15 + rnd() * 0.85);
    const s = Math.sqrt(1 - u * u);
    const p = new THREE.Vector3(c.x + Math.cos(phi) * s * rr, c.y + u * rr * 0.8, c.z + Math.sin(phi) * s * rr);
    positions.set([p.x, p.y, p.z], i * 3);
    color.set(l.isInteresting ? '#ffcf6b' : KIND_META[l.kind].color);
    colors.set([color.r, color.g, color.b], i * 3);
    sizes[i] = l.isInteresting ? 1.7 : 1.05 + rnd() * 0.35;
    flags[i * 2] = l.status === 'unread' ? 1 : 0;
    flags[i * 2 + 1] = l.isInteresting ? 1 : 0;
    spokes.push(c.x, c.y, c.z, p.x, p.y, p.z);
  });

  // Threads between links that share a tag (capped so big libraries stay light).
  const byTag = new Map<string, number[]>();
  links.forEach((l, i) => l.tags.forEach((t) => byTag.set(t, [...(byTag.get(t) ?? []), i])));
  const tag: number[] = [];
  let budget = 260;
  for (const idx of byTag.values()) {
    for (let a = 0; a < idx.length - 1 && budget > 0; a++) {
      const i = idx[a]!;
      const j = idx[a + 1]!;
      tag.push(positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!, positions[j * 3]!, positions[j * 3 + 1]!, positions[j * 3 + 2]!);
      budget--;
    }
  }

  return {
    positions,
    colors,
    sizes,
    flags,
    centers,
    tagLines: new Float32Array(tag),
    spokeLines: new Float32Array(spokes),
  };
}

const STAR_VERT = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute vec2 aFlags;
  uniform float uTime;
  uniform float uPx;
  uniform float uHover;
  varying vec3 vColor;
  varying float vFav;
  varying float vHot;
  void main() {
    vColor = aColor;
    vFav = aFlags.y;
    float id = float(gl_VertexID);
    vHot = step(abs(id - uHover), 0.5);
    float pulse = aFlags.x * (0.5 + 0.5 * sin(uTime * 2.4 + id * 1.7));
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPx * aSize * (250.0 + pulse * 90.0 + vHot * 190.0) / max(-mv.z, 0.1);
  }
`;
const STAR_FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  varying float vFav;
  varying float vHot;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float core = smoothstep(0.22, 0.0, d);
    float halo = smoothstep(0.5, 0.08, d) * 0.55;
    float ring = vFav * smoothstep(0.03, 0.0, abs(d - 0.36)) * 0.9;
    vec3 col = mix(vColor, vec3(1.0), core * 0.55 + vHot * 0.3);
    gl_FragColor = vec4(col, core + halo + ring);
  }
`;

/** Soft round sprite, generated once — used for cluster halos and dust. */
function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Atmosphere({ centers }: { centers: Layout['centers'] }): JSX.Element {
  const tex = useMemo(glowTexture, []);
  const dust = useMemo(() => {
    const n = 700;
    const pos = new Float32Array(n * 3);
    const r = rand(7);
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1;
      const th = r() * Math.PI * 2;
      const rad = 7 + r() * 16;
      const s = Math.sqrt(1 - u * u);
      pos.set([Math.cos(th) * s * rad, u * rad * 0.7, Math.sin(th) * s * rad], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  const halo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(centers.length * 3);
    const col = new Float32Array(centers.length * 3);
    const c = new THREE.Color();
    centers.forEach((k, i) => {
      pos.set([k.pos.x, k.pos.y, k.pos.z], i * 3);
      c.set(KIND_META[k.kind].color);
      col.set([c.r, c.g, c.b], i * 3);
    });
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, [centers]);
  const dustMat = useMemo(
    () => new THREE.PointsMaterial({ size: 0.09, map: tex, color: '#9aa4b2', transparent: true, opacity: 0.35, depthWrite: false, sizeAttenuation: true }),
    [tex],
  );
  const haloMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 5.5,
        map: tex,
        vertexColors: true,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    [tex],
  );
  const dustRef = useRef<THREE.Points>(null);
  useFrame((_, d) => {
    if (dustRef.current) dustRef.current.rotation.y -= d * 0.01;
  });
  useEffect(
    () => () => {
      tex.dispose();
      dust.dispose();
      halo.dispose();
      dustMat.dispose();
      haloMat.dispose();
    },
    [tex, dust, halo, dustMat, haloMat],
  );
  return (
    <>
      <points ref={dustRef} geometry={dust} material={dustMat} raycast={() => null} />
      <points geometry={halo} material={haloMat} raycast={() => null} />
    </>
  );
}

function Scene({
  links,
  onHover,
  onOpen,
  labelRefs,
  reduced,
}: {
  links: SavedLink[];
  onHover: (i: number | null, x: number, y: number) => void;
  onOpen: (link: SavedLink) => void;
  labelRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  reduced: boolean;
}): JSX.Element {
  const { camera, gl, size } = useThree();
  const layout = useMemo(() => buildLayout(links), [links]);
  const group = useRef<THREE.Group>(null);
  const hoverRef = useRef(-1);

  const starGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(layout.positions, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(layout.colors, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(layout.sizes, 1));
    g.setAttribute('aFlags', new THREE.BufferAttribute(layout.flags, 2));
    return g;
  }, [layout]);
  const starMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uPx: { value: gl.getPixelRatio() }, uHover: { value: -1 } },
      }),
    [gl],
  );
  const spokeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(layout.spokeLines, 3));
    return g;
  }, [layout]);
  const tagGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(layout.tagLines, 3));
    return g;
  }, [layout]);
  const spokeMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#8a8f98', transparent: true, opacity: 0.12, depthWrite: false }), []);
  const tagMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#e4f222', transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending }),
    [],
  );
  const coreGeo = useMemo(() => new THREE.SphereGeometry(0.1, 20, 20), []);

  useEffect(
    () => () => {
      starGeo.dispose();
      spokeGeo.dispose();
      tagGeo.dispose();
    },
    [starGeo, spokeGeo, tagGeo],
  );
  useEffect(
    () => () => {
      starMat.dispose();
      spokeMat.dispose();
      tagMat.dispose();
      coreGeo.dispose();
    },
    [starMat, spokeMat, tagMat, coreGeo],
  );

  // Orbit controls: drag, zoom, gentle auto-rotation that pauses while you interact.
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true;
    c.dampingFactor = 0.07;
    c.enablePan = false;
    c.minDistance = 4;
    c.maxDistance = 30;
    c.autoRotate = !reduced;
    c.autoRotateSpeed = 0.55;
    c.rotateSpeed = 0.6;
    controls.current = c;
    return () => c.dispose();
  }, [camera, gl, reduced]);

  // Fly in on mount.
  useEffect(() => {
    camera.position.set(0, 3.5, reduced ? 15 : 34);
    camera.lookAt(0, 0, 0);
  }, [camera, reduced]);

  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, delta) => {
    starMat.uniforms.uTime!.value += delta;
    if (!reduced && camera.position.length() > 15.5) {
      camera.position.multiplyScalar(1 - Math.min(0.06, delta * 2.4));
    }
    controls.current?.update();
    // Project cluster labels.
    layout.centers.forEach((c, i) => {
      const el = labelRefs.current[i];
      if (!el) return;
      tmp.copy(c.pos);
      tmp.y += 1.9;
      tmp.project(state.camera);
      const visible = tmp.z < 1;
      el.style.transform = `translate(-50%, -50%) translate(${((tmp.x + 1) / 2) * size.width}px, ${((1 - tmp.y) / 2) * size.height}px)`;
      el.style.opacity = visible ? '1' : '0';
    });
  });

  const setHover = (i: number | null, e?: ThreeEvent<PointerEvent>): void => {
    const idx = i ?? -1;
    if (hoverRef.current !== idx) {
      hoverRef.current = idx;
      starMat.uniforms.uHover!.value = idx;
      gl.domElement.style.cursor = idx >= 0 ? 'pointer' : 'grab';
      if (controls.current) controls.current.autoRotate = idx < 0 && !reduced;
    }
    onHover(i, e?.nativeEvent.offsetX ?? 0, e?.nativeEvent.offsetY ?? 0);
  };

  return (
    <group ref={group}>
      <Atmosphere centers={layout.centers} />
      <lineSegments geometry={spokeGeo} material={spokeMat} />
      {layout.tagLines.length ? <lineSegments geometry={tagGeo} material={tagMat} /> : null}
      {layout.centers.map((c) => (
        <mesh key={c.kind} geometry={coreGeo} position={c.pos}>
          <meshBasicMaterial color={KIND_META[c.kind].color} transparent opacity={0.9} />
        </mesh>
      ))}
      <points
        geometry={starGeo}
        material={starMat}
        onPointerMove={(e) => {
          e.stopPropagation();
          setHover(typeof e.index === 'number' ? e.index : null, e);
        }}
        onPointerOut={() => setHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          const l = typeof e.index === 'number' ? links[e.index] : undefined;
          if (l) onOpen(l);
        }}
      />
    </group>
  );
}

export function Constellation({ links, onOpen }: { links: SavedLink[]; onOpen: (link: SavedLink) => void }): JSX.Element {
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const kinds = useMemo(() => KIND_ORDER.filter((k) => links.some((l) => l.kind === k)), [links]);
  const hovered = hover ? links[hover.i] : undefined;

  return (
    <div className="save-space relative h-full min-h-[420px] w-full overflow-hidden">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 3.5, 34], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        raycaster={{ params: { Points: { threshold: 0.28 }, Mesh: {}, Line: { threshold: 0 }, LOD: {}, Sprite: {} } }}
        onPointerMissed={() => setHover(null)}
        style={{ cursor: 'grab' }}
      >
        <Scene
          links={links}
          reduced={reduced}
          labelRefs={labelRefs}
          onOpen={onOpen}
          onHover={(i, x, y) => setHover(i === null ? null : { i, x, y })}
        />
      </Canvas>

      {kinds.map((k, i) => (
        <div
          key={k}
          ref={(el) => {
            labelRefs.current[i] = el;
          }}
          className="save-space-label pointer-events-none absolute left-0 top-0"
          style={{ ['--k' as string]: KIND_META[k].color }}
        >
          {KIND_META[k].plural}
          <span className="mono ms-1.5 opacity-70">{links.filter((l) => l.kind === k).length}</span>
        </div>
      ))}

      {hovered && hover ? (
        <div
          className="save-space-tip pointer-events-none absolute z-10 w-[240px] overflow-hidden rounded-[12px]"
          style={{ left: Math.min(hover.x + 16, 9999), top: hover.y + 16 }}
        >
          {hovered.image ? (
            <img src={hovered.image} alt="" referrerPolicy="no-referrer" className="aspect-video w-full object-cover" />
          ) : null}
          <div className="p-2.5">
            <p className="line-clamp-2 text-[12.5px] font-medium leading-[1.35] text-paper">{hovered.title}</p>
            <p className="mt-1 truncate text-[11px] text-ash">{hovered.domain} · click to open</p>
          </div>
        </div>
      ) : null}

      <div className="save-space-hint pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1.5 text-[11.5px]">
        Drag to orbit · scroll to zoom · click a star to open it
      </div>
    </div>
  );
}
