"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { aqiBand, aqiSeverity } from "@/lib/aqi";
import { SENSOR_NETWORK } from "@/lib/nodes";

export type GlobePulse = {
  key: number;
  station: string;
  lat: number;
  lng: number;
  aqi: number;
  mine: boolean;
  born: number;
  power: number;
};

/** Structural ref type — identical under React 18 and 19 typings. */
type NumRef = { current: number };

const DEG = Math.PI / 180;
const R = 1;
const WAVE_LIFE = 1500;
const WAVE_POOL = 9;

function latLngToVec3(lat: number, lng: number, radius = R, out?: THREE.Vector3) {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  const v = out ?? new THREE.Vector3();
  return v.set(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/** Cheap smooth scalar field standing in for a land mask, so dots clump. */
function landMask(x: number, y: number, z: number) {
  const a = Math.sin(x * 2.7 + Math.cos(y * 3.1) * 1.4);
  const b = Math.cos(y * 2.2 - Math.sin(z * 2.9) * 1.1);
  const c = Math.sin(z * 3.3 + Math.cos(x * 1.9) * 1.7);
  const n = (a + b + c) / 3;
  return Math.max(0, Math.min(1, n * 0.5 + 0.5));
}

const DOT_COUNT = 5400;

function buildDots() {
  const positions: number[] = [];
  const colors: number[] = [];
  const seeds: number[] = [];
  const deep = new THREE.Color("#0b5f7a");
  const shelf = new THREE.Color("#22d3ee");
  const land = new THREE.Color("#22e39a");
  const tmp = new THREE.Color();

  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < DOT_COUNT; i += 1) {
    const y = 1 - (i / (DOT_COUNT - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = golden * i;
    const x = Math.cos(angle) * ring;
    const z = Math.sin(angle) * ring;

    const mask = landMask(x, y, z);
    if (mask < 0.46) continue; // ocean stays dark

    positions.push(x * R, y * R, z * R);
    tmp.copy(deep).lerp(shelf, Math.min(1, (mask - 0.46) * 2.6));
    tmp.lerp(land, 0.2 + 0.28 * ((x + z) % 1) ** 2);
    tmp.multiplyScalar(1 - Math.abs(y) * 0.3);
    colors.push(tmp.r, tmp.g, tmp.b);
    seeds.push((i * 0.618033988749895) % 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("aColor", new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 1));
  return geo;
}

const DOT_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uScale;
  uniform float uSurge;
  attribute vec3 aColor;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vFace;

  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 nv = normalize(mat3(modelViewMatrix) * normalize(position));
    vec3 viewDir = length(mv.xyz) > 0.0001 ? normalize(-mv.xyz) : vec3(0.0, 0.0, 1.0);
    vFace = smoothstep(-0.25, 0.85, dot(nv, viewDir));
    float twinkle = 0.72 + 0.28 * sin(uTime * 1.7 + aSeed * 42.0);
    float size = uSize * (0.55 + aSeed * 0.8) * twinkle * (1.0 + uSurge * 1.1);
    gl_PointSize = size * uScale / max(0.001, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const DOT_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vFace;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.02, d);
    gl_FragColor = vec4(vColor, soft * (0.08 + 0.92 * vFace));
  }
`;

function DotShell({ surge }: { surge: NumRef }) {
  const geometry = useMemo(buildDots, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: 0.021 },
          uScale: { value: 400 },
          uSurge: { value: 0 },
        },
        vertexShader: DOT_VERT,
        fragmentShader: DOT_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const { gl } = useThree();

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uScale.value = gl.domElement.height / 2;
    material.uniforms.uSurge.value = surge.current;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

function buildGraticule() {
  const pts: number[] = [];
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const step = 6;
  const rr = R * 1.0015;

  for (let lat = -72; lat <= 72; lat += 18) {
    for (let lng = -180; lng < 180; lng += step) {
      latLngToVec3(lat, lng, rr, v0);
      latLngToVec3(lat, lng + step, rr, v1);
      pts.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z);
    }
  }
  for (let lng = -180; lng < 180; lng += 15) {
    for (let lat = -90; lat < 90; lat += step) {
      latLngToVec3(lat, lng, rr, v0);
      latLngToVec3(lat + step, lng, rr, v1);
      pts.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return geo;
}

function Graticule() {
  const geometry = useMemo(buildGraticule, []);
  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color("#38bdf8"),
        transparent: true,
        opacity: 0.085,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return <lineSegments geometry={geometry} material={material} />;
}

const ATMO_VERT = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uSurge;
  varying vec3 vNormal;

  void main() {
    // BackSide: the visible band runs from the planet silhouette (facing = -0.66)
    // out to the halo limb (facing = 0). Map that span to 1 -> 0 so the glow
    // fades to nothing before the sphere edge instead of clipping at it.
    float facing = dot(vNormal, vec3(0.0, 0.0, 1.0));
    float rim = clamp(0.74 - facing, 0.0, 1.0);
    float band = clamp((rim - 0.74) / 0.26, 0.0, 1.0);
    float intensity = band > 0.0 ? pow(band, 1.7) * (0.8 + uSurge * 1.1) : 0.0;
    gl_FragColor = vec4(uColor, clamp(intensity, 0.0, 1.0));
  }
`;

function Atmosphere({ surge }: { surge: NumRef }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color("#2ee6c0") },
          uSurge: { value: 0 },
        },
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    material.uniforms.uSurge.value = surge.current;
  });
  return (
    <mesh material={material} frustumCulled={false}>
      <sphereGeometry args={[1.34, 48, 48]} />
    </mesh>
  );
}

