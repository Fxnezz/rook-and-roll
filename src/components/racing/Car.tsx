"use client";

import { forwardRef } from "react";
import * as THREE from "three";

/** Original low-poly arcade car — not modeled on any real or licensed vehicle. */
export const Car = forwardRef<THREE.Group, { color?: string }>(function Car({ color = "#e9a23b" }, ref) {
  return (
    <group ref={ref}>
      {/* body */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[1.6, 0.5, 3.2]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
      </mesh>
      {/* cabin */}
      <mesh position={[0, 0.78, -0.2]} castShadow>
        <boxGeometry args={[1.2, 0.4, 1.4]} />
        <meshStandardMaterial color="#1a1d24" roughness={0.3} />
      </mesh>
      {/* nose taper */}
      <mesh position={[0, 0.4, 1.7]} castShadow>
        <boxGeometry args={[1.3, 0.4, 0.5]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
      </mesh>
      {/* wheels */}
      {[
        [-0.85, 0.32, 1.1],
        [0.85, 0.32, 1.1],
        [-0.85, 0.32, -1.1],
        [0.85, 0.32, -1.1],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.32, 0.32, 0.28, 12]} />
          <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>
      ))}
      {/* headlight glow accents */}
      <mesh position={[-0.5, 0.45, 1.95]}>
        <boxGeometry args={[0.25, 0.12, 0.05]} />
        <meshStandardMaterial color="#fff3c4" emissive="#fff3c4" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0.5, 0.45, 1.95]}>
        <boxGeometry args={[0.25, 0.12, 0.05]} />
        <meshStandardMaterial color="#fff3c4" emissive="#fff3c4" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
});
