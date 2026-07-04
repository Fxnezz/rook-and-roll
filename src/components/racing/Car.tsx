"use client";

import { forwardRef } from "react";
import * as THREE from "three";
import type { CarVariant } from "@/lib/racing/cars";

/** Original low-poly arcade car — not modeled on any real or licensed vehicle. */
export const Car = forwardRef<
  THREE.Group,
  { color?: string; ghost?: boolean; scale?: number; variant?: CarVariant }
>(function Car({ color = "#e9a23b", ghost = false, scale = 1, variant = "sedan" }, ref) {
  const opacity = ghost ? 0.35 : 1;
  const cabinH = variant === "truck" ? 0.6 : variant === "sport" ? 0.32 : 0.4;
  const cabinY = variant === "truck" ? 0.95 : variant === "sport" ? 0.72 : 0.78;
  const bodyH = variant === "truck" ? 0.65 : 0.5;
  const bodyY = variant === "truck" ? 0.5 : 0.42;

  return (
    <group ref={ref}>
      <group scale={scale}>
        {/* body — glossy metallic paint */}
        <mesh position={[0, bodyY, 0]} castShadow>
          <boxGeometry args={[1.6, bodyH, 3.2]} />
          <meshStandardMaterial color={color} roughness={0.25} metalness={0.55} transparent={ghost} opacity={opacity} />
        </mesh>
        {/* cabin / windshield tint */}
        <mesh position={[0, cabinY, -0.2]} castShadow>
          <boxGeometry args={[1.2, cabinH, 1.4]} />
          <meshStandardMaterial color="#1a1d24" roughness={0.15} metalness={0.3} transparent={ghost} opacity={opacity} />
        </mesh>
        {/* nose taper */}
        <mesh position={[0, 0.4, 1.7]} castShadow>
          <boxGeometry args={[1.3, 0.4, 0.5]} />
          <meshStandardMaterial color={color} roughness={0.25} metalness={0.55} transparent={ghost} opacity={opacity} />
        </mesh>
        {/* rear spoiler (skip on the truck — it doesn't fit the look) */}
        {variant !== "truck" && (
          <group position={[0, 0.78, -1.55]}>
            <mesh position={[-0.6, 0.18, 0]} castShadow>
              <boxGeometry args={[0.08, 0.35, 0.08]} />
              <meshStandardMaterial color="#1a1d24" roughness={0.5} transparent={ghost} opacity={opacity} />
            </mesh>
            <mesh position={[0.6, 0.18, 0]} castShadow>
              <boxGeometry args={[0.08, 0.35, 0.08]} />
              <meshStandardMaterial color="#1a1d24" roughness={0.5} transparent={ghost} opacity={opacity} />
            </mesh>
            <mesh position={[0, 0.36, 0]} castShadow>
              <boxGeometry args={[1.5, 0.08, 0.35]} />
              <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} transparent={ghost} opacity={opacity} />
            </mesh>
          </group>
        )}
        {/* side mirrors */}
        <mesh position={[-0.85, 0.72, 0.75]} castShadow>
          <boxGeometry args={[0.12, 0.1, 0.16]} />
          <meshStandardMaterial color="#1a1d24" roughness={0.4} transparent={ghost} opacity={opacity} />
        </mesh>
        <mesh position={[0.85, 0.72, 0.75]} castShadow>
          <boxGeometry args={[0.12, 0.1, 0.16]} />
          <meshStandardMaterial color="#1a1d24" roughness={0.4} transparent={ghost} opacity={opacity} />
        </mesh>
        {/* wheels with lighter rims — bigger + chunkier on the truck */}
        {[
          [-0.85, 0.32, 1.1],
          [0.85, 0.32, 1.1],
          [-0.85, 0.32, -1.1],
          [0.85, 0.32, -1.1],
        ].map((p, i) => {
          const r = variant === "truck" ? 0.42 : 0.32;
          return (
            <group key={i} position={p as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
              <mesh castShadow>
                <cylinderGeometry args={[r, r, 0.3, 12]} />
                <meshStandardMaterial color="#111" roughness={0.9} transparent={ghost} opacity={opacity} />
              </mesh>
              <mesh position={[0, 0, 0.16]}>
                <cylinderGeometry args={[r * 0.5, r * 0.5, 0.02, 10]} />
                <meshStandardMaterial color="#c7ccd6" roughness={0.3} metalness={0.7} transparent={ghost} opacity={opacity} />
              </mesh>
              <mesh position={[0, 0, -0.16]}>
                <cylinderGeometry args={[r * 0.5, r * 0.5, 0.02, 10]} />
                <meshStandardMaterial color="#c7ccd6" roughness={0.3} metalness={0.7} transparent={ghost} opacity={opacity} />
              </mesh>
            </group>
          );
        })}
        {/* headlights */}
        <mesh position={[-0.5, 0.45, 1.95]}>
          <boxGeometry args={[0.25, 0.12, 0.05]} />
          <meshStandardMaterial color="#fff3c4" emissive="#fff3c4" emissiveIntensity={1.2} transparent={ghost} opacity={opacity} />
        </mesh>
        <mesh position={[0.5, 0.45, 1.95]}>
          <boxGeometry args={[0.25, 0.12, 0.05]} />
          <meshStandardMaterial color="#fff3c4" emissive="#fff3c4" emissiveIntensity={1.2} transparent={ghost} opacity={opacity} />
        </mesh>
        {/* taillights */}
        <mesh position={[-0.55, 0.45, -1.58]}>
          <boxGeometry args={[0.22, 0.12, 0.05]} />
          <meshStandardMaterial color="#e5342a" emissive="#e5342a" emissiveIntensity={1} transparent={ghost} opacity={opacity} />
        </mesh>
        <mesh position={[0.55, 0.45, -1.58]}>
          <boxGeometry args={[0.22, 0.12, 0.05]} />
          <meshStandardMaterial color="#e5342a" emissive="#e5342a" emissiveIntensity={1} transparent={ghost} opacity={opacity} />
        </mesh>
      </group>
    </group>
  );
});