const NODE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uScale;
  attribute vec3 aColor;
  attribute float aWeight;
  attribute float aPulse;
  varying vec3 vColor;
  varying float vPulse;

  void main() {
    vColor = aColor;
    vPulse = aPulse;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float breathe = 0.88 + 0.12 * sin(uTime * 2.4 + position.y * 9.0);
    float size = uSize * aWeight * breathe * (1.0 + aPulse * 2.4);
    gl_PointSize = size * uScale / max(0.001, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const NODE_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vPulse;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    if (d > 0.5) discard;
    float core = smoothstep(0.45, 0.0, d);
    float halo = smoothstep(0.5, 0.1, d);
    vec3 col = mix(vColor, vec3(1.0), clamp(vPulse * 0.8, 0.0, 1.0));
    float alpha = clamp(core * (0.6 + vPulse) + halo * 0.4, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;

const stationIndex = new Map(SENSOR_NETWORK.map((node, index) => [node.id, index]));

function NodeField({ pulses, surge }: { pulses: GlobePulse[]; surge: NumRef }) {
  const count = SENSOR_NETWORK.length;

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const weights = new Float32Array(count);
    const pulse = new Float32Array(count);
    const v = new THREE.Vector3();
    const c = new THREE.Color();

    SENSOR_NETWORK.forEach((node, i) => {
      latLngToVec3(node.lat, node.lng, R * 1.015, v);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
      c.set(aqiBand(node.baseline).hex);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      weights[i] = 0.6 + aqiSeverity(node.baseline) * 0.9;
      pulse[i] = 0.25 + Math.random() * 0.35;
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aWeight", new THREE.BufferAttribute(weights, 1));
    geo.setAttribute("aPulse", new THREE.BufferAttribute(pulse, 1));
    return geo;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: 0.055 },
          uScale: { value: 400 },
        },
        vertexShader: NODE_VERT,
        fragmentShader: NODE_FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const { gl } = useThree();

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // Repaint markers as fresh readings land.
  useEffect(() => {
    const colors = geometry.getAttribute("aColor") as THREE.BufferAttribute;
    const weights = geometry.getAttribute("aWeight") as THREE.BufferAttribute;
    const c = new THREE.Color();
    for (const pulse of pulses.slice(-12)) {
      const index = stationIndex.get(pulse.station);
      if (index === undefined) continue;
      c.set(aqiBand(pulse.aqi).hex);
      colors.setXYZ(index, c.r, c.g, c.b);
      weights.setX(index, 0.6 + aqiSeverity(pulse.aqi) * 0.9 + (pulse.mine ? 0.5 : 0));
    }
    colors.needsUpdate = true;
    weights.needsUpdate = true;
  }, [geometry, pulses]);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uScale.value = gl.domElement.height / 2;

    const attr = geometry.getAttribute("aPulse") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const now = Date.now();
    let touched = false;

    for (let i = 0; i < arr.length; i += 1) {
      const floor = 0.18;
      if (arr[i] > floor) {
        arr[i] = floor + (arr[i] - floor) * 0.94;
        touched = true;
      }
    }
    for (const pulse of pulses.slice(-12)) {
      const age = (now - pulse.born) / WAVE_LIFE;
      if (age < 0 || age > 1) continue;
      const index = stationIndex.get(pulse.station);
      if (index === undefined) continue;
      const value = Math.pow(1 - age, 2) * pulse.power;
      if (value > arr[index]) {
        arr[index] = value;
        touched = true;
      }
    }
    if (touched) attr.needsUpdate = true;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

function Shockwaves({ pulses }: { pulses: GlobePulse[] }) {
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const geometry = useMemo(() => new THREE.RingGeometry(0.8, 1, 72), []);
  const materials = useMemo(
    () =>
      Array.from({ length: WAVE_POOL }, () =>
        new THREE.MeshBasicMaterial({
          color: new THREE.Color("#22e39a"),
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
          depthTest: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      materials.forEach((material) => material.dispose());
    },
    [geometry, materials],
  );

  useFrame(() => {
    const now = Date.now();
    const recent = pulses
      .filter((pulse) => now - pulse.born < WAVE_LIFE)
      .slice(-WAVE_POOL)
      .reverse();
    const normal = new THREE.Vector3();
    const up = new THREE.Vector3(0, 0, 1);

    for (let slot = 0; slot < WAVE_POOL; slot += 1) {
      const mesh = rings.current[slot];
      const material = materials[slot];
      if (!mesh || !material) continue;
      const pulse = recent[slot];
      if (!pulse) {
        mesh.visible = false;
        material.opacity = 0;
        continue;
      }
      const age = Math.min(1, Math.max(0, (now - pulse.born) / WAVE_LIFE));
      mesh.visible = true;
      mesh.scale.setScalar((0.02 + age * 0.44) * (0.7 + pulse.power * 0.6));
      latLngToVec3(pulse.lat, pulse.lng, R * 1.02, normal).normalize();
      mesh.position.copy(normal);
      mesh.quaternion.setFromUnitVectors(up, normal);
      material.color.set(aqiBand(pulse.aqi).hex);
      material.opacity = Math.pow(1 - age, 2.2) * (pulse.mine ? 0.95 : 0.45);
    }
  });

  return (
    <>
      {materials.map((material, index) => (
        <mesh
          key={index}
          geometry={geometry}
          material={material}
          visible={false}
          frustumCulled={false}
          ref={(node) => {
            rings.current[index] = node;
          }}
        />
      ))}
    </>
  );
}

function Starfield() {
  const geometry = useMemo(() => {
    const count = 1100;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const radius = 7 + Math.random() * 9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color("#a8c0d8"),
        size: 0.03,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <points geometry={geometry} material={material} />;
}

type DragState = {
  yaw: number;
  pitch: number;
  velocity: number;
  velocityY: number;
  autoSpin: number;
  pointerDown: boolean;
  lastX: number;
  lastY: number;
};

function Orbit({ children, drag }: { children: React.ReactNode; drag: DragState }) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    const step = Math.min(delta, 0.05);

    if (!drag.pointerDown) {
      drag.velocity += (drag.autoSpin - drag.velocity) * 0.03;
      drag.velocityY *= 0.9;
    }
    drag.yaw += drag.velocity * step;
    drag.pitch = Math.max(-0.8, Math.min(0.8, drag.pitch + drag.velocityY * step));

    node.rotation.y += (drag.yaw - node.rotation.y) * (drag.pointerDown ? 0.45 : 0.05);
    node.rotation.x += (drag.pitch - node.rotation.x) * 0.12;
  });

  return <group ref={group}>{children}</group>;
}

export default function AtmoGlobe({
  pulses,
  surge,
  className,
}: {
  pulses: GlobePulse[];
  /** Timestamp of the last local write; 0 = none yet. */
  surge: number;
  className?: string;
}) {
  const drag = useRef<DragState>({
    yaw: 0,
    pitch: -0.1,
    velocity: 0.12,
    velocityY: 0,
    autoSpin: 0.12,
    pointerDown: false,
    lastX: 0,
    lastY: 0,
  });
  const surgeRef = useRef(0);
  const primed = useRef(false);

  useEffect(() => {
    // Skip the first run so mounting never flashes the atmosphere.
    if (!primed.current) {
      primed.current = true;
      return;
    }
    surgeRef.current = 1;
  }, [surge]);

  return (
    <div
      className={className}
      style={{ touchAction: "none", cursor: "grab" }}
      onPointerDown={(event) => {
        drag.current.pointerDown = true;
        drag.current.lastX = event.clientX;
        drag.current.lastY = event.clientY;
        drag.current.velocity = 0;
        drag.current.velocityY = 0;
      }}
      onPointerMove={(event) => {
        const state = drag.current;
        if (!state.pointerDown) return;
        const dx = event.clientX - state.lastX;
        const dy = event.clientY - state.lastY;
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        state.yaw += dx * 0.0065;
        state.pitch += dy * 0.0045;
        state.velocity = dx * 0.34;
        state.velocityY = dy * 0.18;
      }}
      onPointerUp={() => {
        drag.current.pointerDown = false;
      }}
      onPointerLeave={() => {
        drag.current.pointerDown = false;
      }}
      onPointerCancel={() => {
        drag.current.pointerDown = false;
      }}
    >
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 3.55], fov: 42, near: 0.1, far: 80 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <SurgeDecay surge={surgeRef} />
        <Starfield />
        <Orbit drag={drag.current}>
          <mesh>
            <sphereGeometry args={[0.9965, 64, 64]} />
            <meshBasicMaterial color={"#04070d"} />
          </mesh>
          <DotShell surge={surgeRef} />
          <Graticule />
          <NodeField pulses={pulses} surge={surgeRef} />
          <Shockwaves pulses={pulses} />
        </Orbit>
        <Atmosphere surge={surgeRef} />
      </Canvas>
    </div>
  );
}

function SurgeDecay({ surge }: { surge: NumRef }) {
  useFrame((_, delta) => {
    surge.current = Math.max(0, surge.current - Math.min(delta, 0.05) * 1.25);
  });
  return null;
}
