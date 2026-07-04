"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Track } from "@/lib/racing/track";

function hashSeed(s: string): number {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type PropKind = "tree" | "building" | "rock" | "lamp";

interface PropSpec {
  kind: PropKind;
  x: number;
  z: number;
  scale: number;
  rot: number;
}

// One scenery "theme" per track — original low-poly props, no real-world
// or commercial-game assets. Deterministic per track id, so scenery stays
// put across renders/laps instead of popping around.
const THEMES: Record<string, PropKind[]> = {
  chicane: ["tree", "tree", "tree", "rock"],
  oval: ["building", "lamp", "building", "lamp"],
  switchback: ["tree", "rock", "tree", "tree"],
  coastal: ["tree", "rock", "tree", "lamp"],
};

export function TrackScenery({ track }: { track: Track }) {
  const props = useMemo<PropSpec[]>(() => {
    const rng = mulberry32(hashSeed(track.id));
    const { center } = track.trackOutline();
    const palette = THEMES[track.id] ?? THEMES.chicane;
    const specs: PropSpec[] = [];
    const step = 6;
    for (let i = 0; i < center.length - 1; i += step) {
      if (rng() > 0.5) continue; // keep it sparse, not a solid wall of props
      const p = center[i];
      const t = i / (center.length - 1);
      const tangent = track.trackTangentAt(t);
      const rightDir = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
      const side = rng() < 0.5 ? -1 : 1;
      const dist = track.width / 2 + 12 + rng() * 35;
      const x = p.x + rightDir.x * dist * side;
      const z = p.z + rightDir.z * dist * side;
      const kind = palette[Math.floor(rng() * palette.length)];
      specs.push({ kind, x, z, scale: 0.8 + rng() * 0.7, rot: rng() * Math.PI * 2 });
    }
    return specs;
  }, [track]);

  return (
    <group>
      {props.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]} scale={p.scale}>
          {p.kind === "tree" && <Tree />}
          {p.kind === "building" && <Building />}
          {p.kind === "rock" && <Rock />}
          {p.kind === "lamp" && <Lamp />}
        </group>
      ))}
    </group>
  );
}

function Tree() {
  return (
    <group>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.22, 2, 6]} />
        <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.7, 0]} castShadow>
        <coneGeometry args={[1.1, 2.2, 7]} />
        <meshStandardMaterial color="#3f7a3f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 3.6, 0]} castShadow>
        <coneGeometry args={[0.8, 1.6, 7]} />
        <meshStandardMaterial color="#4a8c4a" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Building() {
  return (
    <group>
      <mesh position={[0, 2, 0]} castShadow>
        <boxGeometry args={[3.2, 4, 3.2]} />
        <meshStandardMaterial color="#8a8f9a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 4.15, 0]}>
        <boxGeometry args={[3.4, 0.3, 3.4]} />
        <meshStandardMaterial color="#5a5f6a" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Rock() {
  return (
    <mesh position={[0, 0.45, 0]} castShadow>
      <dodecahedronGeometry args={[0.65, 0]} />
      <meshStandardMaterial color="#787878" roughness={1} flatShading />
    </mesh>
  );
}

function Lamp() {
  return (
    <group>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 3, 6]} />
        <meshStandardMaterial color="#333" roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.05, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#fff3c4" emissive="#fff3c4" emissiveIntensity={1} />
      </mesh>
    </group>
  );
}
